<script lang="ts">
  import { onMount } from 'svelte';
  import type { Snippet } from 'svelte';

  type Props = {
    open: boolean;
    ariaLabel: string;
    title?: string;
    closeOnBackdrop?: boolean;
    closeOnDialog?: boolean;
    closeOnEscape?: boolean;
    dialogClass?: string;
    onClose: () => void;
    children?: Snippet;
    actions?: Snippet;
  };

  let props: Props = $props();
  let dialogEl: HTMLDivElement | null = null;

  function close() {
    try {
      props.onClose();
    } catch {
    }
  }

  function onBackdropClick() {
    if (props.closeOnBackdrop === false) return;
    close();
  }

  function onBackdropKeyDown(e: KeyboardEvent) {
    if (e.key !== 'Escape') return;
    if (props.closeOnEscape === false) return;
    close();
  }

  function onDialogKeyDown(e: KeyboardEvent) {
    if (e.key !== 'Escape') return;
    if (props.closeOnEscape === false) return;
    try {
      e.stopPropagation();
    } catch {
    }
    close();
  }

  function onDialogClick(e: MouseEvent) {
    if (props.closeOnDialog) {
      close();
      return;
    }
    try {
      e.stopPropagation();
    } catch {
    }
  }

  $effect(() => {
    if (!props.open) return;
    queueMicrotask(() => dialogEl?.focus());
  });

  onMount(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!props.open) return;
      if (e.key !== 'Escape') return;
      if (props.closeOnEscape === false) return;
      close();
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  });
</script>

{#if props.open}
  <div class="backdrop" role="presentation" onclick={onBackdropClick} onkeydown={onBackdropKeyDown}>
    <div
      bind:this={dialogEl}
      class="dialog {props.dialogClass || ''}"
      role="dialog"
      aria-modal="true"
      aria-label={props.ariaLabel}
      tabindex="-1"
      onclick={onDialogClick}
      onkeydown={onDialogKeyDown}
    >
      {#if props.title}
        <div class="title">{props.title}</div>
      {/if}

      {@render props.children?.()}

      {#if props.actions}
        <div class="actions">
          {@render props.actions()}
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    z-index: 50;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    background: rgba(0, 0, 0, 0.35);
  }

  .dialog {
    width: min(380px, calc(100vw - 32px));
    border-radius: 14px;
    border: 1px solid rgba(0, 0, 0, 0.18);
    background: color-mix(in srgb, var(--bg-color) 78%, white 22%);
    padding: 14px;
    box-sizing: border-box;
    outline: none;
  }

  .title {
    font-size: 14px;
    font-weight: 800;
    color: rgba(0, 0, 0, 0.72);
    margin-bottom: 10px;
  }

  .actions {
    margin-top: 12px;
    display: flex;
    gap: 10px;
    justify-content: flex-end;
  }
</style>
