import type { AlmanacFieldKey, LibrarySide } from '@util/almanacTypes';
import { renderAlmanacText } from '@util/renderAlmanacText';
import AlmanacSkinSwitch from '$lib/Almanac_Skin_Switch.png';
import PlantCardMaskUrl from '$lib/Almanac_PlantCard_Mask.png';
import ZombieCardMaskUrl from '$lib/Almanac_ZombieCard_Mask.png';

type DrawLayoutKey = AlmanacFieldKey | 'TEMPLATE' | `TEMPLATE_${number}`;

const ALMANAC_FIELD_KEYS: AlmanacFieldKey[] = [
  'NAME',
  'EXPRESTION',
  'HANDBOOK_EXPRESTION',
  'HANDBOOK_STORY',
  'ACCESS',
  'STORY',
];

function isAlmanacFieldKey(key: DrawLayoutKey): key is AlmanacFieldKey {
  return (ALMANAC_FIELD_KEYS as readonly string[]).includes(key as any);
}

const imageCache = new Map<string, HTMLImageElement>();
const imageLoadListenerAttached = new WeakSet<HTMLImageElement>();
function getCachedImage(url: string): HTMLImageElement | null {
  if (typeof Image === 'undefined') return null;
  const existing = imageCache.get(url);
  if (existing) return existing;
  const img = new Image();
  img.src = url;
  imageCache.set(url, img);
  return img;
}

type DrawScrollbarLayout = {
  xOffset?: number;
  yOffset?: number;
  height?: number;
  width?: number;
  spacePercentage?: number;
  occupyWidthRatio?: number;
};

export type AlmanacCardSwitchPosition = {
  xOffset: number;
  yOffset: number;
};

type DrawImageLayout = {
  url: string;
  xOffset?: number;
  yOffset?: number;
  width?: number;
  height?: number;
  widthRatio?: number;
  heightRatio?: number;
  alpha?: number;
};

type DrawFieldLayout = {
  xOffset?: number;
  yOffset?: number;
  widthRatio?: number;
  heightRatio?: number;
  scrollbar?: DrawScrollbarLayout;
  image?: DrawImageLayout;
  fontSize?: number;
  lineSpacing?: number;
  letterSpacing?: number;
  wrap?: boolean;
  align?: 'left' | 'center' | 'right';
  connectTo?: DrawLayoutKey;
  gap?: number;
  prefixText?: string;
  suffixText?: string;
};

type AlmanacSideLayout = Partial<Record<AlmanacFieldKey, DrawFieldLayout>> & {
  TEMPLATE?: DrawFieldLayout | DrawFieldLayout[];
  SKIN?: {
    SWITCH_POSITION?: AlmanacCardSwitchPosition;
    TEMPLATE?: DrawFieldLayout | DrawFieldLayout[];
    NAME?: DrawFieldLayout;
    ACCESS?: DrawFieldLayout;
    STORY?: DrawFieldLayout;
  };
};

export const ALMANAC_FIELD_LAYOUT: Record<
  LibrarySide,
  AlmanacSideLayout
