import { parseAlmanacMarkup } from '@util/parseAlmanacMarkup';

type RenderArgs = {
  ctx: CanvasRenderingContext2D;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  lineSpacing: number;
  letterSpacing?: number;
  maxWidth?: number;
  wrap?: boolean;
  align?: 'left' | 'center';
  render?: boolean;
};

export type AlmanacTextRenderResult = {
  endX: number;
  endY: number;
  lineCount: number;
  lineAdvance: number;
  contentHeight: number;
  ascent: number;
  descent: number;
};

export function renderAlmanacText({
  ctx,
  text,
  x,
  y,
  fontSize,
  lineSpacing,
  letterSpacing = 0,
  maxWidth,
  wrap = false,
  align = 'left',
  render = true,
}: RenderArgs): AlmanacTextRenderResult {
  const ops = parseAlmanacMarkup(text);

  type Line = { ops: typeof ops; width: number; textCount: number; ascent: number; descent: number };
  const lines: Line[] = [];

  let currentOps: typeof ops = [];
  let currentTextWidthSum = 0;
  let currentTextCount = 0;
  let currentAscent = 0;
  let currentDescent = 0;

  const pushLine = () => {
    const width = currentTextWidthSum + Math.max(0, currentTextCount - 1) * letterSpacing;
    const ascent = currentTextCount > 0 ? currentAscent : fontSize;
    const descent = currentTextCount > 0 ? currentDescent : 0;
    lines.push({ ops: currentOps, width, textCount: currentTextCount, ascent, descent });
    currentOps = [];
    currentTextWidthSum = 0;
    currentTextCount = 0;
    currentAscent = 0;
    currentDescent = 0;
  };

  for (const op of ops) {
    if (op.type === 'newline') {
      pushLine();
      continue;
    }

    if (op.type === 'setColor') {
      currentOps.push(op);
      continue;
    }

    const m = ctx.measureText(op.value);
    const w = m.width;
    const a = typeof m.actualBoundingBoxAscent === 'number' ? m.actualBoundingBoxAscent : fontSize;
    const d = typeof m.actualBoundingBoxDescent === 'number' ? m.actualBoundingBoxDescent : 0;
    const canWrap = wrap && typeof maxWidth === 'number' && maxWidth > 0;
    const nextTextWidthSum = currentTextWidthSum + w;
    const nextTextCount = currentTextCount + 1;
    const nextWidth = nextTextWidthSum + Math.max(0, nextTextCount - 1) * letterSpacing;
    const shouldWrap = canWrap && currentTextCount > 0 && nextWidth > maxWidth!;

    if (shouldWrap) pushLine();

    currentOps.push(op);
    currentTextWidthSum += w;
    currentTextCount += 1;
    if (a > currentAscent) currentAscent = a;
    if (d > currentDescent) currentDescent = d;
  }

  if (currentOps.length || lines.length === 0) pushLine();

  const lineAdvance = fontSize + lineSpacing;
  const lineCount = lines.length;
  const ascent = lineCount > 0 ? lines[0].ascent : fontSize;
  const descent = lineCount > 0 ? lines[lineCount - 1].descent : 0;
  const contentHeight = lineCount <= 0 ? 0 : (lineCount - 1) * lineAdvance + ascent + descent;
  let endX = x;
  let endY = y;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const cursorY = y + i * lineAdvance;

    const lineStartX =
      align === 'center'
        ? typeof maxWidth === 'number' && maxWidth > 0
          ? x + (maxWidth - line.width) / 2
          : x - line.width / 2
        : x;

    let cursorX = lineStartX;
    let remainingText = line.textCount;

    for (const op of line.ops) {
      if (op.type === 'setColor') {
        if (render) ctx.fillStyle = op.value;
        continue;
      }
      if (op.type === 'newline') {
        continue;
      }
      const w = ctx.measureText(op.value).width;
      if (render) ctx.fillText(op.value, cursorX, cursorY);
      cursorX += w;
      remainingText -= 1;
      if (remainingText > 0) cursorX += letterSpacing;
    }

    endX = cursorX;
    endY = cursorY;
  }

  return { endX, endY, lineCount, lineAdvance, contentHeight, ascent, descent };
}
