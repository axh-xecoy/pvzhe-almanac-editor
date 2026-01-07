export function normalizeHeader(value: string) {
  return value.replace(/^\uFEFF/, '').trim().toLowerCase().replace(/-/g, '_');
}

export function getKeyColumnIndex(headers: string[]) {
  const direct = headers.indexOf('Key');
  if (direct !== -1) return direct;
  return headers.findIndex((h) => normalizeHeader(h) === 'key');
}

export function getColumnIndex(headers: string[], nextLang: 'zh' | 'en' | 'es') {
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

export function rebuildKeyIndex(headers: string[], rows: string[][]) {
  const keyIdx = getKeyColumnIndex(headers);
  const map = new Map<string, number>();
  if (keyIdx === -1) return map;
  for (let i = 0; i < rows.length; i++) {
    const key = (rows[i][keyIdx] ?? '').trim();
    if (key) map.set(key, i);
  }
  return map;
}

export function normalizeRowsByKey(headers: string[], rows: string[][]) {
  const keyIdx = getKeyColumnIndex(headers);
  if (keyIdx === -1) return rows;

  const lastIndexByKey = new Map<string, number>();
  for (let i = 0; i < rows.length; i++) {
    const key = (rows[i][keyIdx] ?? '').trim();
    if (!key) continue;
    lastIndexByKey.set(key, i);
  }

  const out: string[][] = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rawKey = row[keyIdx] ?? '';
    const key = rawKey.trim();
    if (key && lastIndexByKey.get(key) !== i) continue;
    if (key && rawKey !== key) {
      const next = row.slice();
      next[keyIdx] = key;
      out.push(next);
    } else {
      out.push(row);
    }
  }
  return out;
}

