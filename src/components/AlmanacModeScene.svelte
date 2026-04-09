<script lang="ts">
  import AlmanacCardPreview from '@component/AlmanacCardPreview.svelte';
  import AlmanacCardImageEditModal from '@component/AlmanacCardImageEditModal.svelte';
  import AlmanacEditorPanel from '@component/AlmanacEditorPanel.svelte';
  import AlmanacEntrySelect from '@component/AlmanacEntrySelect.svelte';
  import Modal from '@component/Modal.svelte';
  import { invoke } from '@tauri-apps/api/core';
  import type { AlmanacFieldKey, LibraryCategory, LibrarySide } from '@util/almanacTypes';

  type AddDialogKeys = {
    NAME: { key: string; exists: boolean };
    EXPRESTION: { key: string; exists: boolean };
    HANDBOOK_EXPRESTION: { key: string; exists: boolean };
    HANDBOOK_STORY: { key: string; exists: boolean };
  };

  type Props = {
    category: LibraryCategory;
    lang: 'zh' | 'en' | 'es';
    entryOptions: { id: string; label: string; prefix: string }[];
    entryId: string;
    entryPrefix: string;
    addDisabled: boolean;
    allowSwitch: boolean;
    roleName?: string;
    previewSide: LibrarySide;
    previewFields?: Partial<Record<AlmanacFieldKey, string>>;
    fields: Record<AlmanacFieldKey, string>;
    cardMode: 'role' | 'skin';
    skinIndex: number;
    skinCount: number;
    onCardModeChange: (next: 'role' | 'skin') => void;
    onSkinIndexChange: (next: number) => void;
    onAddSkin: () => void;
    onSelectEntry: (id: string, prefix: string) => void;
    onOpenAddDialog: () => void;
    onCategoryChange: (next: LibraryCategory) => void;
    onLangChange: (next: 'zh' | 'en' | 'es') => void;
    onFieldChange: (field: AlmanacFieldKey, value: string) => void;
    addDialogOpen: boolean;
    addDialogCategoryLabel: string;
    addDialogId: string;
    addDialogIdPlaceholder: string;
    addDialogKeys: AddDialogKeys | null;
    canAddEntry: boolean;
    onAddDialogIdChange: (next: string) => void;
    onApplyAddEntry: () => void;
    onCloseAddDialog: () => void;
    previewSettingsOpen: boolean;
    onClosePreviewSettings: () => void;
  };

  let props: Props = $props();

  type CardImageEditState = {
    cost: string;
    cooldown: string;
    customImageUrl: string | null;
    hideSwitchControls: boolean;
  };

  const editStateByKey = new Map<string, CardImageEditState>();
  let imageEditOpen = $state(false);
  let cost = $state('NaN');
  let cooldown = $state('NaN');
  let customImageUrl: string | null = $state(null);
  let hideSwitchControls = $state(false);
  let previewRef: any = $state(null);
  let exportError = $state<string | null>(null);

  const currentEditKey = $derived.by(
    () => `${props.entryPrefix}:${props.entryId}:${props.cardMode}:${props.skinIndex}`
  );

  $effect(() => {
    const saved = editStateByKey.get(currentEditKey);
    if (saved) {
      cost = saved.cost;
      cooldown = saved.cooldown;
      customImageUrl = saved.customImageUrl;
      hideSwitchControls = saved.hideSwitchControls;
      return;
    }
    cost = 'NaN';
    cooldown = 'NaN';
    customImageUrl = null;
    hideSwitchControls = false;
  });

  $effect(() => {
    editStateByKey.set(currentEditKey, { cost, cooldown, customImageUrl, hideSwitchControls });
  });

  $effect(() => {
    imageEditOpen = props.previewSettingsOpen;
  });

  function closeImageEditDialog() {
    imageEditOpen = false;
    props.onClosePreviewSettings();
  }

  function resetPreviewSettings() {
    cost = 'NaN';
    cooldown = 'NaN';
    customImageUrl = null;
    hideSwitchControls = false;
  }

  async function saveCurrentCanvasAsPng() {
    exportError = null;
    const dataUrl: string | null = previewRef?.exportPngDataUrl?.() ?? null;
    if (!dataUrl) {
      exportError = '导出失败：无法获取当前画面';
      return;
    }
    const base64 = dataUrl.split(',')[1] ?? '';
    if (!base64) {
      exportError = '导出失败：图片数据为空';
      return;
    }
    try {
      await invoke<string | null>('save_png_file_as', { contentBase64: base64 });
    } catch (e) {
      const msg = String((e as any)?.message ?? e ?? '');
      if (/unknown (ipc )?command/i.test(msg) || /not allowed/i.test(msg)) {
        exportError = `导出失败：${msg}（需要重启应用后生效）`;
        return;
      }
      exportError = `导出失败：${msg || '未知错误'}`;
    }
  }
</script>