> = {
  plant: {
    NAME: { 
      xOffset: -5, 
      yOffset: -43, 
      widthRatio: 0.83, 
      fontSize: 28, 
      lineSpacing: 4, 
      wrap: false, 
      align: 'center',
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
    TEMPLATE: [
      {
        xOffset: 5,
        yOffset: 275,
        fontSize: 17,
        prefixText: '[color=ab5e57]花费：{sun}[/color]'
      },
      {
        xOffset: -10,
        yOffset: 275,
        fontSize: 17,
        align: 'right',
        prefixText: '[color=ab5e57]冷却时间：{cold}[/color]'
      }
    ],
    SKIN: {
      SWITCH_POSITION: {
        xOffset: 114,
        yOffset: 78
      },
      NAME: {
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
        prefixText: '[color=ff3eff]', 
        suffixText: '[/color]' 
      },
      ACCESS: {
        connectTo: 'NAME',
        prefixText: '\n[color=ff0000]获取方式[/color][color=9f552b]:',
        suffixText: '[/color]'
      },
      STORY: {
        connectTo: 'ACCESS',
        prefixText: '\n[color=9f552b]',
        suffixText: '[/color]'
      },
      TEMPLATE: {
        xOffset: 5,
        yOffset: 215,
        image: {
          width: 256,
          height: 40,
          url: AlmanacSkinSwitch
        }
      }
    }
  },
  zombie: {
    NAME: { 
      xOffset: -5, 
      yOffset: -32, 
      widthRatio: 0.83, 
      fontSize: 28, 
      lineSpacing: 4, 
      wrap: false, 
      align: 'center',
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
    TEMPLATE: [
      {
        xOffset: 5,
        yOffset: 182,
        fontSize: 17,
        prefixText: '[color=ab5e57]花费：{sun}[/color]'
      },
      {
        xOffset: -10,
        yOffset: 182,
        fontSize: 17,
        align: 'right',
        prefixText: '[color=ab5e57]冷却时间：{cold}[/color]'
      }
    ]
  },
};

export function getAlmanacCardSwitchPosition(side: LibrarySide): AlmanacCardSwitchPosition {
  const pos = ALMANAC_FIELD_LAYOUT[side]?.SKIN?.SWITCH_POSITION;
  return {
    xOffset: pos?.xOffset ?? 0,
    yOffset: pos?.yOffset ?? 0,
  };
}

type DrawArgs = {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  ratio: number;
  image: HTMLImageElement;
  detail?: string;
  side?: LibrarySide;
  fields?: Partial<Record<AlmanacFieldKey, string>>;
  roleName?: string;
  cardMode?: 'role' | 'skin';
  cost?: string;
  cooldown?: string;
  customImageUrl?: string | null;
  startX: number;
  startY: number;
  widthRatio: number;
  autoWrap?: boolean;
  scrollOffsets?: Partial<Record<DrawLayoutKey, number>>;
  onAsyncAssetReady?: () => void;
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

export type AlmanacTemplateVars = {
  sun?: string;
  cold?: string;
};

export function getAlmanacTemplateVars(args: { cost?: string; cooldown?: string }): AlmanacTemplateVars {
  return {
    sun: args.cost ?? '',
    cold: args.cooldown ?? '',
  };
}

export function applyAlmanacTemplateVars(text: string, vars: AlmanacTemplateVars) {
  if (!text) return text;
  const sun = vars.sun ?? '';
  const cold = vars.cold ?? '';
  return text.replaceAll('{sun}', sun).replaceAll('{cold}', cold);
}

type MaskInfo = {
  canvas: HTMLCanvasElement;
  bounds: { x: number; y: number; width: number; height: number };
};

const maskInfoCache = new Map<string, MaskInfo>();
const maskedCompositeCache = new Map<string, HTMLCanvasElement>();

function getMaskUrlBySide(side: LibrarySide) {
  return side === 'zombie' ? ZombieCardMaskUrl : PlantCardMaskUrl;
}

function getMaskInfo(args: { side: LibrarySide; onAsyncAssetReady?: () => void }): MaskInfo | null {
  const url = getMaskUrlBySide(args.side);
  const cached = maskInfoCache.get(url);
  if (cached) return cached;

  const img = getCachedImage(url);
  if (!img) return null;
  if (!img.complete || img.naturalWidth <= 0) {
    if (!imageLoadListenerAttached.has(img)) {
      imageLoadListenerAttached.add(img);
      img.addEventListener('load', () => args.onAsyncAssetReady?.(), { once: true });
    }
    return null;
  }

  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0);

  const d = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = d.data;
  let minX = canvas.width;
  let minY = canvas.height;
  let maxX = -1;
  let maxY = -1;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i] ?? 0;
    const g = data[i + 1] ?? 0;
    const b = data[i + 2] ?? 0;
    const srcA = (data[i + 3] ?? 255) / 255;
    const lum = Math.max(r, g, b);
    const alpha = Math.max(0, Math.min(255, Math.round(lum * srcA)));

    if (alpha > 0) {
      const p = i / 4;
      const x = p % canvas.width;
      const y = Math.floor(p / canvas.width);
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }

    data[i] = 255;
    data[i + 1] = 255;
    data[i + 2] = 255;
    data[i + 3] = alpha;
  }
  ctx.putImageData(d, 0, 0);

  const bounds =
    maxX >= minX && maxY >= minY
      ? { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 }
      : { x: 0, y: 0, width: canvas.width, height: canvas.height };

  const info: MaskInfo = { canvas, bounds };
  try {
    console.log(
      `[mask] side=${args.side} size=${canvas.width}x${canvas.height} nonBlackBounds=${bounds.x},${bounds.y},${bounds.width}x${bounds.height}`
    );
  } catch {
  }
  maskInfoCache.set(url, info);
  return info;
}

