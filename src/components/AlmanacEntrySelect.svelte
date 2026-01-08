<script lang="ts">
  import { onMount, tick } from 'svelte';

  type Option = { id: string; label: string; prefix: string };

  type Props = {
    options: Option[];
    selectedId: string;
    selectedPrefix: string;
    onSelect: (id: string, prefix: string) => void;
    onAdd?: () => void;
    addDisabled?: boolean;
  };

  let props: Props = $props();

  let search = $state('');
  let menuOpen = $state(false);
  let sortDescending = $state(false);
  let buttonEl: HTMLButtonElement | null = $state(null);
  let menuEl: HTMLDivElement | null = $state(null);
  let listEl: HTMLDivElement | null = $state(null);
  let searchInputEl: HTMLInputElement | null = $state(null);

  function scrollToSelectedOption() {
    if (!menuOpen) return;
    if (!listEl) return;
    const active = listEl.querySelector<HTMLElement>('.combo-option.active');
    if (!active) {
      listEl.scrollTop = 0;
      return;
    }

    const paddingTop = Number.parseFloat(getComputedStyle(listEl).paddingTop) || 0;
    const desiredTop = paddingTop + 2;
    const targetTop = Math.max(0, active.offsetTop - desiredTop);
    const maxScroll = Math.max(0, listEl.scrollHeight - listEl.clientHeight);
    listEl.scrollTop = Math.min(targetTop, maxScroll);

    const listRect = listEl.getBoundingClientRect();
    const activeRect = active.getBoundingClientRect();
    const activeTop = activeRect.top - listRect.top;
    if (activeTop < desiredTop - 1 || activeTop > desiredTop + 1) {
      const next = Math.min(Math.max(0, listEl.scrollTop + (activeTop - desiredTop)), maxScroll);
      listEl.scrollTop = next;
    }
  }

  function scrollToFirstOption() {
    if (!menuOpen) return;
    if (!listEl) return;
    listEl.scrollTop = 0;
  }

  function getSelectedLabel() {
    const list = props.options;
    if (!list.length) return '';
    if (!props.selectedId) return list[0]?.label ?? '';
    return (
      list.find((o) => o.id === props.selectedId && o.prefix === props.selectedPrefix)?.label ?? props.selectedId
    );
  }

  function toggleMenu() {
    if (!props.options.length) return;
    menuOpen = !menuOpen;
    if (menuOpen) {
      search = '';
    }
  }

  function selectOption(nextId: string, nextPrefix: string) {
    props.onSelect(nextId, nextPrefix);
    search = '';
    menuOpen = false;
  }

  function onAddClick() {
    if (!props.onAdd) return;
    menuOpen = false;
    props.onAdd();
  }

  function toggleSort() {
    sortDescending = !sortDescending;
    if (menuOpen) void tick().then(scrollToFirstOption);
  }

  function getVisibleOptions() {
    const q = search.trim().toLowerCase();
    const filtered = props.options.filter((opt) => {
      if (!q) return true;
      const id = opt.id.toLowerCase();
      const label = opt.label.toLowerCase();
      return id.includes(q) || label.includes(q);
    });
    return sortDescending ? filtered.slice().reverse() : filtered;
  }

  onMount(() => {
    const onPointerDown = (e: PointerEvent) => {
      if (!menuOpen) return;
      const target = e.target as Node | null;
      if (!target) return;
      if (buttonEl?.contains(target)) return;
      if (menuEl?.contains(target)) return;
      menuOpen = false;
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (!menuOpen) return;
      if (e.key === 'Escape') {
        menuOpen = false;
        buttonEl?.focus();
      }
    };

    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  });

  $effect(() => {
    if (!menuOpen) return;
    void tick().then(() => {
      if (!menuOpen) return;
      searchInputEl?.focus();
      scrollToSelectedOption();
    });
  });
</script>

