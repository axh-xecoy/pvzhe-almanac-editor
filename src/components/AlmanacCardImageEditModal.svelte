<script lang="ts">
  import Modal from '@component/Modal.svelte';

  type Props = {
    open: boolean;
    cost: string;
    cooldown: string;
    hideSwitchControls: boolean;
    hasCustomImage: boolean;
    exportError?: string;
    onClose: () => void;
    onCostChange: (next: string) => void;
    onCooldownChange: (next: string) => void;
    onHideSwitchControlsChange: (next: boolean) => void;
    onCustomImageChange: (next: string | null) => void;
    onReset: () => void;
    onSaveImage: () => void | Promise<void>;
  };

  let props: Props = $props();
  let fileInputEl: HTMLInputElement | null = $state(null);
  let saving = $state(false);

  function triggerUpload() {
    if (!fileInputEl) return;
    fileInputEl.value = '';
    fileInputEl.click();
  }

  function onFileInput(e: Event) {
    const el = e.target as HTMLInputElement | null;
    const file = el?.files?.[0] ?? null;
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const url = typeof reader.result === 'string' ? reader.result : null;
      props.onCustomImageChange(url);
    };
    reader.readAsDataURL(file);
  }

  async function onSaveClick() {
    if (saving) return;
    saving = true;
    try {
      await props.onSaveImage();
    } finally {
      saving = false;
    }
  }
</script>

<Modal
  open={props.open}
  ariaLabel="卡牌预览设置"
  closeOnBackdrop={false}
  onClose={props.onClose}
  dialogClass="card-image-dialog"
>
  <div class="body">
    <div class="header">
      <div class="title">卡牌预览设置</div>
      <button type="button" class="close" aria-label="关闭" onclick={props.onClose}>×</button>
    </div>

    <div class="field">
      <div class="label">花费</div>
      <input
        class="input"
        inputmode="numeric"
        value={props.cost}
        placeholder="例如 100"
        oninput={(e) => props.onCostChange((e.target as HTMLInputElement).value)}
      />
    </div>

    <div class="field">
      <div class="label">冷却时间</div>
      <input
        class="input"
        value={props.cooldown}
        placeholder="例如 7.5"
        oninput={(e) => props.onCooldownChange((e.target as HTMLInputElement).value)}
      />
    </div>

    <div class="field">
      <div class="label">上传图片</div>
      <div class="row">
        <button type="button" class="button" onclick={triggerUpload}>选择图片</button>
        <button
          type="button"
          class="button"
          onclick={() => props.onCustomImageChange(null)}
          disabled={!props.hasCustomImage}
        >
          取消图片
        </button>
      </div>

      <input
        bind:this={fileInputEl}
        class="file-input"
        type="file"
        accept="image/*"
        oninput={onFileInput}
      />
    </div>

    <div class="toggle">
      <div class="toggle-label">隐藏切换控件</div>
      <button
        type="button"
        class="toggle-button {props.hideSwitchControls ? 'on' : 'off'}"
        aria-label="隐藏切换控件"
        aria-pressed={props.hideSwitchControls}
        onclick={() => props.onHideSwitchControlsChange(!props.hideSwitchControls)}
      >
        <div class="toggle-thumb"></div>
      </button>
    </div>

    {#if props.exportError}
      <div class="error">{props.exportError}</div>
    {/if}
  </div>

  {#snippet actions()}
    <button type="button" class="button modal-primary" onclick={onSaveClick} disabled={saving}>
      {saving ? '导出中...' : '导出预览'}
    </button>
    <button type="button" class="button" onclick={props.onReset} disabled={saving}>重置</button>
  {/snippet}
</Modal>

<style>
  .body {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding-bottom: 2px;
  }

  .title {
    font-size: 14px;
    font-weight: 800;
    color: rgba(0, 0, 0, 0.72);
  }

  .close {
    width: 28px;
    height: 28px;
    border-radius: 10px;
    border: 1px solid rgba(0, 0, 0, 0.18);
    background: rgba(255, 255, 255, 0.22);
    cursor: pointer;
    user-select: none;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    line-height: 1;
    padding: 0;
  }

  .close:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.34);
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .label {
    font-size: 12px;
    color: rgba(0, 0, 0, 0.66);
  }

  .input {
    height: 32px;
    border-radius: 10px;
    border: 1px solid color-mix(in srgb, var(--dark-bg-color) 55%, transparent);
    padding: 0 10px;
    box-sizing: border-box;
    background: var(--bg-color);
    font-size: 13px;
    color: var(--dark-bg-color);
  }

  .input:hover {
    background: color-mix(in srgb, var(--bg-color) 90%, white 10%);
  }

  .input:focus,
  .input:focus-visible {
    outline: none;
    box-shadow: none;
    border-color: var(--dark-bg-color);
    background: color-mix(in srgb, var(--bg-color) 88%, white 12%);
  }

  .input::placeholder {
    color: color-mix(in srgb, var(--dark-bg-color) 45%, var(--bg-color));
  }

  .row {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
  }

  .row :global(.button) {
    flex: 1;
    min-width: 0;
  }

  .file-input {
    display: none;
  }

  .toggle {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 8px 10px;
    border-radius: 10px;
    border: 1px solid rgba(0, 0, 0, 0.12);
    background: rgba(255, 255, 255, 0.32);
  }

  .toggle-label {
    font-size: 13px;
    font-weight: 700;
    color: rgba(0, 0, 0, 0.65);
  }

  .toggle-button {
    width: 44px;
    height: 24px;
    border-radius: 999px;
    border: 1px solid rgba(0, 0, 0, 0.18);
    background: rgba(255, 255, 255, 0.34);
    padding: 2px;
    box-sizing: border-box;
    cursor: pointer;
    display: flex;
    align-items: center;
    transition: background 120ms ease;
  }

  .toggle-button.on {
    background: color-mix(in srgb, var(--dark-bg-color) 78%, white 22%);
  }

  .toggle-thumb {
    width: 18px;
    height: 18px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.9);
    transform: translateX(0);
    transition: transform 120ms ease;
  }

  .toggle-button.on .toggle-thumb {
    transform: translateX(20px);
  }

  .error {
    font-size: 12px;
    color: #ff3b30;
    background: color-mix(in srgb, #ff3b30 14%, rgba(255, 255, 255, 0.22));
    border: 1px solid color-mix(in srgb, #ff3b30 28%, rgba(0, 0, 0, 0.12));
    padding: 8px 10px;
    border-radius: 10px;
    user-select: text;
  }

  :global(.dialog.card-image-dialog) {
    width: min(420px, calc(100vw - 32px));
  }
</style>
