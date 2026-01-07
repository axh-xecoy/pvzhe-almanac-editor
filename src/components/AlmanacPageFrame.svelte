<script lang="ts">
  import EditorActionBar from '@component/EditorActionBar.svelte';
  import AlmanacToolbar from '@component/AlmanacToolbar.svelte';
  import type { Snippet } from 'svelte';
  import type { LibraryCategory } from '@util/almanacTypes';

  type Props = {
    theme: 'default' | 'zombie';
    category: LibraryCategory;
    csvPath: string | null;
    viewMode: 'almanac' | 'text';
    closeConfirmOpen: boolean;
    hasCsv: boolean;
    canSave: boolean;
    canSaveAs: boolean;
    onOpenCsv: () => void;
    onSaveCsv: () => void;
    onSaveCsvAs: () => void;
    onSetViewMode: (next: 'almanac' | 'text') => void;
    onConfirmCloseSave: () => void;
    onConfirmCloseDiscard: () => void;
    onConfirmCloseCancel: () => void;
    children?: Snippet;
  };

  let props: Props = $props();
</script>

<div class="root {props.theme}">
  <AlmanacToolbar category={props.category} />

  {#if props.closeConfirmOpen}
    <div class="modal-backdrop" role="presentation">
      <div class="modal" role="dialog" aria-modal="true" aria-label="未保存提示">
        <div class="modal-title">编辑的内容未保存，是否保存？</div>
        <div class="modal-actions">
          <button type="button" class="button modal-primary" onclick={props.onConfirmCloseSave} disabled={!props.hasCsv}>
            保存退出
          </button>
          <button type="button" class="button modal-danger" onclick={props.onConfirmCloseDiscard}>不保存退出</button>
          <button type="button" class="button" onclick={props.onConfirmCloseCancel}>取消</button>
        </div>
      </div>
    </div>
  {/if}

  <EditorActionBar
    csvPath={props.csvPath}
    viewMode={props.viewMode}
    canSave={props.canSave}
    canSaveAs={props.canSaveAs}
    onOpenCsv={props.onOpenCsv}
    onSaveCsv={props.onSaveCsv}
    onSaveCsvAs={props.onSaveCsvAs}
    onSetViewMode={props.onSetViewMode}
  />

  {@render props.children?.()}
</div>

<style>
  .root {
    height: 100vh;
    width: 100vw;
    display: flex;
    flex-direction: column;
    background: var(--bg-color);
    border-radius: 0.5rem;
    overflow: hidden;
  }

  .root.default {
    --bg-color: #fdc689;
    --dark-bg-color: #8f431b;
  }

  .root.zombie {
    --bg-color: #b9aed8;
    --dark-bg-color: #5f6181;
  }

  :global(:where(.button, .split)) {
    outline: none;
  }

  :global(.button) {
    height: 34px;
    padding: 0 12px;
    border-radius: 10px;
    border: 1px solid rgba(0, 0, 0, 0.18);
    background: rgba(255, 255, 255, 0.26);
    cursor: pointer;
    user-select: none;
    transition:
      background 120ms ease,
      transform 60ms ease,
      box-shadow 120ms ease;
  }

  :global(.button:hover:not(:disabled)) {
    background: rgba(255, 255, 255, 0.34);
  }

  :global(.button:active:not(:disabled)) {
    transform: translateY(1px);
    background: rgba(255, 255, 255, 0.42);
  }

  :global(.button:focus-visible:not(:disabled)) {
    box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.18);
  }

  :global(.button:disabled) {
    opacity: 0.5;
    cursor: default;
  }

  :global(.split) {
    height: 34px;
    padding: 0 12px;
    border: 0;
    background: rgba(255, 255, 255, 0.22);
    cursor: pointer;
    user-select: none;
    transition:
      background 120ms ease,
      transform 60ms ease,
      box-shadow 120ms ease;
  }

  :global(.split:hover:not(:disabled)) {
    background: rgba(255, 255, 255, 0.32);
  }

  :global(.split:active:not(:disabled)) {
    transform: translateY(1px);
    background: rgba(255, 255, 255, 0.42);
  }

  :global(.split:focus-visible:not(:disabled)) {
    box-shadow: inset 0 0 0 3px rgba(0, 0, 0, 0.18);
  }

  :global(.split:disabled) {
    opacity: 0.5;
    cursor: default;
  }

  .modal-backdrop {
    position: fixed;
    inset: 0;
    z-index: 50;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 18px;
    background: rgba(0, 0, 0, 0.35);
  }

  .modal {
    width: min(520px, calc(100vw - 36px));
    border-radius: 14px;
    border: 1px solid rgba(0, 0, 0, 0.18);
    background: color-mix(in srgb, var(--bg-color) 78%, white 22%);
    padding: 14px;
    box-sizing: border-box;
  }

  .modal-title {
    font-size: 14px;
    font-weight: 700;
    color: rgba(0, 0, 0, 0.72);
    margin-bottom: 12px;
  }

  .modal-actions {
    display: flex;
    gap: 10px;
    justify-content: flex-end;
  }

  .modal-primary {
    background: rgba(255, 255, 255, 0.55);
  }

  .modal-danger {
    background: color-mix(in srgb, #ff3b30 22%, rgba(255, 255, 255, 0.26));
  }
</style>