<div class="content">
  <div class="left">
    <div class="left-top">
      <AlmanacEntrySelect
        options={props.entryOptions}
        selectedId={props.entryId}
        selectedPrefix={props.entryPrefix}
        addDisabled={props.addDisabled}
        onAdd={props.onOpenAddDialog}
        onSelect={props.onSelectEntry}
      />
    </div>

    <div class="left-bottom">
      <AlmanacCardPreview
        bind:this={previewRef}
        side={props.previewSide}
        fields={props.previewFields}
        allowSwitch={props.allowSwitch}
        {hideSwitchControls}
        {cost}
        {cooldown}
        {customImageUrl}
        roleName={props.roleName}
        cardMode={props.cardMode}
        skinIndex={props.skinIndex}
        skinCount={props.skinCount}
        onCardModeChange={props.onCardModeChange}
        onSkinIndexChange={props.onSkinIndexChange}
        onAddSkin={props.onAddSkin}
      />
    </div>
  </div>

  <div class="right">
    <AlmanacEditorPanel
      category={props.category}
      lang={props.lang}
      mode="almanac"
      fields={props.fields}
      cardMode={props.cardMode}
      onCategoryChange={props.onCategoryChange}
      onLangChange={props.onLangChange}
      onFieldChange={props.onFieldChange}
    />
  </div>

  <AlmanacCardImageEditModal
    open={imageEditOpen}
    {cost}
    {cooldown}
    {hideSwitchControls}
    hasCustomImage={Boolean(customImageUrl)}
    exportError={exportError ?? undefined}
    onClose={closeImageEditDialog}
    onCostChange={(next) => (cost = next)}
    onCooldownChange={(next) => (cooldown = next)}
    onHideSwitchControlsChange={(next) => (hideSwitchControls = next)}
    onCustomImageChange={(next) => (customImageUrl = next)}
    onReset={resetPreviewSettings}
    onSaveImage={saveCurrentCanvasAsPng}
  />

  {#if props.addDialogOpen}
    {#key props.category}
      <Modal
        open={props.addDialogOpen}
        ariaLabel={`新增${props.addDialogCategoryLabel}图鉴条目`}
        title={`新增${props.addDialogCategoryLabel}图鉴条目`}
        closeOnBackdrop={false}
        onClose={props.onCloseAddDialog}
      >
        <div class="add-body">
          <div class="add-field">
            <div class="add-label">ID</div>
            <input
              class="add-input"
              value={props.addDialogId}
              oninput={(e) => props.onAddDialogIdChange((e.target as HTMLInputElement).value)}
              placeholder={props.addDialogIdPlaceholder}
            />
          </div>
          {#if props.addDialogKeys}
            <div class="add-preview">
              <div class="add-preview-title">将生成的 Key：</div>
              <div class="add-preview-list">
                <div class="add-preview-item {props.addDialogKeys.NAME.exists ? 'exists' : ''}">{props.addDialogKeys.NAME.key}</div>
                <div class="add-preview-item {props.addDialogKeys.EXPRESTION.exists ? 'exists' : ''}">
                  {props.addDialogKeys.EXPRESTION.key}
                </div>
                <div class="add-preview-item {props.addDialogKeys.HANDBOOK_EXPRESTION.exists ? 'exists' : ''}">
                  {props.addDialogKeys.HANDBOOK_EXPRESTION.key}
                </div>
                <div class="add-preview-item {props.addDialogKeys.HANDBOOK_STORY.exists ? 'exists' : ''}">
                  {props.addDialogKeys.HANDBOOK_STORY.key}
                </div>
              </div>
            </div>
          {/if}
        </div>

        {#snippet actions()}
          <button type="button" class="button modal-primary" onclick={props.onApplyAddEntry} disabled={!props.canAddEntry}>
            添加
          </button>
          <button type="button" class="button" onclick={props.onCloseAddDialog}>取消</button>
        {/snippet}
      </Modal>
    {/key}
  {/if}
</div>

<style>
  .content {
    flex: 1;
    width: 100%;
    display: flex;
    align-items: stretch;
    justify-content: center;
    overflow: hidden;
  }

  .left {
    width: 450px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    border-right: 1px solid rgba(0, 0, 0, 0.12);
    padding: 12px 0;
    box-sizing: border-box;
  }

  .left-top {
    display: flex;
    justify-content: center;
  }

  .left-bottom {
    height: 625px;
  }

  .right {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    padding: 12px;
    box-sizing: border-box;
    gap: 10px;
  }

  .add-body {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .add-field {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .add-label {
    font-size: 12px;
    color: rgba(0, 0, 0, 0.66);
  }

  .add-input {
    height: 32px;
    border-radius: 10px;
    border: 1px solid color-mix(in srgb, var(--dark-bg-color) 55%, transparent);
    padding: 0 10px;
    box-sizing: border-box;
    background: var(--bg-color);
    font-size: 13px;
    color: var(--dark-bg-color);
  }

  .add-input:hover {
    background: color-mix(in srgb, var(--bg-color) 90%, white 10%);
  }

  .add-input:focus,
  .add-input:focus-visible {
    outline: none;
    box-shadow: none;
    border-color: var(--dark-bg-color);
    background: color-mix(in srgb, var(--bg-color) 88%, white 12%);
  }

  .add-input::placeholder {
    color: color-mix(in srgb, var(--dark-bg-color) 45%, var(--bg-color));
  }

  .add-preview {
    border-radius: 10px;
    border: 1px solid rgba(0, 0, 0, 0.12);
    background: rgba(255, 255, 255, 0.42);
    padding: 8px 10px;
    box-sizing: border-box;
  }

  .add-preview-title {
    font-size: 12px;
    margin-bottom: 4px;
    color: rgba(0, 0, 0, 0.7);
  }

  .add-preview-list {
    display: flex;
    flex-direction: column;
    gap: 2px;
    font-size: 12px;
  }

  .add-preview-item {
    color: var(--dark-bg-color);
    word-break: break-all;
  }

  .add-preview-item.exists {
    color: #ff3b30;
  }
</style>
