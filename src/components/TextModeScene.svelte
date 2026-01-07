<script lang="ts">
  import AlmanacTextEditor from '@component/AlmanacTextEditor.svelte';

  type Props = {
    csvText: string;
    onCsvTextChange: (next: string) => void;
    editable: boolean;
  };

  let props: Props = $props();

  let editor: any = $state(null);
  let quickFind = $state('');

  function onEditorReady(next: any) {
    editor = next;
  }

  function openFind() {
    try {
      editor?.execCommand?.('find');
    } catch {
    }
  }

  function openReplace() {
    try {
      editor?.execCommand?.('replace');
    } catch {
    }
  }

  function findNext(backwards: boolean) {
    if (!editor) return;
    const needle = quickFind.trim();
    if (!needle) {
      openFind();
      return;
    }
    try {
      editor.find(needle, { backwards, wrap: true, caseSensitive: false, wholeWord: false, regExp: false });
    } catch {
    }
  }
</script>

<div class="text-scene">
  <div class="text-header">
    <div class="text-header-left">
      <input
        class="text-search"
        placeholder="查找（回车下一处 / Shift+回车上一处）"
        value={quickFind}
        oninput={(e) => (quickFind = (e.target as HTMLInputElement).value)}
        onkeydown={(e) => {
          if (e.key !== 'Enter') return;
          e.preventDefault();
          findNext(!!e.shiftKey);
        }}
        disabled={!props.editable}
      />
    </div>
    <div class="text-header-right">
      <button type="button" class="button text-action" onclick={() => findNext(true)} title="上一处" disabled={!props.editable}>
        ↑
      </button>
      <button type="button" class="button text-action" onclick={() => findNext(false)} title="下一处" disabled={!props.editable}>
        ↓
      </button>
      <button type="button" class="button" onclick={openFind} title="查找（Ctrl+F）" disabled={!props.editable}>查找</button>
      <button type="button" class="button" onclick={openReplace} title="替换（Ctrl+H）" disabled={!props.editable}>替换</button>
    </div>
  </div>

  <div class="text-editor">
    <div class="text-editor-inner {props.editable ? '' : 'disabled'}">
      <AlmanacTextEditor
        value={props.csvText}
        mode="almanac"
        fontSize={14}
        showGutter={true}
        wrap={false}
        showScrollbars={true}
        readOnly={!props.editable}
        onReady={onEditorReady}
        onValueChange={(v: string) => {
          if (!props.editable) return;
          props.onCsvTextChange(v);
        }}
      />
    </div>

    {#if !props.editable}
      <div class="text-editor-overlay" aria-label="未打开文件提示">
        <div class="text-editor-overlay-title">未打开文件</div>
        <div class="text-editor-overlay-subtitle">打开 CSV 后即可编辑与保存</div>
      </div>
    {/if}
  </div>
</div>

<style>
  .text-scene {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    padding: 12px;
    box-sizing: border-box;
    gap: 10px;
  }

  .text-header {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 10px;
    align-items: center;
    min-width: 0;
  }

  .text-header-left,
  .text-header-right {
    min-width: 0;
    display: flex;
    align-items: center;
  }

  .text-header-right {
    justify-content: flex-end;
    gap: 10px;
  }

  .text-search {
    width: 100%;
    height: 34px;
    border-radius: 10px;
    border: 1px solid rgba(0, 0, 0, 0.18);
    background: rgba(255, 255, 255, 0.26);
    padding: 0 10px;
    box-sizing: border-box;
    font-size: 13px;
    color: rgba(0, 0, 0, 0.72);
  }

  .text-search::placeholder {
    color: rgba(0, 0, 0, 0.5);
  }

  .text-search:focus,
  .text-search:focus-visible {
    outline: none;
    box-shadow: none;
  }

  .text-action {
    width: 34px;
    padding: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    line-height: 1;
  }

  .text-editor {
    flex: 1;
    min-height: 0;
    border-radius: 14px;
    border: 1px solid rgba(0, 0, 0, 0.18);
    background: rgba(255, 255, 255, 0.16);
    overflow: hidden;
    position: relative;
  }

  .text-editor-inner {
    width: 100%;
    height: 100%;
  }

  .text-editor-inner.disabled {
    pointer-events: none;
    filter: saturate(0.8);
    opacity: 0.7;
  }

  .text-editor-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 6px;
    background: color-mix(in srgb, var(--bg-color) 60%, transparent);
    color: var(--dark-bg-color);
    text-align: center;
    user-select: none;
    pointer-events: all;
    padding: 16px;
    box-sizing: border-box;
  }

  .text-editor-overlay-title {
    font-size: 14px;
    font-weight: 700;
    color: color-mix(in srgb, var(--dark-bg-color) 82%, black 18%);
  }

  .text-editor-overlay-subtitle {
    font-size: 12px;
    color: color-mix(in srgb, var(--dark-bg-color) 70%, transparent);
  }

  :global(.ace_search) {
    background: color-mix(in srgb, var(--bg-color) 65%, white 35%) !important;
    border: 1px solid color-mix(in srgb, var(--dark-bg-color) 50%, transparent) !important;
    color: var(--dark-bg-color) !important;
    border-radius: 10px !important;
  }

  :global(.ace_search input),
  :global(.ace_search select) {
    border-radius: 8px !important;
    border: 1px solid color-mix(in srgb, var(--dark-bg-color) 35%, transparent) !important;
    background: rgba(255, 255, 255, 0.6) !important;
    color: var(--dark-bg-color) !important;
  }

  :global(.ace_searchbtn) {
    border-radius: 8px !important;
    border: 1px solid color-mix(in srgb, var(--dark-bg-color) 35%, transparent) !important;
    background: rgba(255, 255, 255, 0.55) !important;
    color: var(--dark-bg-color) !important;
  }
</style>
