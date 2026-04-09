<script lang="ts">
  import AlmanacModeScene from '@component/AlmanacModeScene.svelte';
  import AlmanacPageFrame from '@component/AlmanacPageFrame.svelte';
  import TextModeScene from '@component/TextModeScene.svelte';
  import { onMount, untrack } from 'svelte';
  import { invoke } from '@tauri-apps/api/core';
  import type { AlmanacFieldKey, LibraryCategory, LibrarySide } from '@util/almanacTypes';
  import { stringifyCsv, parseCsv } from '@util/csvText';
  import { rebuildKeyIndex, normalizeRowsByKey, getColumnIndex, getKeyColumnIndex } from '@util/csvTable';
  import { toCsvStoredValue } from '@util/csvStoredValue';
  import {
    collectEntryFieldsByBase,
    computeAddEntryInsertIndex,
    computeEntryOptions,
    computeEntryBaseInsertIndex,
    findLastRowIndexByEntryBase,
    getCsvValueByKey,
    getEditorValueByKey,
    getEntryBaseFromKey,
    getEntryBaseFromSelection,
    isBlankCsvRow,
    insertNewEntryRows as buildNewEntryRows,
    keyForField,
    makeBlankRow,
    normalizePrefix,
  } from '@util/almanacEntry';

  let category: LibraryCategory = $state('plant');
  let previewSide: LibrarySide = $state('plant');
  let theme: 'default' | 'zombie' = $state('default');
  let lang: 'zh' | 'en' | 'es' = $state('zh');
  let csvPath: string | null = $state(null);
  let csvText: string = $state('');
  let csvHeaders: string[] = $state([]);
  let csvRows: string[][] = $state([]);
  let keyToRow: Map<string, number> = $state(new Map());

  let viewMode: 'almanac' | 'text' = $state('almanac');
  let textModeScrollPosition: import('@component/TextModeScene.svelte').TextScrollPosition | null = $state(null);
  let previewSettingsOpen = $state(false);

  function syncCsvTextFromTable() {
    if (!csvHeaders.length) return;
    csvText = stringifyCsv(csvHeaders, csvRows);
  }

  function applyCsvText(next: string) {
    csvText = next;
    if (csvPath) isDirty = true;
    try {
      const parsed = parseCsv(next);
      csvHeaders = parsed.headers;
      csvRows = normalizeRowsByKey(parsed.headers, parsed.rows);
      keyToRow = rebuildKeyIndex(csvHeaders, csvRows);
    } catch {
    }
  }

  let entryId = $state('');
  let entryPrefix = $state('');
  let entryOptions: { id: string; label: string; prefix: string }[] = $state([]);

  let cardMode: 'role' | 'skin' = $state('role');
  let skinIndex = $state(0);
  let skinNums: number[] = $state([]);

  const ALL_FIELD_KEYS: AlmanacFieldKey[] = [
    'NAME',
    'EXPRESTION',
    'HANDBOOK_EXPRESTION',
    'HANDBOOK_STORY',
    'ACCESS',
    'STORY',
  ];

  const ROLE_FIELD_KEYS: AlmanacFieldKey[] = ['NAME', 'EXPRESTION', 'HANDBOOK_EXPRESTION', 'HANDBOOK_STORY'];
  const SKIN_FIELD_KEYS: AlmanacFieldKey[] = ['NAME', 'ACCESS', 'STORY'];

  let roleFields: Record<AlmanacFieldKey, string> = $state({
    NAME: '',
    EXPRESTION: '',
    HANDBOOK_EXPRESTION: '',
    HANDBOOK_STORY: '',
    ACCESS: '',
    STORY: '',
  });

  let skinFields: Record<AlmanacFieldKey, string> = $state({
    NAME: '',
    EXPRESTION: '',
    HANDBOOK_EXPRESTION: '',
    HANDBOOK_STORY: '',
    ACCESS: '',
    STORY: '',
  });

  const FILTERS: Record<
    LibraryCategory,
    { label: string; prefixes: string[]; theme: 'default' | 'zombie'; previewSide: LibrarySide }
  > = {
    plant: { label: '植物', prefixes: ['TOWERDEFENSE_PLANT'], theme: 'default', previewSide: 'plant' },
    zombie: { label: '僵尸', prefixes: ['TOWERDEFENSE_ZOMBIE'], theme: 'zombie', previewSide: 'zombie' },
    shovel: { label: '铲子', prefixes: ['TOWERDEFENSE_SHOVEL'], theme: 'default', previewSide: 'plant' },
    mower: { label: '小推车', prefixes: ['TOWERDEFENSE_MOWER'], theme: 'default', previewSide: 'plant' },
  };
  let selectionByCategory: Record<LibraryCategory, { id: string; prefix: string }> = $state({
    plant: { id: '', prefix: '' },
    zombie: { id: '', prefix: '' },
    shovel: { id: '', prefix: '' },
    mower: { id: '', prefix: '' },
  });
  let isDirty = $state(false);
  let closeConfirmOpen = $state(false);
  let allowWindowClose = $state(false);

  let addDialogOpen = $state(false);
  let addDialogId = $state('');
  let addDialogPrefix = $state('');

  function changeCategory(next: LibraryCategory) {
    if (next === category) return;
    if (entryId && entryPrefix) {
      selectionByCategory = { ...selectionByCategory, [category]: { id: entryId, prefix: entryPrefix } };
    }
    if (cardMode !== 'role') cardMode = 'role';
    category = next;
  }

  function getCategoryDefaultPrefix(next: LibraryCategory) {
    const prefixes = getActivePrefixes(next);
    return prefixes[0] ?? '';
  }

  onMount(() => {
    let unlisten: null | (() => void) = null;

    const onContextMenu = (e: MouseEvent) => {
      try {
        e.preventDefault();
      } catch {
      }
    };

    const onKeyDownCapture = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key !== 'f' && key !== 'r') return;

      const isMac = navigator.platform.toLowerCase().includes('mac');
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;
      if (!cmdOrCtrl) return;
      if (e.altKey) return;

      try {
        e.preventDefault();
      } catch {
      }

      try {
        e.stopPropagation();
      } catch {
      }

      if (csvPath !== null && viewMode === 'text') {
        try {
          window.dispatchEvent(
            new CustomEvent('pvzhe-text-shortcut', { detail: { action: key === 'f' ? 'find' : 'replace' } })
          );
        } catch {
        }
      }
    };

    document.addEventListener('contextmenu', onContextMenu);
    window.addEventListener('keydown', onKeyDownCapture, true);

    const init = async () => {
      try {
        const mod: any = await import('@tauri-apps/api/window');
        const win = mod.getCurrentWindow?.();
        if (!win?.onCloseRequested) return;

        unlisten = await win.onCloseRequested((e: any) => {
          if (allowWindowClose) return;
          if (!isDirty) return;
          try {
            e?.preventDefault?.();
          } catch {
          }
          closeConfirmOpen = true;
        });
      } catch {
      }
    };

    void init();
    return () => {
      try {
        unlisten?.();
      } catch {
      }
      try {
        document.removeEventListener('contextmenu', onContextMenu);
      } catch {
      }
      try {
        window.removeEventListener('keydown', onKeyDownCapture, true);
      } catch {
      }
    };
  });

  function getActivePrefixes(nextCategory: LibraryCategory) {
    return FILTERS[nextCategory].prefixes.map(normalizePrefix);
  }

  function getCsvValue(key: string, column: string) {
    return getCsvValueByKey({ key, column, headers: csvHeaders, rows: csvRows, keyToRow });
  }

  function getEditorValue(key: string, column: string) {
    return getEditorValueByKey({ key, column, headers: csvHeaders, rows: csvRows, keyToRow });
  }

  function getKnownCategoryPrefixForKey(key: string) {
    for (const { prefixes } of Object.values(FILTERS)) {
      for (const p of prefixes) {
        const normalized = normalizePrefix(p);
        if (key.startsWith(normalized)) return normalized;
      }
    }
    return null;
  }

  function writeValue(key: string, value: string) {
    const keyIdx = getKeyColumnIndex(csvHeaders);
    const colIdx = getColumnIndex(csvHeaders, lang);
    if (keyIdx === -1 || colIdx === -1) return;

    const existing = keyToRow.get(key);
    if (existing !== undefined) {
      const row = csvRows[existing];
      const nextRow = row.slice();
      nextRow[colIdx] = value;
      csvRows = csvRows.map((r, i) => (i === existing ? nextRow : r));
      syncCsvTextFromTable();
      return;
    }

    const nextRow = Array(csvHeaders.length).fill('');
    nextRow[keyIdx] = key;
    nextRow[colIdx] = value;

    const entryBase = getEntryBaseFromKey(key, ALL_FIELD_KEYS);
    if (entryBase) {
      const basesToTry = [entryBase];
      const parentBase = entryBase.replace(/CUSTOM_\d+_$/, '');
      if (parentBase !== entryBase) basesToTry.push(parentBase);

      for (const base of basesToTry) {
        const lastBaseRow = findLastRowIndexByEntryBase({ headers: csvHeaders, rows: csvRows, entryBase: base });
        if (lastBaseRow === -1) continue;
        const insertIndex = computeEntryBaseInsertIndex({
          headers: csvHeaders,
          rows: csvRows,
          entryBase: base,
          lastRowIndex: lastBaseRow,
        });
        csvRows = [...csvRows.slice(0, insertIndex), nextRow, ...csvRows.slice(insertIndex)];
        keyToRow = rebuildKeyIndex(csvHeaders, csvRows);
        syncCsvTextFromTable();
        return;
      }
    }

    const categoryPrefix = getKnownCategoryPrefixForKey(key);
    if (categoryPrefix) {
      const insertIndex = computeAddEntryInsertIndex({
        headers: csvHeaders,
        rows: csvRows,
        prefix: categoryPrefix,
        fieldKeys: ALL_FIELD_KEYS,
      });
      const toInsert: string[][] = [];
      if (insertIndex > 0 && !isBlankCsvRow(csvRows[insertIndex - 1])) {
        toInsert.push(makeBlankRow(csvHeaders.length));
      }
      toInsert.push(nextRow);
      if (insertIndex >= csvRows.length || !isBlankCsvRow(csvRows[insertIndex])) {
        toInsert.push(makeBlankRow(csvHeaders.length));
      }
      csvRows = [...csvRows.slice(0, insertIndex), ...toInsert, ...csvRows.slice(insertIndex)];
      keyToRow = rebuildKeyIndex(csvHeaders, csvRows);
      syncCsvTextFromTable();
      return;
    }

    csvRows = [...csvRows, nextRow];
    keyToRow = rebuildKeyIndex(csvHeaders, csvRows);
    syncCsvTextFromTable();
  }
  function keyExists(key: string) {
    return keyToRow.has(key);
  }

  function logEntryData(id: string, prefix: string) {
    if (!id || !prefix) return;
    if (!csvHeaders.length) return;
    const entryBase = getEntryBaseFromSelection(id, prefix);
    const entryFields = collectEntryFieldsByBase({
      entryBase,
      lang,
      headers: csvHeaders,
      rows: csvRows,
      keyToRow,
    });
    const roleFields: Record<string, string> = {};
    for (const field of ROLE_FIELD_KEYS) {
      roleFields[field] = entryFields[`${entryBase}${field}`] ?? '';
    }

    const skinsByNum = new Map<number, Record<string, string>>();
    for (const [key, value] of Object.entries(entryFields)) {
      if (!key.startsWith(entryBase)) continue;
      const rest = key.slice(entryBase.length);
      const m = /^CUSTOM_(\d+)_(.+)$/.exec(rest);
      if (!m) continue;
      const idx = Number.parseInt(m[1] ?? '', 10);
      if (!Number.isFinite(idx)) continue;
      const field = m[2] ?? '';
      const next = skinsByNum.get(idx) ?? {};
      next[field] = value;
      skinsByNum.set(idx, next);
    }

    const skins = Array.from(skinsByNum.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([index, fields]) => ({ index, entryBase: `${entryBase}CUSTOM_${index}_`, fields }));

    console.log('[pvzHE] Almanac entry selected (role)', {
      category,
      lang,
      id,
      prefix,
      entryBase,
      fields: roleFields,
    });
    console.log('[pvzHE] Almanac entry selected (skins)', {
      category,
      lang,
      id,
      prefix,
      entryBase,
      skins,
    });
  }

  function rebuildSkinNums() {
    const prevNumsLen = untrack(() => skinNums.length);
    const prevIndex = untrack(() => skinIndex);
    if (!entryId || !entryPrefix) {
      if (prevNumsLen) skinNums = [];
      if (prevIndex !== 0) skinIndex = 0;
      return;
    }

    const entryBase = getEntryBaseFromSelection(entryId, entryPrefix);
    const nums = new Set<number>();
    for (const key of keyToRow.keys()) {
      if (!key.startsWith(entryBase)) continue;
      const rest = key.slice(entryBase.length);
      const m = /^CUSTOM_(\d+)_(NAME|ACCESS|STORY)$/.exec(rest);
      if (!m) continue;
      const idx = Number.parseInt(m[1] ?? '', 10);
      if (!Number.isFinite(idx)) continue;
      nums.add(idx);
    }
    const next = Array.from(nums).sort((a, b) => a - b);
    skinNums = next;
    if (next.length === 0) {
      skinIndex = 0;
      return;
    }
    skinIndex = Math.max(0, Math.min(prevIndex, next.length - 1));
  }

  function rebuildOptions() {
    const prefixes = getActivePrefixes(category);
    const options = computeEntryOptions({ prefixes, fieldKeys: ROLE_FIELD_KEYS, lang, headers: csvHeaders, rows: csvRows, keyToRow });

    entryOptions = options;

    const isValid = (id: string, prefix: string) => options.some((o) => o.id === id && o.prefix === prefix);
    const cached = selectionByCategory[category];

    if (entryId && entryPrefix && isValid(entryId, entryPrefix)) {
    } else if (cached.id && cached.prefix && isValid(cached.id, cached.prefix)) {
      entryId = cached.id;
      entryPrefix = cached.prefix;
    } else if (options.length) {
      entryId = options[0].id;
      entryPrefix = options[0].prefix;
    } else {
      entryId = '';
      entryPrefix = '';
    }
  }

  function syncRoleFieldsFromCsv() {
    if (!entryId || !entryPrefix) {
      return;
    }

    const next: Record<AlmanacFieldKey, string> = {
      NAME: '',
      EXPRESTION: '',
      HANDBOOK_EXPRESTION: '',
      HANDBOOK_STORY: '',
      ACCESS: '',
      STORY: '',
    };
    for (const field of ROLE_FIELD_KEYS) next[field] = getEditorValue(keyForField(entryId, field, entryPrefix), lang);
    const prev = untrack(() => ({
      NAME: roleFields.NAME,
      EXPRESTION: roleFields.EXPRESTION,
      HANDBOOK_EXPRESTION: roleFields.HANDBOOK_EXPRESTION,
      HANDBOOK_STORY: roleFields.HANDBOOK_STORY,
    }));
    if (
      prev.NAME === next.NAME &&
      prev.EXPRESTION === next.EXPRESTION &&
      prev.HANDBOOK_EXPRESTION === next.HANDBOOK_EXPRESTION &&
      prev.HANDBOOK_STORY === next.HANDBOOK_STORY
    )
      return;
    roleFields = next;
  }

  function getActiveSkinNum() {
    return untrack(() => skinNums[skinIndex] ?? 0);
  }

  function syncSkinFieldsFromCsv() {
    if (!entryId || !entryPrefix) return;

    const skinNum = getActiveSkinNum();
    const skinId = `${entryId}_CUSTOM_${skinNum}`;

    const next: Record<AlmanacFieldKey, string> = {
      NAME: '',
      EXPRESTION: '',
      HANDBOOK_EXPRESTION: '',
      HANDBOOK_STORY: '',
      ACCESS: '',
      STORY: '',
    };

    for (const field of SKIN_FIELD_KEYS) next[field] = getEditorValue(keyForField(skinId, field, entryPrefix), lang);

    const prev = untrack(() => ({
      NAME: skinFields.NAME,
      ACCESS: skinFields.ACCESS,
      STORY: skinFields.STORY,
    }));
    if (prev.NAME === next.NAME && prev.ACCESS === next.ACCESS && prev.STORY === next.STORY) return;
    skinFields = next;
  }

  function getPreviewFields(): Partial<Record<AlmanacFieldKey, string>> | undefined {
    if (cardMode === 'role') {
      const out: Record<AlmanacFieldKey, string> = { ...roleFields };
      if (!entryId || !entryPrefix) return out;
      for (const field of ROLE_FIELD_KEYS) {
        if (out[field].trim().length) continue;
        const key = keyForField(entryId, field, entryPrefix);
        out[field] = getCsvValue(key, lang);
      }
      return out;
    }

    const out: Record<AlmanacFieldKey, string> = { ...skinFields };
    if (!entryId || !entryPrefix) return out;
    if (skinNums.length === 0) {
      if (out.NAME.trim().length || out.ACCESS.trim().length || out.STORY.trim().length) return out;
      return undefined;
    }

    const skinNum = getActiveSkinNum();
    const skinId = `${entryId}_CUSTOM_${skinNum}`;

    for (const field of SKIN_FIELD_KEYS) {
      if (out[field].trim().length) continue;
      const key = keyForField(skinId, field, entryPrefix);
      out[field] = getCsvValue(key, lang);
    }
    return out;
  }

  function getRoleNameForSkinPreview() {
    const local = roleFields.NAME ?? '';
    if (local.trim().length) return local;
    if (!entryId || !entryPrefix) return local;
    return getCsvValue(keyForField(entryId, 'NAME', entryPrefix), lang);
  }

  function addSkin() {
    if (!csvHeaders.length) return;
    if (!entryId || !entryPrefix) return;
    if (csvPath) isDirty = true;

    let nextNum = 1;
    if (skinNums.length) nextNum = Math.max(...skinNums) + 1;

    while (true) {
      const skinId = `${entryId}_CUSTOM_${nextNum}`;
      const exists = SKIN_FIELD_KEYS.some((field) => keyExists(keyForField(skinId, field, entryPrefix)));
      if (!exists) break;
      nextNum += 1;
    }

    const skinId = `${entryId}_CUSTOM_${nextNum}`;
    for (const field of SKIN_FIELD_KEYS) {
      writeValue(keyForField(skinId, field, entryPrefix), toCsvStoredValue(''));
    }

    const nextSkinNums = Array.from(new Set([...skinNums, nextNum])).sort((a, b) => a - b);
    skinNums = nextSkinNums;
    skinIndex = Math.max(0, nextSkinNums.indexOf(nextNum));

    skinFields = {
      NAME: '',
      EXPRESTION: '',
      HANDBOOK_EXPRESTION: '',
      HANDBOOK_STORY: '',
      ACCESS: '',
      STORY: '',
    };
    syncSkinFieldsFromCsv();
  }

  function openAddDialog() {
    addDialogId = '';
    const prefixes = getActivePrefixes(category);
    addDialogPrefix = entryPrefix && prefixes.includes(entryPrefix) ? entryPrefix : prefixes[0] ?? '';
    addDialogOpen = true;
  }

  function closeAddDialog() {
    addDialogOpen = false;
  }

  function getAddDialogIdPlaceholder(nextCategory: LibraryCategory) {
    if (nextCategory === 'zombie') return '例如 NORMAL';
    if (nextCategory === 'shovel') return '例如 DEFAULT';
    if (nextCategory === 'mower') return '例如 DEFAULT';
    return '例如 PEASHOOTER';
  }

  function getAddDialogKeys() {
    const id = addDialogId.trim();
    const prefix = addDialogPrefix || getCategoryDefaultPrefix(category);
    if (!id || !prefix) {
      return {
        NAME: { key: '', exists: false },
        EXPRESTION: { key: '', exists: false },
        HANDBOOK_EXPRESTION: { key: '', exists: false },
        HANDBOOK_STORY: { key: '', exists: false },
      };
    }
    const keys = {
      NAME: keyForField(id, 'NAME', prefix),
      EXPRESTION: keyForField(id, 'EXPRESTION', prefix),
      HANDBOOK_EXPRESTION: keyForField(id, 'HANDBOOK_EXPRESTION', prefix),
      HANDBOOK_STORY: keyForField(id, 'HANDBOOK_STORY', prefix),
    };
    return {
      NAME: { key: keys.NAME, exists: keyExists(keys.NAME) },
      EXPRESTION: { key: keys.EXPRESTION, exists: keyExists(keys.EXPRESTION) },
      HANDBOOK_EXPRESTION: { key: keys.HANDBOOK_EXPRESTION, exists: keyExists(keys.HANDBOOK_EXPRESTION) },
      HANDBOOK_STORY: { key: keys.HANDBOOK_STORY, exists: keyExists(keys.HANDBOOK_STORY) },
    };
  }

  function applyInsertNewEntryRows(id: string, prefix: string) {
    const nextRows = buildNewEntryRows({ id, prefix, lang, headers: csvHeaders, rows: csvRows, fieldKeys: ROLE_FIELD_KEYS });
    if (nextRows === csvRows) return;
    csvRows = nextRows;
    keyToRow = rebuildKeyIndex(csvHeaders, csvRows);
    syncCsvTextFromTable();
  }

  function canAddEntry() {
    if (!csvHeaders.length) return false;
    const id = addDialogId.trim();
    const prefix = addDialogPrefix || getCategoryDefaultPrefix(category);
    if (!id || !prefix) return false;
    const keys = getAddDialogKeys();
    if (keys.NAME.exists || keys.EXPRESTION.exists || keys.HANDBOOK_EXPRESTION.exists || keys.HANDBOOK_STORY.exists)
      return false;
    return true;
  }

  function applyAddEntry() {
    if (!canAddEntry()) return;
    const id = addDialogId.trim();
    const prefix = addDialogPrefix || getCategoryDefaultPrefix(category);
    applyInsertNewEntryRows(id, prefix);
    isDirty = true;
    rebuildOptions();
    entryId = id;
    entryPrefix = prefix;
    selectionByCategory = { ...selectionByCategory, [category]: { id, prefix } };
    syncRoleFieldsFromCsv();
    rebuildSkinNums();
    syncSkinFieldsFromCsv();
    addDialogOpen = false;
  }

  $effect(() => {
    category;
    lang;
    csvHeaders;
    csvRows;
    keyToRow;
    rebuildOptions();
  });

  $effect(() => {
    entryId;
    entryPrefix;
    category;
    lang;
    csvHeaders;
    csvRows;
    keyToRow;
    syncRoleFieldsFromCsv();
    rebuildSkinNums();
    syncSkinFieldsFromCsv();
  });

  $effect(() => {
    category;
    previewSide = FILTERS[category].previewSide;
    theme = FILTERS[category].theme;
  });

  $effect(() => {
    theme;
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    if (theme === 'zombie') {
      root.style.setProperty('--bg-color', '#b9aed8');
      root.style.setProperty('--dark-bg-color', '#5f6181');
      return;
    }
    root.style.setProperty('--bg-color', '#f9c68b');
    root.style.setProperty('--dark-bg-color', '#8f431b');
  });

  async function openCsv() {
    const result = await invoke<{ path: string; content: string } | null>('open_csv_file');
    if (!result) return;

    csvText = result.content;
    textModeScrollPosition = null;
    const parsed = parseCsv(result.content);
    csvHeaders = parsed.headers;
    csvRows = normalizeRowsByKey(parsed.headers, parsed.rows);
    keyToRow = rebuildKeyIndex(csvHeaders, csvRows);
    csvPath = result.path;
    isDirty = false;

    if (keyToRow.size) {
      const categories: LibraryCategory[] = ['plant', 'zombie', 'shovel', 'mower'];
      let best = category;
      let bestCount = computeEntryOptions({
        prefixes: getActivePrefixes(category),
        fieldKeys: ROLE_FIELD_KEYS,
        lang,
        headers: csvHeaders,
        rows: csvRows,
        keyToRow,
      }).length;
      for (const c of categories) {
        const count = computeEntryOptions({
          prefixes: getActivePrefixes(c),
          fieldKeys: ROLE_FIELD_KEYS,
          lang,
          headers: csvHeaders,
          rows: csvRows,
          keyToRow,
        }).length;
        if (count > bestCount) {
          best = c;
          bestCount = count;
        }
      }
      category = best;
    }

    rebuildOptions();

    // Force select first option if available and not selected
    if ((!entryId || !entryPrefix) && entryOptions.length > 0) {
      entryId = entryOptions[0].id;
      entryPrefix = entryOptions[0].prefix;
    }

    syncRoleFieldsFromCsv();
    rebuildSkinNums();
    syncSkinFieldsFromCsv();
  }

  async function saveCsv() {
    if (!csvText.length) return false;
    let content = csvText;
    if (viewMode === 'almanac' && csvHeaders.length) {
      const normalized = normalizeRowsByKey(csvHeaders, csvRows);
      if (normalized.length !== csvRows.length) {
        csvRows = normalized;
        keyToRow = rebuildKeyIndex(csvHeaders, csvRows);
      }
      content = stringifyCsv(csvHeaders, normalized);
      csvText = content;
    }

    if (csvPath) {
      await invoke<void>('save_csv_file', { path: csvPath, content });
      isDirty = false;
      return true;
    }

    const nextPath = await invoke<string | null>('save_csv_file_as', { content });
    if (!nextPath) return false;
    csvPath = nextPath;
    isDirty = false;
    return true;
  }

  async function saveCsvAs() {
    if (!csvText.length) return false;
    let content = csvText;
    if (viewMode === 'almanac' && csvHeaders.length) {
      const normalized = normalizeRowsByKey(csvHeaders, csvRows);
      if (normalized.length !== csvRows.length) {
        csvRows = normalized;
        keyToRow = rebuildKeyIndex(csvHeaders, csvRows);
      }
      content = stringifyCsv(csvHeaders, normalized);
      csvText = content;
    }
    const nextPath = await invoke<string | null>('save_csv_file_as', { content });
    if (!nextPath) return false;
    csvPath = nextPath;
    isDirty = false;
    return true;
  }

  function setField(field: AlmanacFieldKey, value: string) {
    if (cardMode === 'role') {
      roleFields = { ...roleFields, [field]: value };
      if (!entryId || !entryPrefix) return;
      if (csvPath) isDirty = true;
      writeValue(keyForField(entryId, field, entryPrefix), toCsvStoredValue(value));
      return;
    }

    skinFields = { ...skinFields, [field]: value };
    if (!entryId || !entryPrefix) return;
    if (csvPath) isDirty = true;
    const skinNum = getActiveSkinNum();
    const skinId = `${entryId}_CUSTOM_${skinNum}`;
    writeValue(keyForField(skinId, field, entryPrefix), toCsvStoredValue(value));
  }

  async function confirmCloseSave() {
    const saved = await saveCsv();
    if (!saved) return;
    closeConfirmOpen = false;
    allowWindowClose = true;
    try {
      const mod: any = await import('@tauri-apps/api/window');
      await mod.getCurrentWindow?.()?.close?.();
    } catch {
    }
  }

  async function confirmCloseDiscard() {
    closeConfirmOpen = false;
    allowWindowClose = true;
    try {
      const mod: any = await import('@tauri-apps/api/window');
      await mod.getCurrentWindow?.()?.close?.();
    } catch {
    }
  }

  function confirmCloseCancel() {
    closeConfirmOpen = false;
  }

  function setViewMode(next: 'almanac' | 'text') {
    if (next === viewMode) return;
    viewMode = next;
    if (next !== 'almanac') previewSettingsOpen = false;
    if (next !== 'almanac') return;
    rebuildOptions();
    syncRoleFieldsFromCsv();
    rebuildSkinNums();
    syncSkinFieldsFromCsv();
  }

  function openPreviewSettings() {
    if (viewMode !== 'almanac') return;
    previewSettingsOpen = true;
  }

  function closePreviewSettings() {
    previewSettingsOpen = false;
  }

