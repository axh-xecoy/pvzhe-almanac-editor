import type { AlmanacFieldKey } from './almanacTypes';
import { getColumnIndex, getKeyColumnIndex } from './csvTable';
import { fromCsvStoredValue } from './csvStoredValue';

export function normalizePrefix(prefix: string) {
  return prefix.endsWith('_') ? prefix : `${prefix}_`;
}

export function keyForField(id: string, field: AlmanacFieldKey, prefix: string) {
  return `${prefix}${id}_${field}`;
}

export function getEntryBaseFromKey(key: string, fieldKeys: AlmanacFieldKey[]) {
  for (const field of fieldKeys) {
    const suffix = `_${field}`;
    if (!key.endsWith(suffix)) continue;
    return `${key.slice(0, -suffix.length)}_`;
  }
  return null;
}

export function getEntryBaseFromSelection(id: string, prefix: string) {
  const normalized = normalizePrefix(prefix);
  return `${normalized}${id}_`;
}

export function getCsvValueByKey(args: {
  key: string;
  column: 'zh' | 'en' | 'es' | string;
  headers: string[];
  rows: string[][];
  keyToRow: Map<string, number>;
}) {
  let rowIdx = args.keyToRow.get(args.key);
  if (rowIdx === undefined) {
    const trimmed = args.key.trim();
    rowIdx = args.keyToRow.get(trimmed);
    if (rowIdx === undefined) return args.key;
  }

  const colIdx =
    args.column === 'zh' || args.column === 'en' || args.column === 'es'
      ? getColumnIndex(args.headers, args.column)
      : args.headers.indexOf(args.column);
  if (colIdx === -1) return args.key;

  const raw = args.rows[rowIdx]?.[colIdx] ?? '';
  const value = raw.trim();
  if (!value) return args.key;
  return raw;
}

export function getEditorValueByKey(args: {
  key: string;
  column: 'zh' | 'en' | 'es' | string;
  headers: string[];
  rows: string[][];
  keyToRow: Map<string, number>;
}) {
  const value = getCsvValueByKey(args);
  if (value === args.key) return '';
  return fromCsvStoredValue(value);
}

export type EntryOption = { id: string; label: string; prefix: string };

export function computeEntryOptions(args: {
  prefixes: string[];
  fieldKeys: AlmanacFieldKey[];
  lang: 'zh' | 'en' | 'es';
  headers: string[];
  rows: string[][];
  keyToRow: Map<string, number>;
}): EntryOption[] {
  const bitByField = new Map<AlmanacFieldKey, number>();
  for (let i = 0; i < args.fieldKeys.length; i++) bitByField.set(args.fieldKeys[i], 1 << i);
  const fullMask = (1 << args.fieldKeys.length) - 1;

  const entries = new Map<string, { id: string; prefix: string; mask: number }>();
  for (const key of args.keyToRow.keys()) {
    for (const prefix of args.prefixes) {
      if (!key.startsWith(prefix)) continue;
      for (const field of args.fieldKeys) {
        const suffix = `_${field}`;
        if (!key.endsWith(suffix)) continue;
        const id = key.slice(prefix.length, -suffix.length);
        if (!id) continue;
        const entryKey = `${prefix}${id}`;
        const prev = entries.get(entryKey);
        const nextMask = (prev?.mask ?? 0) | (bitByField.get(field) ?? 0);
        entries.set(entryKey, { id, prefix, mask: nextMask });
      }
    }
  }

  const list = Array.from(entries.values()).filter((e) => e.mask === fullMask);

  return list.map(({ id, prefix }) => {
    const key = keyForField(id, 'NAME', prefix);
    const name = getCsvValueByKey({
      key,
      column: args.lang,
      headers: args.headers,
      rows: args.rows,
      keyToRow: args.keyToRow,
    });
    return { id, prefix, label: name === key ? id : name };
  });
}

export function collectEntryFieldsByBase(args: {
  entryBase: string;
  lang: 'zh' | 'en' | 'es';
  headers: string[];
  rows: string[][];
  keyToRow: Map<string, number>;
}) {
  const colIdx = getColumnIndex(args.headers, args.lang);
  if (colIdx === -1) return {};

  const keys = Array.from(args.keyToRow.keys())
    .filter((k) => k.startsWith(args.entryBase))
    .sort((a, b) => a.localeCompare(b));

  const out: Record<string, string> = {};
  for (const key of keys) {
    const rowIdx = args.keyToRow.get(key);
    if (rowIdx === undefined) continue;
    const raw = String(args.rows[rowIdx]?.[colIdx] ?? '');
    out[key] = fromCsvStoredValue(raw);
  }

  return out;
}

export function isBlankCsvRow(row: string[] | undefined) {
  if (!row) return true;
  for (const c of row) {
    if (String(c ?? '').trim()) return false;
  }
  return true;
}

