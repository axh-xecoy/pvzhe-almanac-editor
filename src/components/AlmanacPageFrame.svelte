<script lang="ts">
  import EditorActionBar from '@component/EditorActionBar.svelte';
  import AboutModal from '@component/AboutModal.svelte';
  import AlmanacToolbar from '@component/AlmanacToolbar.svelte';
  import Modal from '@component/Modal.svelte';
  import { onMount } from 'svelte';
  import type { Snippet } from 'svelte';
  import type { LibraryCategory } from '@util/almanacTypes';

  type Props = {
    theme: 'default' | 'zombie';
    category: LibraryCategory;
    csvPath: string | null;
    viewMode: 'almanac' | 'text';
    onOpenPreviewSettings: () => void;
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
  let aboutOpen = $state(false);

  onMount(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const isMod = e.ctrlKey || e.metaKey;
      if (!isMod) return;
      if (e.altKey) return;
      if (props.closeConfirmOpen) return;

      const key = e.key.toLowerCase();
      if (key !== 's') return;

      if (e.shiftKey) {
        if (!props.canSaveAs) return;
        try {
          e.preventDefault();
          e.stopPropagation();
        } catch {
        }
        props.onSaveCsvAs();
        return;
      }

      if (!props.canSave) return;
      try {
        e.preventDefault();
        e.stopPropagation();
      } catch {
      }
      props.onSaveCsv();
    };

    window.addEventListener('keydown', onKeyDown, true);
    return () => {
      window.removeEventListener('keydown', onKeyDown, true);
    };
  });
</script>

<div class="root {props.theme}">
  <AlmanacToolbar category={props.category} onAbout={() => (aboutOpen = true)} />

  {#if props.closeConfirmOpen}
    <Modal
      open={props.closeConfirmOpen}
      ariaLabel="未保存提示"
      title="编辑的内容未保存，是否保存？"
      closeOnBackdrop={false}
      onClose={props.onConfirmCloseCancel}
    >
      {#snippet actions()}
        <button type="button" class="button modal-primary" onclick={props.onConfirmCloseSave} disabled={!props.hasCsv}>
          保存退出
        </button>
        <button type="button" class="button modal-danger" onclick={props.onConfirmCloseDiscard}>不保存退出</button>
        <button type="button" class="button" onclick={props.onConfirmCloseCancel}>取消</button>
      {/snippet}
    </Modal>
  {/if}

  <AboutModal open={aboutOpen} onClose={() => (aboutOpen = false)} />

  <EditorActionBar
    csvPath={props.csvPath}
    viewMode={props.viewMode}
    canSave={props.canSave}
    canSaveAs={props.canSaveAs}
    onOpenCsv={props.onOpenCsv}
    onSaveCsv={props.onSaveCsv}
    onSaveCsvAs={props.onSaveCsvAs}
    onSetViewMode={props.onSetViewMode}
    onOpenPreviewSettings={props.onOpenPreviewSettings}
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
    --bg-color: #f9c68b;
    --dark-bg-color: #8f431b;
  }

  .root.zombie {
    --bg-color: #b9aed8;
    --dark-bg-color: #5f6181;
  }

  :global(:where(.button, .split)) {
    outline: none;
  }

  :global(button) {
    color: rgba(0, 0, 0, 0.65);
  }

  :global(.button) {
    height: 34px;
    padding: 0 12px;
    border-radius: 10px;
    border: 1px solid rgba(0, 0, 0, 0.18);
    background: rgba(255, 255, 255, 0.26);
    color: rgba(0, 0, 0, 0.65);
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
    color: rgba(0, 0, 0, 0.65);
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
  :global(.modal-primary) {
    background: rgba(255, 255, 255, 0.55);
  }

  :global(.modal-danger) {
    background: color-mix(in srgb, #ff3b30 22%, rgba(255, 255, 255, 0.26));
  }
</style>
