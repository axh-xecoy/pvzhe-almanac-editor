<script lang="ts">
  import AlmanacCardPreview from '@component/AlmanacCardPreview.svelte';
  import AlmanacEditorPanel from '@component/AlmanacEditorPanel.svelte';
  import AlmanacEntrySelect from '@component/AlmanacEntrySelect.svelte';
  import AlmanacToolbar from '@component/AlmanacToolbar.svelte';
  import { onMount } from 'svelte';
  import { invoke } from '@tauri-apps/api/core';
  import type { AlmanacFieldKey, LibraryCategory, LibrarySide } from '@util/almanacTypes';

  let category: LibraryCategory = $state('plant');
  let previewSide: LibrarySide = $state('plant');
  let theme: 'default' | 'zombie' = $state('default');
  let lang: 'zh' | 'en' | 'es' = $state('zh');
  let csvPath: string | null = $state(null);
  let csvHeaders: string[] = $state([]);
  let csvRows: string[][] = $state([]);
  let keyToRow: Map<string, number> = $state(new Map());

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
    tool: { label: '道具', prefixes: ['TOWERDEFENSE_SHOVEL', 'TOWERDEFENSE_MOWER'], theme: 'default', previewSide: 'plant' },
  };
  let selectionByCategory: Record<LibraryCategory, { id: string; prefix: string }> = $state({
    plant: { id: '', prefix: '' },
    zombie: { id: '', prefix: '' },
    tool: { id: '', prefix: '' },
  });
  let isDirty = $state(false);
  let closeConfirmOpen = $state(false);
  let allowWindowClose = $state(false);

  function changeCategory(next: LibraryCategory) {
    if (next === category) return;
    if (entryId && entryPrefix) {
      selectionByCategory = { ...selectionByCategory, [category]: { id: entryId, prefix: entryPrefix } };
    }
    category = next;
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

  function escapeCsvCell(value: string) {
    const needsQuotes = /[",\r\n]/.test(value);
    const next = value.replace(/"/g, '""');
    return needsQuotes ? `"${next}"` : next;
  }

  function stringifyCsv(headers: string[], rows: string[][]) {
    const out: string[] = [];
    out.push(headers.map(escapeCsvCell).join(','));
    for (const row of rows) out.push(row.map((c) => escapeCsvCell(c ?? '')).join(','));
    return out.join('\r\n');
  }

  function parseCsv(text: string) {
    text = text.replace(/^\uFEFF/, '');

    const firstLineEnd = (() => {
      const rn = text.indexOf('\r\n');
      const n = text.indexOf('\n');
      if (rn === -1) return n;
      if (n === -1) return rn;
      return Math.min(rn, n);
    })();

    const firstLine = firstLineEnd === -1 ? text : text.slice(0, firstLineEnd);
    const delimiter = (() => {
      const candidates = [',', '\t', ';'] as const;
      let best: (typeof candidates)[number] = ',';
      let bestCount = -1;
      for (const c of candidates) {
        const count = firstLine.split(c).length - 1;
        if (count > bestCount) {
          best = c;
          bestCount = count;
        }
      }
      return bestCount <= 0 ? ',' : best;
    })();

    const rows: string[][] = [];
    let row: string[] = [];
    let cell = '';
    let i = 0;
    let inQuotes = false;

    const pushCell = () => {
      row.push(cell);
      cell = '';
    };

    const pushRow = () => {
      rows.push(row);
      row = [];
    };

    while (i < text.length) {
      const ch = text[i];

      if (inQuotes) {
        if (ch === '"') {
          const next = text[i + 1];
          if (next === '"') {
            cell += '"';
            i += 2;
            continue;
          }
          inQuotes = false;
          i++;
          continue;
        }
        cell += ch;
        i++;
        continue;
      }

      if (ch === '"') {
        inQuotes = true;
        i++;
        continue;
      }

      if (ch === delimiter) {
        pushCell();
        i++;
        continue;
      }

      if (ch === '\r') {
        if (text[i + 1] === '\n') i++;
        pushCell();
        pushRow();
        i++;
        continue;
      }

      if (ch === '\n') {
        pushCell();
        pushRow();
        i++;
        continue;
      }

      cell += ch;
      i++;
    }

    pushCell();
    pushRow();

    const rawHeaders = rows[0] ?? [];
    const headers = rawHeaders.map((h) => String(h).replace(/^\uFEFF/, '').trim());
    const body = rows.slice(1).filter((r) => r.some((c) => c.trim().length > 0));

    const normalizedBody = body.map((r) => {
      const next = r.slice();
      while (next.length < headers.length) next.push('');
      return next;
    });

    return { headers, rows: normalizedBody };
  }

  function rebuildKeyIndex(headers: string[], rows: string[][]) {
    const keyIdx = getKeyColumnIndex(headers);
    const map = new Map<string, number>();
    if (keyIdx === -1) return map;
    for (let i = 0; i < rows.length; i++) {
      const key = rows[i][keyIdx] ?? '';
      if (key) map.set(key, i);
    }
    return map;
  }

  function normalizePrefix(prefix: string) {
    return prefix.endsWith('_') ? prefix : `${prefix}_`;
  }

  function getActivePrefixes(nextCategory: LibraryCategory) {
    return FILTERS[nextCategory].prefixes.map(normalizePrefix);
  }

  function normalizeHeader(value: string) {
    return value.replace(/^\uFEFF/, '').trim().toLowerCase().replace(/-/g, '_');
  }

  function getKeyColumnIndex(headers: string[]) {
    const direct = headers.indexOf('Key');
    if (direct !== -1) return direct;
    return headers.findIndex((h) => normalizeHeader(h) === 'key');
  }

  function getColumnIndex(headers: string[], nextLang: 'zh' | 'en' | 'es') {
    const direct = headers.indexOf(nextLang);
    if (direct !== -1) return direct;

    const normalized = headers.map(normalizeHeader);
    const target = normalizeHeader(nextLang);

    const exact = normalized.indexOf(target);
    if (exact !== -1) return exact;

    const candidates: Record<'zh' | 'en' | 'es', string[]> = {
      zh: ['zh_cn', 'zh_hans', 'zh_hant', 'cn', 'chinese', '中文'],
      en: ['en_us', 'en_gb', 'english', '英文'],
      es: ['es_es', 'spanish', 'espanol', 'español', '西班牙语'],
    };

    for (const c of candidates[nextLang]) {
      const idx = normalized.indexOf(c);
      if (idx !== -1) return idx;
    }

    const prefix = `${target}_`;
    const startsWith = normalized.findIndex((h) => h === target || h.startsWith(prefix));
    if (startsWith !== -1) return startsWith;

    return -1;
  }

  function getCsvValue(key: string, column: string) {
    let rowIdx = keyToRow.get(key);
    if (rowIdx === undefined) {
      // Try to find key with trimmed whitespace
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
    return value.replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n');
  }

  function toCsvStoredValue(value: string) {
    return value.replace(/\r\n/g, '\n').replace(/\n/g, '\\n');
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
      return;
    }

    const nextRow = Array(csvHeaders.length).fill('');
    nextRow[keyIdx] = key;
    nextRow[colIdx] = value;
    csvRows = [...csvRows, nextRow];
    keyToRow = rebuildKeyIndex(csvHeaders, csvRows);
  }

  function keyForField(id: string, field: AlmanacFieldKey, prefix: string) {
    return `${prefix}${id}_${field}`;
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

    const list = Array.from(entries.values())
      .filter((e) => e.mask === FULL_MASK)
      .sort((a, b) => {
        const idCompare = a.id.localeCompare(b.id);
        if (idCompare !== 0) return idCompare;
        return a.prefix.localeCompare(b.prefix);
      });

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

    const parsed = parseCsv(result.content);
    csvHeaders = parsed.headers;
    csvRows = parsed.rows;
    keyToRow = rebuildKeyIndex(csvHeaders, csvRows);
    csvPath = result.path;
    isDirty = false;

    if (keyToRow.size) {
      const categories: LibraryCategory[] = ['plant', 'zombie', 'tool'];
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
    if (!csvHeaders.length) return false;
    const content = stringifyCsv(csvHeaders, csvRows);

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
    if (!csvHeaders.length) return false;
    const content = stringifyCsv(csvHeaders, csvRows);
    const nextPath = await invoke<string | null>('save_csv_file_as', { content });
    if (!nextPath) return false;
    csvPath = nextPath;
    isDirty = false;
    return true;
  }

  function setField(field: AlmanacFieldKey, value: string) {
    fields = { ...fields, [field]: value };
    if (csvHeaders.length) isDirty = true;
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
</script>

<div class="root {theme}">
  <AlmanacToolbar {category} />

  {#if closeConfirmOpen}
    <div class="modal-backdrop" role="presentation">
      <div class="modal" role="dialog" aria-modal="true" aria-label="未保存提示">
        <div class="modal-title">编辑的内容未保存，是否保存？</div>
        <div class="modal-actions">
          <button type="button" class="button modal-primary" onclick={confirmCloseSave} disabled={!csvHeaders.length}>
            保存退出
          </button>
          <button type="button" class="button modal-danger" onclick={confirmCloseDiscard}>
            不保存退出
          </button>
          <button type="button" class="button" onclick={confirmCloseCancel}>取消</button>
        </div>
      </div>
    </div>
  {/if}

  <div class="topbar">
    <div class="topbar-right">
      <div class="path topbar-path">{csvPath ?? '未打开文件'}</div>
      <button type="button" class="button" onclick={openCsv}>打开文件</button>
      <div class="split-button">
        <button type="button" class="split split-left" onclick={saveCsv} disabled={!csvHeaders.length || !isDirty}>
          保存
        </button>
        <button type="button" class="split split-right" onclick={saveCsvAs} disabled={!csvHeaders.length}>
          另存为
        </button>
      </div>
    </div>
  </div>

  <div class="content">
    <div class="left">
      <div class="left-top">
        <AlmanacEntrySelect
          options={entryOptions}
          selectedId={entryId}
          selectedPrefix={entryPrefix}
          onSelect={(id, prefix) => {
            entryId = id;
            entryPrefix = prefix;
            selectionByCategory = { ...selectionByCategory, [category]: { id, prefix } };
          }}
        />
      </div>

      <div class="left-bottom">
        <AlmanacCardPreview side={previewSide} fields={getPreviewFields()} />
      </div>
    </div>

    <div class="right">
      <AlmanacEditorPanel
        {category}
        {lang}
        {fields}
        onCategoryChange={changeCategory}
        onLangChange={(next) => (lang = next)}
        onFieldChange={setField}
      />
    </div>
  </div>
</div>

<style>
  .root {
    height: 100vh;
    width: 100vw;
    display: flex;
    flex-direction: column;
    background: var(--bg-color);
    border-radius: 0.5rem;
    overflow: hidden;
  }

  .root.default {
    --bg-color: #fdc689;
    --dark-bg-color: #8f431b;
  }

  .root.zombie {
    --bg-color: #b9aed8;
    --dark-bg-color: #5f6181;
  }

  :where(.button, .split) {
    outline: none;
  }

  .content {
    flex: 1;
    width: 100%;
    display: flex;
    align-items: stretch;
    justify-content: center;
    overflow: hidden;
  }

  .topbar {
    height: 50px;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 12px;
    box-sizing: border-box;
    border-bottom: 1px solid rgba(0, 0, 0, 0.12);
    justify-content: flex-end;
  }

  .topbar-right {
    min-width: 0;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 10px;
  }

  .topbar-path {
    max-width: 520px;
    text-align: right;
  }

  .left {
    width: 450px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    border-right: 1px solid rgba(0, 0, 0, 0.12);
    padding: 12px 0;
    box-sizing: border-box;
  }

  .left-top {
    display: flex;
    justify-content: center;
  }

  .left-bottom {
    height: 625px;
  }

  .right {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    padding: 12px;
    box-sizing: border-box;
    gap: 10px;
  }

  .button {
    height: 34px;
    padding: 0 12px;
    border-radius: 10px;
    border: 1px solid rgba(0, 0, 0, 0.18);
    background: rgba(255, 255, 255, 0.26);
    cursor: pointer;
    user-select: none;
    transition:
      background 120ms ease,
      transform 60ms ease,
      box-shadow 120ms ease;
  }

  .button:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.34);
  }

  .button:active:not(:disabled) {
    transform: translateY(1px);
    background: rgba(255, 255, 255, 0.42);
  }

  .button:focus-visible:not(:disabled) {
    box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.18);
  }

  .button:disabled {
    opacity: 0.5;
    cursor: default;
  }

  .path {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 12px;
    color: rgba(0, 0, 0, 0.55);
  }

  .split-button {
    display: inline-flex;
    height: 34px;
    border-radius: 10px;
    overflow: hidden;
    border: 1px solid rgba(0, 0, 0, 0.18);
  }

  .split {
    height: 34px;
    padding: 0 12px;
    border: 0;
    background: rgba(255, 255, 255, 0.22);
    cursor: pointer;
    user-select: none;
    transition:
      background 120ms ease,
      transform 60ms ease,
      box-shadow 120ms ease;
  }

  .split:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.32);
  }

  .split:active:not(:disabled) {
    transform: translateY(1px);
    background: rgba(255, 255, 255, 0.42);
  }

  .split:focus-visible:not(:disabled) {
    box-shadow: inset 0 0 0 3px rgba(0, 0, 0, 0.18);
  }

  .split:disabled {
    opacity: 0.5;
    cursor: default;
  }

  .split-right {
    border-left: 1px solid rgba(0, 0, 0, 0.18);
  }

  .modal-backdrop {
    position: fixed;
    inset: 0;
    z-index: 50;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 18px;
    background: rgba(0, 0, 0, 0.35);
  }

  .modal {
    width: min(420px, calc(100vw - 36px));
    border-radius: 14px;
    border: 1px solid rgba(0, 0, 0, 0.18);
    background: color-mix(in srgb, var(--bg-color) 78%, white 22%);
    padding: 14px;
    box-sizing: border-box;
  }

  .modal-title {
    font-size: 14px;
    font-weight: 700;
    color: rgba(0, 0, 0, 0.72);
    margin-bottom: 12px;
  }

  .modal-actions {
    display: flex;
    gap: 10px;
    justify-content: flex-end;
  }

  .modal-primary {
    background: rgba(255, 255, 255, 0.55);
  }

  .modal-danger {
    background: color-mix(in srgb, #ff3b30 22%, rgba(255, 255, 255, 0.26));
  }
</style>
