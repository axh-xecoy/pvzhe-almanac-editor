<script lang="ts">
  type Props = {
    csvPath: string | null;
    viewMode: 'almanac' | 'text';
    canSave: boolean;
    canSaveAs: boolean;
    onOpenCsv: () => void;
    onSaveCsv: () => void;
    onSaveCsvAs: () => void;
    onSetViewMode: (next: 'almanac' | 'text') => void;
  };

  let props: Props = $props();
</script>

<div class="topbar">
  <div class="topbar-left">
    <div class="mode-toggle" role="group" aria-label="编辑模式">
      <button
        type="button"
        class="mode-toggle-item {props.viewMode === 'almanac' ? 'active' : ''}"
        onclick={() => props.onSetViewMode('almanac')}
        aria-pressed={props.viewMode === 'almanac'}
      >
        图鉴模式
      </button>
      <button
        type="button"
        class="mode-toggle-item {props.viewMode === 'text' ? 'active' : ''}"
        onclick={() => props.onSetViewMode('text')}
        aria-pressed={props.viewMode === 'text'}
      >
        文本模式
      </button>
    </div>
  </div>

  <div class="topbar-right">
    <div class="path topbar-path">{props.csvPath ?? '未打开文件'}</div>
    <button type="button" class="button" onclick={props.onOpenCsv}>打开文件</button>
    <div class="split-button">
      <button type="button" class="split split-left" onclick={props.onSaveCsv} disabled={!props.canSave}>保存</button>
      <button type="button" class="split split-right" onclick={props.onSaveCsvAs} disabled={!props.canSaveAs}>
        另存为
      </button>
    </div>
  </div>
</div>

<style>
  .topbar {
    height: 50px;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 12px;
    box-sizing: border-box;
    border-bottom: 1px solid rgba(0, 0, 0, 0.12);
    justify-content: space-between;
  }

  .topbar-left {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
  }

  .topbar-right {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 10px;
  }

  .topbar-path {
    max-width: 520px;
    text-align: right;
  }

  .mode-toggle {
    display: inline-flex;
    height: 34px;
    border-radius: 10px;
    overflow: hidden;
    border: 1px solid rgba(0, 0, 0, 0.18);
    background: rgba(255, 255, 255, 0.14);
  }

  .mode-toggle-item {
    height: 34px;
    padding: 0 12px;
    border: 0;
    background: transparent;
    cursor: pointer;
    user-select: none;
    color: rgba(0, 0, 0, 0.65);
    transition:
      background 120ms ease,
      color 120ms ease;
  }

  .mode-toggle-item:hover {
    background: rgba(255, 255, 255, 0.22);
  }

  .mode-toggle-item.active {
    background: var(--dark-bg-color);
    color: white;
  }

  .path {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 12px;
    color: rgba(0, 0, 0, 0.55);
  }

  .split-button {
    display: inline-flex;
    height: 34px;
    border-radius: 10px;
    overflow: hidden;
    border: 1px solid rgba(0, 0, 0, 0.18);
  }

  .split-right {
    border-left: 1px solid rgba(0, 0, 0, 0.18);
  }
</style>
