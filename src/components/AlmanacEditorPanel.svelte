<script lang="ts">
  import AlmanacTextEditor from '@component/AlmanacTextEditor.svelte';
  import type { AlmanacFieldKey, LibraryCategory } from '@util/almanacTypes';

  type Props = {
    category: LibraryCategory;
    lang: 'zh' | 'en' | 'es';
    mode: 'almanac' | 'field';
    fields: Record<AlmanacFieldKey, string>;
    onCategoryChange: (category: LibraryCategory) => void;
    onLangChange: (lang: 'zh' | 'en' | 'es') => void;
    onFieldChange: (field: AlmanacFieldKey, value: string) => void;
  };

  let props: Props = $props();
</script>

<div class="panel-wrap">
  <div class="ears">
    <div class="ear-group">
      <button
        type="button"
        class="ear {props.category === 'plant' ? 'active' : ''}"
        onclick={() => props.onCategoryChange('plant')}
      >
        植物
      </button>
      <button
        type="button"
        class="ear {props.category === 'zombie' ? 'active' : ''}"
        onclick={() => props.onCategoryChange('zombie')}
      >
        僵尸
      </button>
      <button
        type="button"
        class="ear {props.category === 'shovel' ? 'active' : ''}"
        onclick={() => props.onCategoryChange('shovel')}
      >
        铲子
      </button>
      <button
        type="button"
        class="ear {props.category === 'mower' ? 'active' : ''}"
        onclick={() => props.onCategoryChange('mower')}
      >
        小推车
      </button>
    </div>

    <div class="ear-group">
      <button type="button" class="ear {props.lang === 'zh' ? 'active' : ''}" onclick={() => props.onLangChange('zh')}>
        中文
      </button>
      <button type="button" class="ear {props.lang === 'en' ? 'active' : ''}" onclick={() => props.onLangChange('en')}>
        英文
      </button>
      <button type="button" class="ear {props.lang === 'es' ? 'active' : ''}" onclick={() => props.onLangChange('es')}>
        西班牙语
      </button>
    </div>
  </div>

  <div class="panel">
    <div class="panel-body">
      <div class="inputs">
        <div class="field">
          <div class="label">NAME</div>
          <div class="editor-box editor-box-small">
            <AlmanacTextEditor
              value={props.fields.NAME}
              mode={props.mode === 'almanac' ? 'almanac' : 'text'}
              onValueChange={(v: string) => props.onFieldChange('NAME', v)}
            />
          </div>
        </div>

        <div class="field">
          <div class="label">EXPRESTION</div>
          <div class="editor-box editor-box-middle">
            <AlmanacTextEditor
              value={props.fields.EXPRESTION}
              mode={props.mode === 'almanac' ? 'almanac' : 'text'}
              onValueChange={(v: string) => props.onFieldChange('EXPRESTION', v)}
            />
          </div>
        </div>

        <div class="field">
          <div class="label">HANDBOOK_EXPRESTION</div>
          <div class="editor-box editor-box-large">
            <AlmanacTextEditor
              value={props.fields.HANDBOOK_EXPRESTION}
              mode={props.mode === 'almanac' ? 'almanac' : 'text'}
              onValueChange={(v: string) => props.onFieldChange('HANDBOOK_EXPRESTION', v)}
            />
          </div>
        </div>

        <div class="field">
          <div class="label">HANDBOOK_STORY</div>
          <div class="editor-box editor-box-middle">
            <AlmanacTextEditor
              value={props.fields.HANDBOOK_STORY}
              mode={props.mode === 'almanac' ? 'almanac' : 'text'}
              onValueChange={(v: string) => props.onFieldChange('HANDBOOK_STORY', v)}
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  :where(.ear) {
    outline: none;
  }

  .panel-wrap {
    flex: 1;
    min-height: 0;
    position: relative;
    padding-top: 28px;
  }

  .panel {
    height: 100%;
    border-radius: 14px;
    border: 1px solid rgba(0, 0, 0, 0.18);
    background: rgba(255, 255, 255, 0.16);
    overflow: hidden;
    margin-top: -1px;
  }

  .ears {
    position: absolute;
    top: 0;
    left: 12px;
    right: 12px;
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    pointer-events: none;
    z-index: 2;
  }

  .ear-group {
    display: flex;
    gap: 8px;
    pointer-events: auto;
  }

  .ear {
    height: 28px;
    padding: 0 12px;
    border-radius: 10px 10px 0 0;
    border: 1px solid rgba(0, 0, 0, 0.18);
    border-bottom: 0;
    background: transparent;
    cursor: pointer;
    user-select: none;
    margin-bottom: -1px;
    color: rgba(0, 0, 0, 0.65);
  }

  .ear:hover {
    background: rgba(255, 255, 255, 0.22);
  }

  .ear.active {
    background: rgba(0, 0, 0, 0.18);
    color: white;
  }

  .panel-body {
    height: 100%;
    padding: 12px;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }

  .inputs {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
    overflow: auto;
    padding-right: 6px;
    scrollbar-width: none;
    -ms-overflow-style: none;
  }

  .inputs::-webkit-scrollbar {
    width: 0;
    height: 0;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .label {
    font-size: 12px;
    font-weight: 600;
    color: rgba(0, 0, 0, 0.55);
  }

  .editor-box {
    width: 100%;
    background: rgba(255, 255, 255, 0.32);
    box-sizing: border-box;
    overflow: hidden;
    border-radius: 0;
    min-width: 0;
    min-height: 0;
  }

  .editor-box-small {
    height: 32px;
  }

  .editor-box-middle {
    height: 117px;
  }

  .editor-box-large {
    height: 240px;
  }

  .editor-box:focus-within {
    background: rgba(255, 255, 255, 0.46);
  }
</style>
