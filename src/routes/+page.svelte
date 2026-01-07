<script lang="ts">
  import AlmanacModeScene from '@component/AlmanacModeScene.svelte';
  import AlmanacPageFrame from '@component/AlmanacPageFrame.svelte';
  import TextModeScene from '@component/TextModeScene.svelte';
  import { onMount } from 'svelte';
  import { invoke } from '@tauri-apps/api/core';
  import type { AlmanacFieldKey, LibraryCategory, LibrarySide } from '@util/almanacTypes';
  import { stringifyCsv, parseCsv } from '@util/csvText';
  import { rebuildKeyIndex, normalizeRowsByKey, getColumnIndex, getKeyColumnIndex } from '@util/csvTable';
  import { fromCsvStoredValue, toCsvStoredValue } from '@util/csvStoredValue';

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

  let fields: Record<AlmanacFieldKey, string> = $state({
    NAME: '',
    EXPRESTION: '',
    HANDBOOK_EXPRESTION: '',
    HANDBOOK_STORY: '',
  });

  const FIELD_KEYS: AlmanacFieldKey[] = ['NAME', 'EXPRESTION', 'HANDBOOK_EXPRESTION', 'HANDBOOK_STORY'];

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
    category = next;
  }

  function getCategoryDefaultPrefix(next: LibraryCategory) {
    const prefixes = getActivePrefixes(next);
    return prefixes[0] ?? '';
  }

  onMount(() => {
    let unlisten: null | (() => void) = null;

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
    };
  });

  function normalizePrefix(prefix: string) {
    return prefix.endsWith('_') ? prefix : `${prefix}_`;
  }

  function getActivePrefixes(nextCategory: LibraryCategory) {
    return FILTERS[nextCategory].prefixes.map(normalizePrefix);
  }

  function getCsvValue(key: string, column: string) {
    let rowIdx = keyToRow.get(key);
    if (rowIdx === undefined) {
      const trimmed = key.trim();
      rowIdx = keyToRow.get(trimmed);
      if (rowIdx === undefined) return key;
    }

    const colIdx =
      column === 'zh' || column === 'en' || column === 'es'
        ? getColumnIndex(csvHeaders, column)
        : csvHeaders.indexOf(column);
    if (colIdx === -1) return key;

    const raw = csvRows[rowIdx]?.[colIdx] ?? '';
    const value = raw.trim();
    if (!value) return key; // fallback to key if empty
    return raw;
  }

  function getEditorValue(key: string, column: string) {
    const value = getCsvValue(key, column);
    if (value === key) return '';
    return fromCsvStoredValue(value);
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
    csvRows = [...csvRows, nextRow];
    keyToRow = rebuildKeyIndex(csvHeaders, csvRows);
    syncCsvTextFromTable();
  }

  function keyForField(id: string, field: AlmanacFieldKey, prefix: string) {
    return `${prefix}${id}_${field}`;
  }
  function keyExists(key: string) {
    return keyToRow.has(key);
  }

  const FIELD_MASK: Record<AlmanacFieldKey, number> = {
    NAME: 1 << 0,
    EXPRESTION: 1 << 1,
    HANDBOOK_EXPRESTION: 1 << 2,
    HANDBOOK_STORY: 1 << 3,
  };

  const FULL_MASK = (1 << 4) - 1;

  function computeEntryOptions(nextCategory: LibraryCategory) {
    const prefixes = getActivePrefixes(nextCategory);
    const entries = new Map<string, { id: string; prefix: string; mask: number }>();
    for (const key of keyToRow.keys()) {
      for (const prefix of prefixes) {
        if (!key.startsWith(prefix)) continue;
        for (const field of FIELD_KEYS) {
          const suffix = `_${field}`;
          if (!key.endsWith(suffix)) continue;
          const id = key.slice(prefix.length, -suffix.length);
          if (!id) continue;
          const entryKey = `${prefix}${id}`;
          const prev = entries.get(entryKey);
          const nextMask = (prev?.mask ?? 0) | FIELD_MASK[field];
          entries.set(entryKey, { id, prefix, mask: nextMask });
        }
      }
    }

    const list = Array.from(entries.values()).filter((e) => e.mask === FULL_MASK);

    return list.map(({ id, prefix }) => {
      const key = keyForField(id, 'NAME', prefix);
      const name = getCsvValue(key, lang);
      return { id, prefix, label: name === key ? id : name };
    });
  }

  function rebuildOptions() {
    const options = computeEntryOptions(category);

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

  function syncFieldsFromCsv() {
    if (!entryId || !entryPrefix) {
      return;
    }

    const next: Record<AlmanacFieldKey, string> = {
      NAME: '',
      EXPRESTION: '',
      HANDBOOK_EXPRESTION: '',
      HANDBOOK_STORY: '',
    };
    for (const field of FIELD_KEYS) next[field] = getEditorValue(keyForField(entryId, field, entryPrefix), lang);
    if (
      fields.NAME === next.NAME &&
      fields.EXPRESTION === next.EXPRESTION &&
      fields.HANDBOOK_EXPRESTION === next.HANDBOOK_EXPRESTION &&
      fields.HANDBOOK_STORY === next.HANDBOOK_STORY
    ) {
      return;
    }
    fields = next;
  }

  function getPreviewFields() {
    const out: Record<AlmanacFieldKey, string> = { ...fields };
    if (!entryId || !entryPrefix) return out;
    for (const field of FIELD_KEYS) {
      if (out[field].trim().length) continue;
      const key = keyForField(entryId, field, entryPrefix);
      out[field] = getCsvValue(key, lang);
    }
    return out;
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
    const keys = getAddDialogKeys();
    writeValue(keys.NAME.key, '');
    writeValue(keys.EXPRESTION.key, '');
    writeValue(keys.HANDBOOK_EXPRESTION.key, '');
    writeValue(keys.HANDBOOK_STORY.key, '');
    isDirty = true;
    rebuildOptions();
    entryId = id;
    entryPrefix = prefix;
    selectionByCategory = { ...selectionByCategory, [category]: { id, prefix } };
    syncFieldsFromCsv();
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
    syncFieldsFromCsv();
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
    root.style.setProperty('--bg-color', '#fdc689');
    root.style.setProperty('--dark-bg-color', '#8f431b');
  });

  async function openCsv() {
    const result = await invoke<{ path: string; content: string } | null>('open_csv_file');
    if (!result) return;

    csvText = result.content;
    const parsed = parseCsv(result.content);
    csvHeaders = parsed.headers;
    csvRows = normalizeRowsByKey(parsed.headers, parsed.rows);
    keyToRow = rebuildKeyIndex(csvHeaders, csvRows);
    csvPath = result.path;
    isDirty = false;

    if (keyToRow.size) {
      const categories: LibraryCategory[] = ['plant', 'zombie', 'shovel', 'mower'];
      let best = category;
      let bestCount = computeEntryOptions(category).length;
      for (const c of categories) {
        const count = computeEntryOptions(c).length;
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

    syncFieldsFromCsv();
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
    fields = { ...fields, [field]: value };
    if (csvPath) isDirty = true;
    if (!entryId || !entryPrefix) return;
    writeValue(keyForField(entryId, field, entryPrefix), toCsvStoredValue(value));
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
    if (next !== 'almanac') return;
    rebuildOptions();
    syncFieldsFromCsv();
  }

</script>

<AlmanacPageFrame
  theme={theme}
  {category}
  {csvPath}
  {viewMode}
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
  {#if viewMode === 'almanac'}
    <AlmanacModeScene
      {category}
      {lang}
      entryOptions={entryOptions}
      entryId={entryId}
      entryPrefix={entryPrefix}
      addDisabled={!csvHeaders.length}
      {previewSide}
      previewFields={getPreviewFields()}
      {fields}
      onSelectEntry={(id, prefix) => {
        entryId = id;
        entryPrefix = prefix;
        selectionByCategory = { ...selectionByCategory, [category]: { id, prefix } };
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
  {:else}
    <TextModeScene csvText={csvText} onCsvTextChange={applyCsvText} editable={csvPath !== null} />
  {/if}
</AlmanacPageFrame>