function drawMaskedUserImage(args: {
  ctx: CanvasRenderingContext2D;
  userImageUrl: string;
  mask: MaskInfo;
  dest: { x: number; y: number; width: number; height: number };
  alpha?: number;
  onAsyncAssetReady?: () => void;
}) {
  const userImg = getCachedImage(args.userImageUrl);
  if (!userImg) return;
  if (!userImg.complete || userImg.naturalWidth <= 0) {
    if (!imageLoadListenerAttached.has(userImg)) {
      imageLoadListenerAttached.add(userImg);
      userImg.addEventListener('load', () => args.onAsyncAssetReady?.(), { once: true });
    }
    return;
  }

  const key = `${args.mask.canvas.width}x${args.mask.canvas.height}`;
  const composite = maskedCompositeCache.get(key) ?? document.createElement('canvas');
  composite.width = args.mask.canvas.width;
  composite.height = args.mask.canvas.height;
  maskedCompositeCache.set(key, composite);

  const cctx = composite.getContext('2d');
  if (!cctx) return;

  cctx.clearRect(0, 0, composite.width, composite.height);
  cctx.imageSmoothingEnabled = true;
  try {
    (cctx as any).imageSmoothingQuality = 'high';
  } catch {
  }

  const tw = composite.width;
  const th = composite.height;
  const sw = userImg.naturalWidth;
  const sh = userImg.naturalHeight;

  const bounds = args.mask.bounds;
  const bw = Math.max(1, bounds.width);
  const bh = Math.max(1, bounds.height);

  const scale = Math.max(bw / sw, bh / sh);
  const dw = Math.max(0, sw * scale);
  const dh = Math.max(0, sh * scale);

  const cx = bounds.x + bounds.width / 2;
  const cy = bounds.y + bounds.height / 2;
  const x = cx - dw / 2;
  const y = cy - dh / 2;

  cctx.drawImage(userImg, x, y, dw, dh);
  cctx.save();
  cctx.globalCompositeOperation = 'destination-in';
  cctx.drawImage(args.mask.canvas, 0, 0);
  cctx.restore();

  args.ctx.save();
  args.ctx.imageSmoothingEnabled = true;
  try {
    (args.ctx as any).imageSmoothingQuality = 'high';
  } catch {
  }
  if (args.alpha !== undefined) args.ctx.globalAlpha = args.ctx.globalAlpha * args.alpha;
  args.ctx.drawImage(
    composite,
    0,
    0,
    composite.width,
    composite.height,
    args.dest.x,
    args.dest.y,
    args.dest.width,
    args.dest.height
  );
  args.ctx.restore();
}

