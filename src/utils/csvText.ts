export function escapeCsvCell(value: string) {
  const needsQuotes = /[",\r\n]/.test(value);
  const next = value.replace(/"/g, '""');
  return needsQuotes ? `"${next}"` : next;
}

export function stringifyCsv(headers: string[], rows: string[][]) {
  const out: string[] = [];
  out.push(headers.map(escapeCsvCell).join(','));
  for (const row of rows) {
    const cells = row.map((c) => String(c ?? ''));
    if (cells.every((c) => c.length === 0)) {
      out.push('');
      continue;
    }
    out.push(cells.map(escapeCsvCell).join(','));
  }
  return out.join('\r\n');
}

export function parseCsv(text: string) {
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
  const body = rows.slice(1);

  const normalizedBody = body.map((r) => {
    const next = r.slice();
    while (next.length < headers.length) next.push('');
    return next;
  });

  return { headers, rows: normalizedBody };
}