</script>

<AlmanacPageFrame
  theme={theme}
  {category}
  {csvPath}
  {viewMode}
  onOpenPreviewSettings={openPreviewSettings}
  closeConfirmOpen={closeConfirmOpen}
  hasCsv={csvPath !== null}
  canSave={csvPath !== null && isDirty}
  canSaveAs={csvPath !== null}
  onOpenCsv={openCsv}
  onSaveCsv={saveCsv}
  onSaveCsvAs={saveCsvAs}
  onSetViewMode={setViewMode}
  onConfirmCloseSave={confirmCloseSave}
  onConfirmCloseDiscard={confirmCloseDiscard}
  onConfirmCloseCancel={confirmCloseCancel}
>
  <div class="main">
    <div class="scene scene-almanac {viewMode === 'almanac' ? 'active' : 'inactive'}">
      <AlmanacModeScene
        {category}
        {lang}
        entryOptions={entryOptions}
        entryId={entryId}
        entryPrefix={entryPrefix}
        addDisabled={!csvHeaders.length}
        allowSwitch={category === 'plant'}
        roleName={getRoleNameForSkinPreview()}
        {previewSide}
        previewFields={getPreviewFields()}
        fields={cardMode === 'role' ? roleFields : skinFields}
        {cardMode}
        skinIndex={skinIndex}
        skinCount={skinNums.length}
        previewSettingsOpen={previewSettingsOpen}
        onClosePreviewSettings={closePreviewSettings}
        onCardModeChange={(next) => {
          cardMode = next;
          if (next === 'skin') {
            rebuildSkinNums();
            syncSkinFieldsFromCsv();
          }
        }}
        onSkinIndexChange={(next) => {
          skinIndex = Math.max(0, Math.min(next, Math.max(0, skinNums.length - 1)));
          syncSkinFieldsFromCsv();
        }}
        onAddSkin={() => addSkin()}
        onSelectEntry={(id, prefix) => {
          entryId = id;
          entryPrefix = prefix;
          selectionByCategory = { ...selectionByCategory, [category]: { id, prefix } };
          logEntryData(id, prefix);
          rebuildSkinNums();
          syncSkinFieldsFromCsv();
        }}
        onOpenAddDialog={openAddDialog}
        onCategoryChange={changeCategory}
        onLangChange={(next) => (lang = next)}
        onFieldChange={setField}
        addDialogOpen={addDialogOpen}
        addDialogCategoryLabel={FILTERS[category].label}
        addDialogId={addDialogId}
        addDialogIdPlaceholder={getAddDialogIdPlaceholder(category)}
        addDialogKeys={addDialogId.trim() ? getAddDialogKeys() : null}
        canAddEntry={canAddEntry()}
        onAddDialogIdChange={(next) => (addDialogId = next)}
        onApplyAddEntry={applyAddEntry}
        onCloseAddDialog={closeAddDialog}
      />
    </div>

    <div class="scene scene-text {viewMode === 'text' ? 'active' : 'inactive'}">
      <TextModeScene
        csvText={csvText}
        onCsvTextChange={applyCsvText}
        editable={csvPath !== null}
        active={viewMode === 'text'}
        scrollPosition={textModeScrollPosition}
        onScrollPositionChange={(next) => (textModeScrollPosition = next)}
      />
    </div>
  </div>
</AlmanacPageFrame>

<style>
  .main {
    flex: 1;
    min-height: 0;
    position: relative;
  }

  .scene {
    position: absolute;
    inset: 0;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }

  .scene-almanac {
    z-index: 2;
    transition: opacity 120ms ease;
  }

  .scene-almanac.inactive {
    opacity: 0;
    pointer-events: none;
  }

  .scene-almanac.active {
    opacity: 1;
    pointer-events: auto;
  }

  .scene-text {
    z-index: 1;
    transition: opacity 120ms ease;
  }

  .scene-text.inactive {
    opacity: 0;
    pointer-events: none;
  }

  .scene-text.active {
    opacity: 1;
    pointer-events: auto;
  }
</style>
