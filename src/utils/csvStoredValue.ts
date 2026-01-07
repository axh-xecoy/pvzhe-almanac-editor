export function toCsvStoredValue(value: string) {
  return value.replace(/\r\n/g, '\n').replace(/\n/g, '\\n');
}

export function fromCsvStoredValue(rawValue: string) {
  if (!rawValue) return '';
  return rawValue.replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n');
}

