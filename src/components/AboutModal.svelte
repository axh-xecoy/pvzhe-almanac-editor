<script lang="ts">
  import { openUrl } from '@tauri-apps/plugin-opener';
  import type { Snippet } from 'svelte';
  import Modal from '@component/Modal.svelte';
  import logoUrl from '$lib/logo.png';
  import { versions } from '../version.js';

  type Props = {
    open: boolean;
    onClose: () => void;
    actions?: Snippet;
  };

  let props: Props = $props();

  function getAppVersionText() {
    const list = Array.isArray(versions) ? versions : [];
    const v = list.map((x) => Number(x) || 0).join('.');
    return `v${v || '0.0.0'}`;
  }

  async function openExternal(url: string) {
    try {
      await openUrl(url);
      return;
    } catch {
    }
    try {
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch {
    }
  }

  function onAuthorClick(e: MouseEvent) {
    try {
      e.stopPropagation();
    } catch {
    }
    void openExternal('https://space.bilibili.com/1447962088');
  }
</script>

<Modal open={props.open} ariaLabel="关于" dialogClass="about-dialog" onClose={props.onClose}>
  <div class="about">
    <div class="about-title">关于软件</div>

    <div class="about-hero">
      <img class="about-logo" src={logoUrl} alt="logo" />
      <div class="about-name-en">pvzHE Almanac Editor</div>
      <div class="about-name-zh">植物大战僵尸杂交版图鉴编辑器</div>
      <div class="about-version">版本 {getAppVersionText()}</div>
    </div>

    <button type="button" class="about-card about-card-button" onclick={onAuthorClick}>
      <div class="about-row">
        <div class="about-tag">作者</div>
        <div class="about-value about-link">七弦</div>
      </div>
    </button>

    <div class="about-foot">Copyright © op@xecoy.com</div>
  </div>
</Modal>

<style>
  
  .about {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 18px;
  }

  .about-title {
    font-size: 18px;
    font-weight: 900;
    color: rgba(0, 0, 0, 0.8);
    letter-spacing: 0.06em;
  }

  .about-hero {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    padding: 10px 8px 4px;
  }

  .about-logo {
    width: 104px;
    height: 104px;
    border-radius: 0;
    object-fit: contain;
    background: transparent;
    filter: drop-shadow(0 10px 22px rgba(0, 0, 0, 0.16));
  }

  .about-name-en {
    font-size: 24px;
    font-weight: 900;
    color: rgba(0, 0, 0, 0.78);
    line-height: 1.1;
  }

  .about-name-zh {
    font-size: 14px;
    font-weight: 800;
    color: rgba(0, 0, 0, 0.6);
    line-height: 1.35;
  }

  .about-version {
    font-size: 13px;
    font-weight: 800;
    color: rgba(0, 0, 0, 0.5);
  }

  .about-card {
    width: min(360px, 100%);
    max-width: 100%;
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 14px 14px;
    box-sizing: border-box;
    border-radius: 14px;
    border: 1px solid rgba(0, 0, 0, 0.1);
    background: rgba(255, 255, 255, 0.25);
  }

  .about-card-button {
    cursor: pointer;
    user-select: none;
    border: 1px solid rgba(0, 0, 0, 0.1);
    text-align: inherit;
    transition:
      background 120ms ease,
      transform 60ms ease,
      box-shadow 120ms ease;
  }

  .about-card-button:hover {
    background: rgba(255, 255, 255, 0.34);
    box-shadow: 0 10px 22px rgba(0, 0, 0, 0.08);
  }

  .about-card-button:active {
    transform: translateY(1px);
  }

  .about-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    width: 100%;
  }

  .about-tag {
    flex: 0 0 auto;
    padding: 6px 10px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 900;
    color: color-mix(in srgb, var(--dark-bg-color) 65%, black 35%);
    background: color-mix(in srgb, var(--bg-color) 65%, white 35%);
  }

  .about-value {
    min-width: 0;
    font-size: 14px;
    font-weight: 900;
    color: rgba(0, 0, 0, 0.72);
    text-align: left;
  }

  .about-link {
    border: 0;
    background: transparent;
    padding: 0;
    margin: 0;
    cursor: pointer;
    text-decoration: underline;
    text-decoration-color: color-mix(in srgb, rgba(0, 0, 0, 0.72) 55%, transparent);
    text-underline-offset: 3px;
  }

  .about-link:hover {
    color: color-mix(in srgb, var(--dark-bg-color) 78%, black 22%);
    text-decoration-color: color-mix(in srgb, var(--dark-bg-color) 55%, transparent);
  }

  .about-foot {
    font-size: 12px;
    color: rgba(0, 0, 0, 0.45);
  }
</style>