export function drawAlmanacCard({
  canvas,
  ctx,
  ratio,
  image,
  detail,
  side,
  fields,
  roleName,
  cardMode = 'role',
  cost,
  cooldown,
  customImageUrl,
  startX: cardStartX,
  startY: cardStartY,
  widthRatio,
  autoWrap = false,
  scrollOffsets,
  onAsyncAssetReady,
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

  const layout = ALMANAC_FIELD_LAYOUT[side];

  const rawTemplateLayout = cardMode === 'skin' ? layout.SKIN?.TEMPLATE : layout.TEMPLATE;
  const templateLayouts = Array.isArray(rawTemplateLayout) ? rawTemplateLayout : rawTemplateLayout ? [rawTemplateLayout] : [];
  if (cardMode === 'skin' && templateLayouts.length === 0) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    ctx.beginPath();
    return { scrollbars };
  }

  const templateKeys: DrawLayoutKey[] = templateLayouts.map((_, i) => (i === 0 ? 'TEMPLATE' : (`TEMPLATE_${i}` as const)));

  const order: DrawLayoutKey[] =
    cardMode === 'skin'
      ? (['NAME', 'ACCESS', 'STORY', ...templateKeys] as DrawLayoutKey[])
      : (['NAME', 'EXPRESTION', ...templateKeys, 'HANDBOOK_EXPRESTION', 'HANDBOOK_STORY'] as DrawLayoutKey[]);

  const getLayout = (key: DrawLayoutKey) => {
    if (key === 'TEMPLATE') return templateLayouts[0];
    if (key.startsWith('TEMPLATE_')) {
      const idx = Number(key.slice('TEMPLATE_'.length));
      return Number.isFinite(idx) && idx >= 0 ? templateLayouts[idx] : undefined;
    }
    if (key === 'NAME' || key === 'ACCESS' || key === 'STORY') {
      if (cardMode === 'skin') return layout.SKIN?.[key] ?? layout[key];
      return layout[key];
    }
    if (isAlmanacFieldKey(key)) return layout[key];
    return undefined;
  };
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
    align: 'left' | 'center' | 'right';
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

  const templateVars = getAlmanacTemplateVars({ cost, cooldown });

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
          align: 'left' | 'center' | 'right';
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
      const effectiveAlign = rawLayout.align ?? baseResult?.align ?? base?.align ?? 'left';

      const xOffset =
        rawLayout.xOffset !== undefined ? rawLayout.xOffset * ratio : baseResult?.xOffset ?? (base?.xOffset ?? 0) * ratio;
      const yOffset =
        rawLayout.yOffset !== undefined ? rawLayout.yOffset * ratio : baseResult?.yOffset ?? (base?.yOffset ?? 0) * ratio;

      const x = cardStartX + margin + xOffset;
      let y = cardStartY + margin + yOffset;

      if (baseKey && baseResult) {
        y = baseResult.endY + fontSize + lineSpacing + (rawLayout.gap ?? 0) * ratio + yOffset;
      }

      const isTemplateKey = key === 'TEMPLATE' || key.startsWith('TEMPLATE_');
      const baseText = !isTemplateKey && isAlmanacFieldKey(key) ? (fields[key] ?? '') : '';
      const rawText = `${rawLayout.prefixText ?? ''}${baseText}${rawLayout.suffixText ?? ''}`;
      const text = applyAlmanacTemplateVars(rawText, templateVars);

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
        align: effectiveAlign,
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
        align: effectiveAlign,
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
        align: effectiveAlign,
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

  if (customImageUrl && side) {
    const mask = getMaskInfo({ side, onAsyncAssetReady });
    if (mask) {
      drawMaskedUserImage({
        ctx,
        userImageUrl: customImageUrl,
        mask,
        dest: { x: 0, y: 0, width: canvas.width, height: canvas.height },
        onAsyncAssetReady,
      });
    }
  }

  ctx.beginPath();

  const drawLayoutImage = (layout: DrawFieldLayout | undefined, x: number, y: number, scrollY: number) => {
    const imgLayout = layout?.image;
    if (!imgLayout) return;

    const img = getCachedImage(imgLayout.url);
    if (!img) return;
    if (!img.complete || img.naturalWidth <= 0) {
      if (!imageLoadListenerAttached.has(img)) {
        imageLoadListenerAttached.add(img);
        img.addEventListener(
          'load',
          () => {
            onAsyncAssetReady?.();
          },
          { once: true }
        );
      }
      return;
    }

    const cardScaleX = image.naturalWidth > 0 ? canvas.width / image.naturalWidth : ratio;
    const cardScaleY = image.naturalHeight > 0 ? canvas.height / image.naturalHeight : ratio;

    const w =
      imgLayout.widthRatio !== undefined
        ? imgLayout.widthRatio * canvas.width
        : imgLayout.width !== undefined
          ? imgLayout.width * cardScaleX
          : img.naturalWidth * cardScaleX;
    const h =
      imgLayout.heightRatio !== undefined
        ? imgLayout.heightRatio * canvas.height
        : imgLayout.height !== undefined
          ? imgLayout.height * cardScaleY
          : img.naturalHeight * cardScaleY;

    const dx = (imgLayout.xOffset ?? 0) * cardScaleX;
    const dy = (imgLayout.yOffset ?? 0) * cardScaleY;

    ctx.save();
    if (imgLayout.alpha !== undefined) ctx.globalAlpha = ctx.globalAlpha * imgLayout.alpha;
    ctx.drawImage(img, x + dx, y + dy - scrollY, w, h);
    ctx.restore();
  };

  const drawStandaloneText = (rawLayout: DrawFieldLayout | undefined, baseText: string) => {
    if (!rawLayout) return;
    if (!baseText.trim().length) return;

    const fontSize = (rawLayout.fontSize ?? 16) * ratio;
    const lineSpacing = (rawLayout.lineSpacing ?? 3) * ratio;
    const letterSpacing = (rawLayout.letterSpacing ?? 0) * ratio;
    const effectiveWidthRatio = rawLayout.widthRatio ?? widthRatio;
    const effectiveWrap = rawLayout.wrap ?? true;
    const effectiveAlign = rawLayout.align ?? 'left';

    const xOffset = (rawLayout.xOffset ?? 0) * ratio;
    const yOffset = (rawLayout.yOffset ?? 0) * ratio;

    const x = cardStartX + margin + xOffset;
    const y = cardStartY + margin + yOffset;

    const rawText = `${rawLayout.prefixText ?? ''}${baseText}${rawLayout.suffixText ?? ''}`;
    const text = applyAlmanacTemplateVars(rawText, templateVars);

    ctx.font = `${fontSize}px fzkt, serif`;
    renderAlmanacText({
      ctx,
      text,
      x,
      y,
      fontSize,
      lineSpacing,
      letterSpacing,
      wrap: effectiveWrap,
      align: effectiveAlign,
      maxWidth: effectiveWidthRatio * canvas.width,
    });
  };

  if (cardMode === 'skin') {
    drawStandaloneText(layout.NAME, roleName ?? '');
  }

  for (const key of order) {
    const item = measured.items.get(key);
    if (!item) continue;

    ctx.font = `${item.fontSize}px fzkt, serif`;

    const rawLayout = getLayout(key);
    const scrollRoot = findScrollRoot(key);
    const group = scrollRoot ? measured.groups.get(scrollRoot) : undefined;
    const isScrollable = Boolean(group && activeRoots.has(scrollRoot!));

    if (!isScrollable) {
      drawLayoutImage(rawLayout, item.x, item.y, 0);

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
    drawLayoutImage(rawLayout, item.x, item.y, group!.scroll);
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
