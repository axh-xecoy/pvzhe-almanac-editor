import type { AlmanacFieldKey, LibrarySide } from '@util/almanacTypes';
import { renderAlmanacText } from '@util/renderAlmanacText';

type DrawLayoutKey = AlmanacFieldKey | 'TEMPLATE';

type DrawScrollbarLayout = {
  xOffset?: number;
  yOffset?: number;
  height?: number;
  width?: number;
  spacePercentage?: number;
  occupyWidthRatio?: number;
};

type DrawFieldLayout = {
  xOffset?: number;
  yOffset?: number;
  widthRatio?: number;
  heightRatio?: number;
  scrollbar?: DrawScrollbarLayout;
  fontSize?: number;
  lineSpacing?: number;
  letterSpacing?: number;
  wrap?: boolean;
  center?: boolean;
  connectTo?: DrawLayoutKey;
  gap?: number;
  prefixText?: string;
  suffixText?: string;
};

export const ALMANAC_FIELD_LAYOUT: Record<
  LibrarySide,
  Record<AlmanacFieldKey, DrawFieldLayout> & { TEMPLATE?: DrawFieldLayout }
> = {
  plant: {
    NAME: { 
      xOffset: -10, 
      yOffset: -43, 
      widthRatio: 0.83, 
      fontSize: 28, 
      lineSpacing: 4, 
      wrap: false, 
      center: true,
      prefixText: '[color=ffffff]', 
      suffixText: '[/color]' 
    },
    EXPRESTION: {
      xOffset: 5,
      yOffset: 0,
      widthRatio: 0.80,
      heightRatio: 0.435,
      scrollbar: {
        xOffset: -5,
        yOffset: 10,
        width: 8,
        height: 250,
        spacePercentage: 0.05
      },
      fontSize: 17,
      lineSpacing: 3,
      wrap: true,
      prefixText: '[color=343b5d]', 
      suffixText: '[/color]' 
    },
    HANDBOOK_EXPRESTION: { 
      connectTo: 'EXPRESTION', 
      prefixText: '\n[color=9f552b]',
      suffixText: '[/color]'
    },
    HANDBOOK_STORY: { 
      connectTo: 'HANDBOOK_EXPRESTION',
      prefixText: '\n[color=9f552b]',
      suffixText: '[/color]'
    },
    TEMPLATE: {
      xOffset: 5,
      yOffset: 275,
      fontSize: 17,
      prefixText: '[color=ab5e57]花费：NaN               冷却时间：NaN[/color]'
    }
  },
  zombie: {
    NAME: { 
      xOffset: -10, 
      yOffset: -32, 
      widthRatio: 0.83, 
      fontSize: 28, 
      lineSpacing: 4, 
      wrap: false, 
      center: true,
      prefixText: '[color=ffffff]', 
      suffixText: '[/color]' 
    },
    EXPRESTION: {
      xOffset: 5,
      yOffset: 0,
      widthRatio: 0.80,
      heightRatio: 0.285,
      scrollbar: {
        xOffset: -5,
        yOffset: 10,
        width: 8,
        height: 165,
        spacePercentage: 0.05
      },
      fontSize: 17,
      lineSpacing: 2.5,
      wrap: true,
      prefixText: '[color=343b5d]', 
      suffixText: '[/color]' 
    },
    HANDBOOK_EXPRESTION: { 
      connectTo: 'EXPRESTION', 
      prefixText: '\n[color=9f552b]',
      suffixText: '[/color]'
    },
    HANDBOOK_STORY: { 
      connectTo: 'HANDBOOK_EXPRESTION',
      prefixText: '\n[color=9f552b]',
      suffixText: '[/color]'
    },
    TEMPLATE: {
      xOffset: 5,
      yOffset: 182,
      fontSize: 17,
      prefixText: '[color=ab5e57]花费：NaN               冷却时间：NaN[/color]'
    }
  },
};

type DrawArgs = {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  ratio: number;
  image: HTMLImageElement;
  detail?: string;
  side?: LibrarySide;
  fields?: Partial<Record<AlmanacFieldKey, string>>;
  startX: number;
  startY: number;
  widthRatio: number;
  autoWrap?: boolean;
  scrollOffsets?: Partial<Record<DrawLayoutKey, number>>;
};

