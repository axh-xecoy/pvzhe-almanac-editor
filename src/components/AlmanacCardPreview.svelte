<script lang="ts">
  import { onMount } from 'svelte';
  import plantCardUrl from '$lib/Almanac_PlantCard.png';
  import zombieCardUrl from '$lib/Almanac_ZombieCard.png';
  import fzktFontUrl from '$lib/fzkt.ttf';
  import {
    drawAlmanacCard,
    getAlmanacCardSwitchPosition,
    type AlmanacCardDrawResult,
    type AlmanacScrollbarRenderInfo,
  } from '@util/drawAlmanacCard';
  import type { AlmanacFieldKey, LibrarySide } from '@util/almanacTypes';

  type Props = {
    side: LibrarySide;
    detail?: string;
    fields?: Partial<Record<AlmanacFieldKey, string>>;
    allowSwitch: boolean;
    hideSwitchControls?: boolean;
    cost?: string;
    cooldown?: string;
    customImageUrl?: string | null;
    roleName?: string;
    cardMode: 'role' | 'skin';
    skinIndex: number;
    skinCount: number;
    onCardModeChange: (next: 'role' | 'skin') => void;
    onSkinIndexChange: (next: number) => void;
    onAddSkin: () => void;
  };

  let props: Props = $props();

  let canvas: HTMLCanvasElement | null = $state(null);
  let ctx: CanvasRenderingContext2D | null = $state(null);
  let ratio = $state(1);
  let drawResult: AlmanacCardDrawResult | null = $state(null);
  let scrollOffsets: Partial<Record<AlmanacScrollbarRenderInfo['key'], number>> = $state({});
  let switchPos = $derived.by(() => getAlmanacCardSwitchPosition(props.side));
  let canPrevSkin = $derived.by(() => props.cardMode === 'skin' && props.skinCount > 0 && props.skinIndex > 0);
  let canNextSkin = $derived.by(
    () => props.cardMode === 'skin' && props.skinCount > 0 && props.skinIndex < props.skinCount - 1
  );
  let showAddSkin = $derived.by(() => props.cardMode === 'skin' && !canNextSkin);
  let showSwitch = $derived.by(() => props.allowSwitch && !props.hideSwitchControls);
  let dragging:
    | null
    | {
        key: AlmanacScrollbarRenderInfo['key'];
        pointerId: number;
        startY: number;
        startScroll: number;
        maxScroll: number;
        thumbTravel: number;
      } = $state(null);

  const plantCard = new Image();
  plantCard.src = plantCardUrl;

  const zombieCard = new Image();
  zombieCard.src = zombieCardUrl;

  const cards = {
    plant: { image: plantCard, startY: 299, startX: 39 / 1.5, widthRatio: 0.83 },
    zombie: { image: zombieCard, startY: 384, startX: 42 / 1.5, widthRatio: 0.83 },
  } as const;

  let fzktLoaded: Promise<void> | null = null;
  function ensureFzktFontLoaded() {
    if (fzktLoaded) return fzktLoaded;
    fzktLoaded = (async () => {
      if (!('fonts' in document)) return;
      const face = new FontFace('fzkt', `url(${fzktFontUrl})`);
      await face.load();
      (document as any).fonts.add(face);
      await (document as any).fonts.ready;
    })();
    return fzktLoaded;
  }

  let queued = false;
  function queueDraw() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      drawNow();
    });
  }

  function syncCanvasSize() {
    if (!canvas) return false;

    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return false;

    const nextRatio = window.devicePixelRatio || 1;
    const nextWidth = Math.floor(rect.width * nextRatio);
    const nextHeight = Math.floor(rect.height * nextRatio);

    if (canvas.width !== nextWidth) canvas.width = nextWidth;
    if (canvas.height !== nextHeight) canvas.height = nextHeight;

    ratio = nextRatio;
    if (!ctx) ctx = canvas.getContext('2d');
    return Boolean(ctx);
  }

  function drawNow() {
    if (!canvas) return;
    if (!syncCanvasSize()) return;
    if (!ctx) return;

    const card = cards[props.side];
    if (!card.image.complete || card.image.naturalWidth === 0) return;

    const r = drawAlmanacCard({
      canvas,
      ctx,
      ratio,
      image: card.image,
      detail: props.detail,
      side: props.side,
      fields: props.fields,
      roleName: props.roleName,
      cardMode: props.cardMode,
      cost: props.cost,
      cooldown: props.cooldown,
      customImageUrl: props.customImageUrl,
      startX: card.startX * ratio,
      startY: card.startY * ratio,
      widthRatio: card.widthRatio,
      scrollOffsets,
      onAsyncAssetReady: queueDraw,
    });
    drawResult = r;

    if (r.scrollbars.length) {
      let changed = false;
      const next = { ...scrollOffsets };
      for (const sb of r.scrollbars) {
        const prev = next[sb.key] ?? 0;
        if (Math.abs(prev - sb.scroll) > 0.5) {
          next[sb.key] = sb.scroll;
          changed = true;
        }
      }
      if (changed) scrollOffsets = next;
    }
  }

  function hitRect(x: number, y: number, r: { x: number; y: number; width: number; height: number }) {
    return x >= r.x && x <= r.x + r.width && y >= r.y && y <= r.y + r.height;
  }

  function clamp(v: number, min: number, max: number) {
    return Math.max(min, Math.min(v, max));
  }

  function setScroll(key: AlmanacScrollbarRenderInfo['key'], next: number) {
    const prev = scrollOffsets[key] ?? 0;
    if (Math.abs(prev - next) <= 0.01) return;
    scrollOffsets = { ...scrollOffsets, [key]: next };
  }

  function onPointerDown(e: PointerEvent) {
    if (!canvas) return;
    if (!syncCanvasSize()) return;
    const x = e.offsetX * ratio;
    const y = e.offsetY * ratio;
    const sb = drawResult?.scrollbars.find((s) => hitRect(x, y, s.track) || hitRect(x, y, s.thumb));
    if (!sb) return;

    canvas.setPointerCapture(e.pointerId);

    const thumbTravel = sb.track.height - sb.thumb.height;
    let startScroll = sb.scroll;
    if (!hitRect(x, y, sb.thumb) && thumbTravel > 0) {
      const targetThumbTop = y - sb.thumb.height / 2;
      const pct = clamp((targetThumbTop - sb.track.y) / thumbTravel, 0, 1);
      startScroll = pct * sb.maxScroll;
      setScroll(sb.key, startScroll);
      queueDraw();
    }

    dragging = {
      key: sb.key,
      pointerId: e.pointerId,
      startY: y,
      startScroll,
      maxScroll: sb.maxScroll,
      thumbTravel: Math.max(0, thumbTravel),
    };
  }

  function onPointerMove(e: PointerEvent) {
    if (!dragging) return;
    if (e.pointerId !== dragging.pointerId) return;
    if (!(dragging.thumbTravel > 0) || !(dragging.maxScroll > 0)) return;

    const y = e.offsetY * ratio;
    const dy = y - dragging.startY;
    const next = clamp(dragging.startScroll + (dy / dragging.thumbTravel) * dragging.maxScroll, 0, dragging.maxScroll);
    setScroll(dragging.key, next);
    queueDraw();
  }

  function onPointerUp(e: PointerEvent) {
    if (!dragging) return;
    if (e.pointerId !== dragging.pointerId) return;
    dragging = null;
    if (canvas) canvas.releasePointerCapture(e.pointerId);
  }

  function onWheel(e: WheelEvent) {
    if (!canvas) return;
    if (!syncCanvasSize()) return;
    if (!drawResult?.scrollbars.length) return;

    const x = (e as any).offsetX * ratio;
    const y = (e as any).offsetY * ratio;
    const target =
      drawResult.scrollbars.find((s) => hitRect(x, y, s.viewport) || hitRect(x, y, s.track) || hitRect(x, y, s.thumb)) ??
      drawResult.scrollbars[0];
    if (!target) return;
    if (!(target.maxScroll > 0)) return;

    e.preventDefault();

    const next = clamp((scrollOffsets[target.key] ?? target.scroll) + e.deltaY * ratio, 0, target.maxScroll);
    setScroll(target.key, next);
    queueDraw();
  }

  export function getCanvasElement() {
    return canvas;
  }

  export function exportPngDataUrl() {
    if (!canvas) return null;
    drawNow();
    return canvas.toDataURL('image/png');
  }

  $effect(() => {
    props.side;
    props.detail;
    props.fields;
    props.cardMode;
    props.roleName;
    props.hideSwitchControls;
    props.cost;
    props.cooldown;
    props.customImageUrl;
    if (!canvas) return;
    queueDraw();
  });

  onMount(() => {
    if (!canvas) return;

    const onResourceReady = () => queueDraw();

    const resizeObserver = new ResizeObserver(onResourceReady);
    resizeObserver.observe(canvas);

    plantCard.addEventListener('load', onResourceReady);
    zombieCard.addEventListener('load', onResourceReady);

    void ensureFzktFontLoaded().then(onResourceReady).catch(() => null);

    queueDraw();

    return () => {
      resizeObserver.disconnect();
      plantCard.removeEventListener('load', onResourceReady);
      zombieCard.removeEventListener('load', onResourceReady);
    };
  });