export function makeBlankRow(columnCount: number) {
  return Array(columnCount).fill('');
}

export function findLastRowIndexByEntryBase(args: { headers: string[]; rows: string[][]; entryBase: string }) {
  const keyIdx = getKeyColumnIndex(args.headers);
  if (keyIdx === -1) return -1;
  for (let i = args.rows.length - 1; i >= 0; i--) {
    const key = String(args.rows[i]?.[keyIdx] ?? '').trim();
    if (!key) continue;
    if (key.startsWith(args.entryBase)) return i;
  }
  return -1;
}

export function computeEntryBaseInsertIndex(args: {
  headers: string[];
  rows: string[][];
  entryBase: string;
  lastRowIndex: number;
}) {
  const keyIdx = getKeyColumnIndex(args.headers);
  if (keyIdx === -1) return args.rows.length;

  let firstBlankIndex: number | null = null;
  let i = Math.max(0, args.lastRowIndex + 1);
  while (i < args.rows.length) {
    const row = args.rows[i];
    if (isBlankCsvRow(row)) {
      if (firstBlankIndex === null) firstBlankIndex = i;
      i++;
      continue;
    }

    const key = String(row?.[keyIdx] ?? '').trim();
    if (key && key.startsWith(args.entryBase)) {
      firstBlankIndex = null;
      i++;
      continue;
    }

    break;
  }

  return firstBlankIndex ?? i;
}

export function findLastEntryBase(args: {
  headers: string[];
  rows: string[][];
  prefix: string;
  fieldKeys: AlmanacFieldKey[];
}) {
  const keyIdx = getKeyColumnIndex(args.headers);
  if (keyIdx === -1) return null;

  for (let i = args.rows.length - 1; i >= 0; i--) {
    const row = args.rows[i];
    const key = String(row?.[keyIdx] ?? '').trim();
    if (!key) continue;
    if (!key.startsWith(args.prefix)) continue;

    for (const field of args.fieldKeys) {
      const suffix = `_${field}`;
      if (!key.endsWith(suffix)) continue;
      const id = key.slice(args.prefix.length, -suffix.length);
      if (!id) continue;
      return { base: `${args.prefix}${id}_`, rowIndex: i };
    }
  }

  return null;
}

export function computeAddEntryInsertIndex(args: {
  headers: string[];
  rows: string[][];
  prefix: string;
  fieldKeys: AlmanacFieldKey[];
}) {
  const keyIdx = getKeyColumnIndex(args.headers);
  if (keyIdx === -1) return args.rows.length;

  const last = findLastEntryBase(args);
  if (last) {
    let i = last.rowIndex + 1;
    while (i < args.rows.length) {
      const row = args.rows[i];
      if (isBlankCsvRow(row)) {
        i++;
        continue;
      }
      const key = String(row?.[keyIdx] ?? '').trim();
      if (key && key.startsWith(last.base)) {
        i++;
        continue;
      }
      break;
    }
    return i;
  }

  for (let i = args.rows.length - 1; i >= 0; i--) {
    const row = args.rows[i];
    const key = String(row?.[keyIdx] ?? '').trim();
    if (!key) continue;
    if (!key.startsWith(args.prefix)) continue;

    let j = i + 1;
    while (j < args.rows.length && isBlankCsvRow(args.rows[j])) j++;
    return j;
  }

  return args.rows.length;
}

export function insertNewEntryRows(args: {
  id: string;
  prefix: string;
  lang: 'zh' | 'en' | 'es';
  headers: string[];
  rows: string[][];
  fieldKeys: AlmanacFieldKey[];
}) {
  const keyIdx = getKeyColumnIndex(args.headers);
  const colIdx = getColumnIndex(args.headers, args.lang);
  if (keyIdx === -1 || colIdx === -1) return args.rows;

  const insertIndex = computeAddEntryInsertIndex({
    headers: args.headers,
    rows: args.rows,
    prefix: args.prefix,
    fieldKeys: args.fieldKeys,
  });

  const toInsert: string[][] = [];

  if (insertIndex > 0 && !isBlankCsvRow(args.rows[insertIndex - 1])) {
    toInsert.push(makeBlankRow(args.headers.length));
  }

  for (const field of args.fieldKeys) {
    const key = keyForField(args.id, field, args.prefix);
    const row = makeBlankRow(args.headers.length);
    row[keyIdx] = key;
    row[colIdx] = '';
    toInsert.push(row);
  }

  if (insertIndex >= args.rows.length || !isBlankCsvRow(args.rows[insertIndex])) {
    toInsert.push(makeBlankRow(args.headers.length));
  }

  return [...args.rows.slice(0, insertIndex), ...toInsert, ...args.rows.slice(insertIndex)];
}
