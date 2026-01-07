<script lang="ts">
  import AlmanacCardPreview from '@component/AlmanacCardPreview.svelte';
  import AlmanacEditorPanel from '@component/AlmanacEditorPanel.svelte';
  import AlmanacEntrySelect from '@component/AlmanacEntrySelect.svelte';
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
    previewSide: LibrarySide;
    previewFields: Record<AlmanacFieldKey, string>;
    fields: Record<AlmanacFieldKey, string>;
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
  };

  let props: Props = $props();
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
      <AlmanacCardPreview side={props.previewSide} fields={props.previewFields} />
    </div>
  </div>

  <div class="right">
    <AlmanacEditorPanel
      category={props.category}
      lang={props.lang}
      mode="almanac"
      fields={props.fields}
      onCategoryChange={props.onCategoryChange}
      onLangChange={props.onLangChange}
      onFieldChange={props.onFieldChange}
    />
  </div>

  {#if props.addDialogOpen}
    {#key props.category}
      <div class="modal-backdrop" role="presentation">
        <div
          class="modal"
          role="dialog"
          aria-modal="true"
          aria-label={`新增${props.addDialogCategoryLabel}图鉴条目`}
        >
          <div class="modal-title">新增{props.addDialogCategoryLabel}图鉴条目</div>
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
                  <div class="add-preview-item {props.addDialogKeys.NAME.exists ? 'exists' : ''}">
                    {props.addDialogKeys.NAME.key}
                  </div>
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
          <div class="modal-actions">
            <button type="button" class="button modal-primary" onclick={props.onApplyAddEntry} disabled={!props.canAddEntry}>
              添加
            </button>
            <button type="button" class="button" onclick={props.onCloseAddDialog}>取消</button>
          </div>
        </div>
      </div>
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
    margin-bottom: 12px;
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
</style>