</script>

<div class="preview">
  <div class="canvas-wrap">
    {#if showSwitch}
      <div class="switch-wrap" style={`left:${switchPos.xOffset}px;top:${switchPos.yOffset}px;`}>
        <div class="switch-nav" aria-label="卡牌切换">
          <button
            type="button"
            class="switch-button switch-nav-button {canPrevSkin ? '' : 'hidden'}"
            aria-label="上一个"
            aria-hidden={!canPrevSkin}
            disabled={!canPrevSkin}
            onclick={() => canPrevSkin && props.onSkinIndexChange(Math.max(0, props.skinIndex - 1))}
          >
            &lt;
          </button>

          <div class="switch-buttons" role="group" aria-label="卡牌类型">
            <button
              type="button"
              class="switch-button {props.cardMode === 'role' ? 'active' : ''}"
              aria-pressed={props.cardMode === 'role'}
              onclick={() => props.onCardModeChange('role')}
            >
              角色卡牌
            </button>
            <button
              type="button"
              class="switch-button {props.cardMode === 'skin' ? 'active' : ''}"
              aria-pressed={props.cardMode === 'skin'}
              onclick={() => props.onCardModeChange('skin')}
            >
              皮肤卡牌
            </button>
          </div>

          <button
            type="button"
            class="switch-button switch-nav-button {props.cardMode === 'role' ? 'hidden' : ''}"
            aria-label={showAddSkin ? '新增皮肤' : '下一个'}
            aria-hidden={props.cardMode === 'role'}
            disabled={props.cardMode === 'role'}
            onclick={() =>
              props.cardMode === 'skin' &&
              (canNextSkin
                ? props.onSkinIndexChange(Math.min(Math.max(0, props.skinCount - 1), props.skinIndex + 1))
                : props.onAddSkin())}
          >
            {showAddSkin ? '+' : '>'}
          </button>
        </div>
      </div>
    {/if}

    <canvas
      bind:this={canvas}
      onpointerdown={onPointerDown}
      onpointermove={onPointerMove}
      onpointerup={onPointerUp}
      onpointercancel={onPointerUp}
      onwheel={onWheel}
    ></canvas>
  </div>
</div>

<style>
  .preview {
    display: flex;
    align-items: center;
    justify-content: center;
    padding-left: 40px;
    padding-right: 30px;
    height: 100%;
  }

  .canvas-wrap {
    position: relative;
    width: 400px;
    height: 625px;
  }

  .switch-wrap {
    position: absolute;
    z-index: 2;
    pointer-events: none;
  }

  .switch-nav {
    display: flex;
    align-items: center;
    gap: 10px;
    pointer-events: auto;
  }

  .switch-buttons {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .switch-button {
    height: 34px;
    padding: 0 12px;
    border-radius: 10px;
    border: 1px solid rgba(0, 0, 0, 0.18);
    background: rgba(255, 255, 255, 0.14);
    cursor: pointer;
    user-select: none;
    color: rgba(0, 0, 0, 0.65);
    transition:
      background 120ms ease,
      color 120ms ease;
  }

  .switch-button:hover {
    background: rgba(255, 255, 255, 0.22);
  }

  .switch-button.active {
    background: var(--dark-bg-color);
    color: white;
  }

  .switch-nav-button {
    width: 34px;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .switch-nav-button.hidden {
    visibility: hidden;
  }

  canvas {
    width: 400px;
    height: 625px;
    touch-action: none;
  }
</style>