export type AlmanacScrollbarRenderInfo = {
  key: DrawLayoutKey;
  track: { x: number; y: number; width: number; height: number };
  thumb: { x: number; y: number; width: number; height: number };
  viewport: { x: number; y: number; width: number; height: number };
  maxScroll: number;
  scroll: number;
};

export type AlmanacCardDrawResult = {
  scrollbars: AlmanacScrollbarRenderInfo[];
};

export function drawAlmanacCard({
  canvas,
  ctx,
  ratio,
  image,
  detail,
  side,
  fields,
  startX: cardStartX,
  startY: cardStartY,
  widthRatio,
  autoWrap = false,
  scrollOffsets,
}: DrawArgs) {
  const margin = 6 * ratio;
  const scrollbars: AlmanacScrollbarRenderInfo[] = [];

  if (!fields || !side) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    ctx.beginPath();
    ctx.font = `${16 * ratio}px fzkt, serif`;

    const fontSize = 16 * ratio;
    const lineSpacing = 3 * ratio;

    renderAlmanacText({
      ctx,
      text: detail ?? '',
      x: cardStartX + margin,
      y: cardStartY + margin,
      fontSize,
      lineSpacing,
      wrap: autoWrap,
      maxWidth: widthRatio * canvas.width,
    });

    return { scrollbars };
  }

  const order: DrawLayoutKey[] = ['NAME', 'EXPRESTION', 'TEMPLATE', 'HANDBOOK_EXPRESTION', 'HANDBOOK_STORY'];
  const layout = ALMANAC_FIELD_LAYOUT[side];

  const getLayout = (key: DrawLayoutKey) => (key === 'TEMPLATE' ? layout.TEMPLATE : layout[key]);
  const findScrollRoot = (key: DrawLayoutKey): DrawLayoutKey | null => {
    let cursor: DrawLayoutKey | null = key;
    while (cursor) {
      const l = getLayout(cursor);
      if (l?.heightRatio && l.scrollbar) return cursor;
      cursor = l?.connectTo ?? null;
    }
    return null;
  };

  const scrollbarSpace = (rawMaxWidth: number, sb: DrawScrollbarLayout | undefined) => {
    if (!sb) return 0;
    const pct = sb.spacePercentage ?? sb.occupyWidthRatio ?? 0;
    const byPct = Math.max(0, pct * rawMaxWidth);
    const byWidth = Math.max(0, (sb.width ?? 0) * ratio);
    return Math.max(byPct, byWidth);
  };

  type MeasuredItem = {
    key: DrawLayoutKey;
    x: number;
    y: number;
    fontSize: number;
    lineSpacing: number;
    letterSpacing: number;
    maxWidth: number;
    wrap: boolean;
    align: 'left' | 'center';
    text: string;
    endY: number;
    bottomY: number;
    ascent: number;
    descent: number;
    rawMaxWidth: number;
  };

  type GroupInfo = {
    root: DrawLayoutKey;
    viewport: { x: number; y: number; width: number; height: number };
    track: { x: number; y: number; width: number; height: number };
    thumbMinHeight: number;
    contentHeight: number;
    maxScroll: number;
    scroll: number;
  };

  const measurePass = (activeRoots: Set<DrawLayoutKey>) => {
    const results: Partial<
      Record<
        DrawLayoutKey,
        {
          endY: number;
          fontSize: number;
          lineSpacing: number;
          letterSpacing: number;
          widthRatio: number;
          wrap: boolean;
          center: boolean;
          xOffset: number;
          yOffset: number;
        }
      >
    > = {};

    const items = new Map<DrawLayoutKey, MeasuredItem>();

    for (const key of order) {
      const rawLayout = getLayout(key);
      if (!rawLayout) continue;

      let baseKey: DrawLayoutKey | null = rawLayout.connectTo ?? null;
      if (baseKey && !results[baseKey]) baseKey = null;

      const base = baseKey ? getLayout(baseKey) : undefined;
      const baseResult = baseKey ? results[baseKey] : undefined;

      const fontSize =
        rawLayout.fontSize !== undefined
          ? rawLayout.fontSize * ratio
          : baseResult?.fontSize ?? (base?.fontSize ?? 16) * ratio;
      const lineSpacing =
        rawLayout.lineSpacing !== undefined
          ? rawLayout.lineSpacing * ratio
          : baseResult?.lineSpacing ?? (base?.lineSpacing ?? 3) * ratio;
      const letterSpacing =
        rawLayout.letterSpacing !== undefined
          ? rawLayout.letterSpacing * ratio
          : baseResult?.letterSpacing ?? (base?.letterSpacing ?? 0) * ratio;
      const effectiveWidthRatio = rawLayout.widthRatio ?? baseResult?.widthRatio ?? base?.widthRatio ?? widthRatio;
      const effectiveWrap = rawLayout.wrap ?? baseResult?.wrap ?? base?.wrap ?? true;
      const effectiveCenter = rawLayout.center ?? baseResult?.center ?? base?.center ?? false;

      const xOffset =
        rawLayout.xOffset !== undefined ? rawLayout.xOffset * ratio : baseResult?.xOffset ?? (base?.xOffset ?? 0) * ratio;
      const yOffset =
        rawLayout.yOffset !== undefined ? rawLayout.yOffset * ratio : baseResult?.yOffset ?? (base?.yOffset ?? 0) * ratio;

      const x = cardStartX + margin + xOffset;
      let y = cardStartY + margin + yOffset;

      if (baseKey && baseResult) {
        y = baseResult.endY + fontSize + lineSpacing + (rawLayout.gap ?? 0) * ratio + yOffset;
      }

      const baseText = key === 'TEMPLATE' ? '' : (fields[key] ?? '');
      const text = `${rawLayout.prefixText ?? ''}${baseText}${rawLayout.suffixText ?? ''}`;

      ctx.font = `${fontSize}px fzkt, serif`;

      const rawMaxWidth = effectiveWidthRatio * canvas.width;
      const scrollRoot = findScrollRoot(key);
      const rootLayout = scrollRoot ? getLayout(scrollRoot) : undefined;
      const activeRoot = scrollRoot && activeRoots.has(scrollRoot);
      const sbSpace = activeRoot ? scrollbarSpace(rawMaxWidth, rootLayout?.scrollbar) : 0;
      const maxWidth = Math.max(0, rawMaxWidth - sbSpace);

      const r = renderAlmanacText({
        ctx,
        text,
        x,
        y,
        fontSize,
        lineSpacing,
        letterSpacing,
        wrap: effectiveWrap,
        align: effectiveCenter ? 'center' : 'left',
        maxWidth,
        render: false,
      });

      items.set(key, {
        key,
        x,
        y,
        fontSize,
        lineSpacing,
        letterSpacing,
        maxWidth,
        wrap: effectiveWrap,
        align: effectiveCenter ? 'center' : 'left',
        text,
        endY: r.endY,
        bottomY: r.endY + r.descent,
        ascent: r.ascent,
        descent: r.descent,
        rawMaxWidth,
      });

      results[key] = {
        endY: r.endY,
        fontSize,
        lineSpacing,
        letterSpacing,
        widthRatio: effectiveWidthRatio,
        wrap: effectiveWrap,
        center: effectiveCenter,
        xOffset,
        yOffset,
      };
    }

    const groups = new Map<DrawLayoutKey, GroupInfo>();
    for (const key of order) {
      const rootLayout = getLayout(key);
      if (!rootLayout?.heightRatio || !rootLayout.scrollbar) continue;
      const rootItem = items.get(key);
      if (!rootItem) continue;

      const viewportHeight = rootLayout.heightRatio * canvas.height;
      if (!(viewportHeight > 0)) continue;

      const viewportTopY = rootItem.y - rootItem.ascent;

      let maxBottom = rootItem.bottomY;
      for (const item of items.values()) {
        if (findScrollRoot(item.key) !== key) continue;
        if (item.bottomY > maxBottom) maxBottom = item.bottomY;
      }

      const contentHeight = Math.max(0, maxBottom - viewportTopY);
      const maxScroll = Math.max(0, contentHeight - viewportHeight);

      const sbSpace = activeRoots.has(key) ? scrollbarSpace(rootItem.rawMaxWidth, rootLayout.scrollbar) : 0;
      const viewportWidth = Math.max(0, rootItem.rawMaxWidth - sbSpace);
      const viewport = { x: rootItem.x, y: viewportTopY, width: viewportWidth, height: viewportHeight };

      const trackWidth = Math.max(1, rootLayout.scrollbar.width !== undefined ? rootLayout.scrollbar.width * ratio : sbSpace);
      const trackHeight = Math.max(1, rootLayout.scrollbar.height !== undefined ? rootLayout.scrollbar.height * ratio : viewportHeight);
      const trackX = viewport.x + rootItem.rawMaxWidth - trackWidth + (rootLayout.scrollbar.xOffset ?? 0) * ratio;
      const trackY = viewport.y + (rootLayout.scrollbar.yOffset ?? 0) * ratio;

      const rawScroll = scrollOffsets?.[key] ?? 0;
      const scroll = Math.max(0, Math.min(rawScroll, maxScroll));

      groups.set(key, {
        root: key,
        viewport,
        track: { x: trackX, y: trackY, width: trackWidth, height: trackHeight },
        thumbMinHeight: 8 * ratio,
        contentHeight,
        maxScroll,
        scroll,
      });
    }

    return { items, groups };
  };

  const initial = measurePass(new Set());
  const activeRoots = new Set<DrawLayoutKey>();
  for (const g of initial.groups.values()) {
    if (g.contentHeight > g.viewport.height + 0.5) activeRoots.add(g.root);
  }
  const measured = measurePass(activeRoots);

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  ctx.beginPath();

  for (const key of order) {
    const item = measured.items.get(key);
    if (!item) continue;

    ctx.font = `${item.fontSize}px fzkt, serif`;

    const scrollRoot = findScrollRoot(key);
    const group = scrollRoot ? measured.groups.get(scrollRoot) : undefined;
    const isScrollable = Boolean(group && activeRoots.has(scrollRoot!));

    if (!isScrollable) {
      renderAlmanacText({
        ctx,
        text: item.text,
        x: item.x,
        y: item.y,
        fontSize: item.fontSize,
        lineSpacing: item.lineSpacing,
        letterSpacing: item.letterSpacing,
        wrap: item.wrap,
        align: item.align,
        maxWidth: item.maxWidth,
      });
      continue;
    }

    ctx.save();
    ctx.beginPath();
    ctx.rect(group!.viewport.x, group!.viewport.y, group!.viewport.width, group!.viewport.height);
    ctx.clip();
    renderAlmanacText({
      ctx,
      text: item.text,
      x: item.x,
      y: item.y - group!.scroll,
      fontSize: item.fontSize,
      lineSpacing: item.lineSpacing,
      letterSpacing: item.letterSpacing,
      wrap: item.wrap,
      align: item.align,
      maxWidth: item.maxWidth,
    });
    ctx.restore();
  }

  for (const group of measured.groups.values()) {
    if (!activeRoots.has(group.root)) continue;
    if (!(group.maxScroll > 0)) continue;

    const thumbHeight = Math.max(group.thumbMinHeight, (group.viewport.height / group.contentHeight) * group.track.height);
    const thumbTravel = Math.max(1, group.track.height - thumbHeight);
    const thumbY = group.track.y + (group.scroll / group.maxScroll) * thumbTravel;

    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
    ctx.fillRect(group.track.x, group.track.y, group.track.width, group.track.height);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.46)';
    ctx.fillRect(group.track.x, thumbY, group.track.width, thumbHeight);
    ctx.restore();

    scrollbars.push({
      key: group.root,
      track: group.track,
      thumb: { x: group.track.x, y: thumbY, width: group.track.width, height: thumbHeight },
      viewport: group.viewport,
      maxScroll: group.maxScroll,
      scroll: group.scroll,
    });
  }

  return { scrollbars };
}
