<script lang="ts">
  import { getCurrentWindow } from '@tauri-apps/api/window';
  import type { LibraryCategory } from '@util/almanacTypes';

  type Props = {
    category: LibraryCategory;
  };

  let { category }: Props = $props();

  async function minimizeWindow() {
    await getCurrentWindow().minimize();
  }

  async function closeWindow() {
    await getCurrentWindow().close();
  }
</script>

<header class="toolbar" data-tauri-drag-region>
  <div class="left">
    <div class="title">pvzHE图鉴编辑器</div>
    <div class="chip">
      {category === 'plant' ? '植物' : category === 'zombie' ? '僵尸' : '道具'}
    </div>
  </div>

  <div class="right">
    <button type="button" class="mini-button" onclick={minimizeWindow} title="最小化窗口">
      ━
    </button>
    <button type="button" class="mini-button" onclick={closeWindow} title="关闭窗口">
      ✖
    </button>
  </div>
</header>

<style>
  .toolbar {
    width: 100%;
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 14px;
    box-sizing: border-box;
    background: var(--dark-bg-color);
    border-bottom: 1px solid rgba(0, 0, 0, 0.12);
    user-select: none;
  }

  .left,
  .right {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .title {
    color: white;
    font-size: 14px;
    font-weight: 600;
  }

  .chip {
    padding: 2px 8px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.16);
    color: white;
    font-size: 12px;
  }

  .mini-button {
    height: 28px;
    min-width: 28px;
    padding: 0 8px;
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.18);
    background: rgba(255, 255, 255, 0.06);
    color: white;
    cursor: pointer;
  }

  .mini-button:hover {
    background: rgba(255, 255, 255, 0.12);
  }
</style>
