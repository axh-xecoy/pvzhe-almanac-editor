import { DEFAULT_DETAIL_COLOR } from '@util/almanacTokens';

export type AlmanacRenderOp =
  | { type: 'text'; value: string }
  | { type: 'newline' }
  | { type: 'setColor'; value: string };

export function parseAlmanacMarkup(input: string): AlmanacRenderOp[] {
  const colorStack: string[] = [DEFAULT_DETAIL_COLOR];
  const ops: AlmanacRenderOp[] = [{ type: 'setColor', value: colorStack[colorStack.length - 1] }];

  let i = 0;
  while (i < input.length) {
    const ch = input[i];

    if (ch === '\n') {
      ops.push({ type: 'newline' });
      i++;
      continue;
    }

    if (ch === '[') {
      if (input.startsWith('[color=', i)) {
        const close = input.indexOf(']', i + 7);
        if (close !== -1) {
          const raw = input.slice(i + 7, close).trim();
          const hex = raw.replace(/^#/, '');
          const valid = /^[0-9a-fA-F]{6}$/.test(hex);
          if (valid) {
            const next = `#${hex}`;
            colorStack.push(next);
            ops.push({ type: 'setColor', value: next });
            i = close + 1;
            continue;
          }
        }
      } else if (input.startsWith('[/color]', i)) {
        if (colorStack.length > 1) colorStack.pop();
        ops.push({ type: 'setColor', value: colorStack[colorStack.length - 1] });
        i += '[/color]'.length;
        continue;
      }
    }

    ops.push({ type: 'text', value: ch });
    i++;
  }

  return ops;
}