<div class="combo-wrap">
  <div class="combo {menuOpen ? 'open' : ''}">
    <button
      type="button"
      class="combo-button"
      bind:this={buttonEl}
      onclick={toggleMenu}
      disabled={!props.options.length}
      aria-expanded={menuOpen}
    >
      <span class="combo-label">{getSelectedLabel()}</span>
      <span class="combo-arrow">▾</span>
    </button>

    {#if menuOpen}
      <div class="combo-menu" bind:this={menuEl}>
        <div class="combo-search">
          <input
            class="combo-search-input"
            bind:this={searchInputEl}
            value={search}
            oninput={(e) => (search = (e.target as HTMLInputElement).value)}
            placeholder="搜索..."
          />
          <button
            type="button"
            class="combo-sort"
            onclick={toggleSort}
            aria-label="切换排序"
            aria-pressed={sortDescending}
          >
            {sortDescending ? '↓' : '↑'}
          </button>
        </div>

        <div class="combo-list" bind:this={listEl}>
          {#each getVisibleOptions() as opt (opt.prefix + opt.id)}
            <button
              type="button"
              class="combo-option {opt.id === props.selectedId && opt.prefix === props.selectedPrefix ? 'active' : ''}"
              onclick={() => selectOption(opt.id, opt.prefix)}
            >
              {opt.label}
            </button>
          {/each}
        </div>
      </div>
    {/if}
  </div>

  <button
    type="button"
    class="combo-add"
    onclick={onAddClick}
    disabled={props.addDisabled}
    aria-label="新增条目"
  >
    +
  </button>
</div>

<style>
  :where(.combo-button, .combo-option, .combo-search-input, .combo-sort, .combo-add) {
    outline: none;
  }

  .combo-wrap {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .combo {
    position: relative;
    width: 320px;
  }

  .combo-button {
    width: 100%;
    height: 34px;
    border-radius: 10px;
    border: 1px solid var(--dark-bg-color);
    background: var(--bg-color);
    padding: 0 10px;
    box-sizing: border-box;
    font-size: 14px;
    cursor: pointer;
    user-select: none;
    color: rgba(0, 0, 0, 0.65);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }

  .combo-button:hover:not(:disabled) {
    background: var(--bg-color);
  }

  .combo-button:disabled {
    opacity: 0.6;
    cursor: default;
  }

  .combo-label {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    text-align: left;
  }

  .combo-arrow {
    font-size: 12px;
    opacity: 0.7;
  }

  .combo-menu {
    position: absolute;
    top: calc(100% + 6px);
    left: 0;
    right: 0;
    z-index: 20;
    border-radius: 12px;
    border: 1px solid var(--dark-bg-color);
    background: var(--bg-color);
    overflow: hidden;
    box-shadow: 0 10px 24px rgba(0, 0, 0, 0.14);
    box-sizing: border-box;
  }

  .combo-search {
    padding: 6px;
    display: flex;
    gap: 6px;
  }

  .combo-search-input {
    flex: 1;
    height: 32px;
    border-radius: 10px;
    border: 0;
    padding: 0 10px;
    box-sizing: border-box;
    background: var(--bg-color);
    font-size: 13px;
    color: var(--dark-bg-color);
  }

  .combo-search-input:hover {
    background: var(--bg-color);
  }

  .combo-search-input:focus,
  .combo-search-input:focus-visible {
    outline: none;
    box-shadow: none;
    background: var(--bg-color);
  }

  .combo-search-input::placeholder {
    color: color-mix(in srgb, var(--dark-bg-color) 45%, var(--bg-color));
  }

  .combo-sort {
    width: 28px;
    height: 28px;
    border-radius: 8px;
    border: 0;
    background: transparent;
    cursor: pointer;
    user-select: none;
    color: rgba(0, 0, 0, 0.65);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    box-sizing: border-box;
    font-size: 13px;
    opacity: 0.75;
  }

  .combo-sort:hover {
    background: color-mix(in srgb, var(--dark-bg-color) 10%, transparent);
    opacity: 0.95;
  }

  .combo-sort:active {
    background: color-mix(in srgb, var(--dark-bg-color) 14%, transparent);
  }

  .combo-list {
    max-height: 380px;
    overflow: auto;
    padding: 6px;
    box-sizing: border-box;
    scrollbar-width: none;
    -ms-overflow-style: none;
  }

  .combo-list::-webkit-scrollbar {
    width: 0;
    height: 0;
  }

  .combo-option {
    width: 100%;
    height: 34px;
    border-radius: 10px;
    border: 0;
    background: transparent;
    cursor: pointer;
    text-align: left;
    padding: 0 10px;
    box-sizing: border-box;
    font-size: 13px;
    color: rgba(0, 0, 0, 0.65);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .combo-option:hover {
    background: rgba(0, 0, 0, 0.06);
  }

  .combo-option.active {
    background: var(--dark-bg-color);
    color: white;
  }

  .combo-add {
    width: 34px;
    height: 34px;
    border-radius: 10px;
    border: 1px solid var(--dark-bg-color);
    background: var(--bg-color);
    cursor: pointer;
    user-select: none;
    font-size: 18px;
    line-height: 1;
    color: rgba(0, 0, 0, 0.65);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .combo-add:hover:not(:disabled) {
    background: color-mix(in srgb, var(--bg-color) 82%, white 18%);
  }

  .combo-add:disabled {
    opacity: 0.6;
    cursor: default;
  }
</style>
