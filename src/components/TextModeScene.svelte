<script lang="ts">
  import AlmanacTextEditor from '@component/AlmanacTextEditor.svelte';

  export type TextScrollPosition = {
    scrollTop: number;
    scrollLeft: number;
  };

  type Props = {
    csvText: string;
    onCsvTextChange: (next: string) => void;
    editable: boolean;
    active: boolean;
    scrollPosition: TextScrollPosition | null;
    onScrollPositionChange: (next: TextScrollPosition) => void;
  };

  let props: Props = $props();

  let editor: any = $state(null);
  let quickFind = $state('');
  let didRestoreScroll = $state(false);
  let markerIds: number[] = [];
  let highlightRaf: number | null = null;
  let highlightTimeout: number | null = null;
  let findRanges: any[] = $state([]);
  let findIndex = $state(-1);
  let replaceText = $state('');
  let replaceExpanded = $state(false);
  let optionRegExp = $state(false);
  let optionCaseSensitive = $state(false);
  let optionWholeWord = $state(false);
  let quickFindInput: HTMLInputElement | null = $state(null);
  let replaceInput: HTMLInputElement | null = $state(null);
  let hasSelection = $state(false);
  let suppressHighlight = $state(false);
  let isReplacingAll = $state(false);
  let replaceAllDone = $state(0);
  let replaceAllTotal = $state(0);

  function onEditorReady(next: any) {
    editor = next;
  }

  function focusQuickFind(selectAll = false) {
    if (!props.editable) return;
    setTimeout(() => {
      quickFindInput?.focus();
      if (selectAll) quickFindInput?.select?.();
    }, 0);
  }

  function focusReplace(selectAll = false) {
    if (!props.editable) return;
    if (!replaceExpanded) {
      replaceExpanded = true;
    }
    setTimeout(() => {
      replaceInput?.focus();
      if (selectAll) replaceInput?.select?.();
    }, 0);
  }

  function toggleReplaceExpanded() {
    if (!props.editable) return;
    replaceExpanded = !replaceExpanded;
    if (replaceExpanded) {
      setTimeout(() => replaceInput?.focus(), 0);
    }
  }

  function clearFindHighlights() {
    if (!editor) return;
    try {
      for (const id of markerIds) editor.session?.removeMarker?.(id);
    } catch {
    }
    markerIds = [];
  }

  function getAceSearchOptions() {
    return {
      backwards: false,
      wrap: true,
      caseSensitive: optionCaseSensitive,
      wholeWord: optionWholeWord,
      regExp: optionRegExp,
    };
  }

  function applyFindHighlights() {
    if (!editor) return;
    if (!props.editable) return;

    const needle = quickFind.trim();
    if (!needle) {
      clearFindHighlights();
      findRanges = [];
      findIndex = -1;
      return;
    }

    let ranges: any[] = [];
    try {
      const search = editor.$search;
      if (search?.set && search?.findAll) {
        search.set({ needle, ...getAceSearchOptions() });
        ranges = search.findAll(editor.session) ?? [];
      } else {
        ranges = [];
      }
    } catch {
      ranges = [];
    }

    const limited = ranges.length > 2500 ? ranges.slice(0, 2500) : ranges;
    findRanges = limited;
    if (findIndex >= limited.length) findIndex = limited.length ? 0 : -1;

    clearFindHighlights();

    const nextIds: number[] = [];
    try {
      for (const r of limited) {
        const id = editor.session?.addMarker?.(r, 'pvzhe-find-highlight', 'text', false);
        if (typeof id === 'number') nextIds.push(id);
      }
    } catch {
    }

    markerIds = nextIds;
  }

  function getFindAllRanges(needle: string) {
    if (!editor) return [];
    let ranges: any[] = [];
    try {
      const search = editor.$search;
      if (search?.set && search?.findAll) {
        search.set({ needle, ...getAceSearchOptions() });
        ranges = search.findAll(editor.session) ?? [];
      }
    } catch {
      ranges = [];
    }
    return ranges;
  }

  function getAceRangeCtor() {
    try {
      const ace = editor?.__pvzheAce ?? (window as any)?.ace;
      const mod = ace?.require?.('ace/range');
      if (mod?.Range) return mod.Range;
    } catch {
    }
    return null;
  }

  function isWordChar(c: string) {
    return /[A-Za-z0-9_]/.test(c);
  }

  async function findPlainRangesIncrementally(needle: string) {
    const session = editor?.session;
    const Range = getAceRangeCtor();
    if (!session || !Range) return [];

    const out: any[] = [];
    const totalLines = Math.max(0, Number(session.getLength?.() ?? 0) || 0);
    const target = optionCaseSensitive ? needle : needle.toLowerCase();

    let lastYield = performance.now();
    for (let row = 0; row < totalLines; row++) {
      let line = '';
      try {
        line = String(session.getLine?.(row) ?? '');
      } catch {
        line = '';
      }

      const hay = optionCaseSensitive ? line : line.toLowerCase();
      let from = 0;
      while (true) {
        const idx = hay.indexOf(target, from);
        if (idx === -1) break;

        if (optionWholeWord) {
          const before = idx > 0 ? line[idx - 1] : '';
          const after = idx + needle.length < line.length ? line[idx + needle.length] : '';
          if ((before && isWordChar(before)) || (after && isWordChar(after))) {
            from = idx + Math.max(1, needle.length);
            continue;
          }
        }

        try {
          out.push(new Range(row, idx, row, idx + needle.length));
        } catch {
        }
        from = idx + Math.max(1, needle.length);
      }

      if (row % 250 === 0) {
        replaceAllTotal = out.length;
        const now = performance.now();
        if (now - lastYield > 12) {
          lastYield = now;
          await yieldToUi();
        }
      }
    }

    replaceAllTotal = out.length;
    return out;
  }

  function yieldToUi() {
    return new Promise<void>((resolve) => {
      try {
        const w: any = window as any;
        if (typeof w.requestAnimationFrame === 'function') {
          w.requestAnimationFrame(() => resolve());
          return;
        }
      } catch {
      }
      setTimeout(() => resolve(), 0);
    });
  }

  function getMatchStatusText() {
    if (!props.editable) return '';
    const needle = quickFind.trim();
    if (!needle) return '';
    const total = findRanges.length;
    if (!total) return '无匹配';
    const current = findIndex >= 0 ? findIndex + 1 : 0;
    return `${current}/${total}`;
  }

  function scheduleFindHighlight() {
    if (suppressHighlight) return;
    if (highlightRaf) cancelAnimationFrame(highlightRaf);
    highlightRaf = null;
    if (highlightTimeout) clearTimeout(highlightTimeout);
    highlightTimeout = null;

    const run = () => {
      highlightTimeout = null;
      if (suppressHighlight) return;
      applyFindHighlights();
    };

    highlightRaf = requestAnimationFrame(() => {
      highlightRaf = null;
      try {
        const w: any = window as any;
        if (typeof w.requestIdleCallback === 'function') {
          w.requestIdleCallback(run, { timeout: 250 });
          return;
        }
      } catch {
      }
      highlightTimeout = setTimeout(run, 80) as any;
    });
  }

  function findNext(backwards: boolean) {
    if (!editor) return;
    const needle = quickFind.trim();
    if (!needle) {
      focusQuickFind(true);
      return;
    }
    applyFindHighlights();
    const list = findRanges;
    if (!list.length) return;

    const len = list.length;
    const nextIdx = (() => {
      if (findIndex < 0 || findIndex >= len) return backwards ? len - 1 : 0;
      return backwards ? (findIndex - 1 + len) % len : (findIndex + 1) % len;
    })();

    findIndex = nextIdx;
    const r = list[nextIdx];
    try {
      const selection = editor.getSelection?.() ?? editor.session?.selection ?? editor.selection;
      selection?.setSelectionRange?.(r, false);
      editor.renderer?.scrollCursorIntoView?.();
    } catch {
    }
  }

  function replaceSelection() {
    if (!editor) return;
    try {
      const range = editor.getSelectionRange?.();
      if (!range || range.isEmpty?.()) return;
      editor.session?.replace?.(range, replaceText ?? '');
    } catch {
    }
    scheduleFindHighlight();
  }

  function replaceAllMatches() {
    if (!editor) return;
    if (isReplacingAll) return;
    const needle = quickFind.trim();
    if (!needle) {
      focusQuickFind(true);
      return;
    }
    suppressHighlight = true;
    if (highlightRaf) cancelAnimationFrame(highlightRaf);
    highlightRaf = null;
    if (highlightTimeout) clearTimeout(highlightTimeout);
    highlightTimeout = null;
    isReplacingAll = true;
    replaceAllDone = 0;

    const run = async () => {
      await yieldToUi();
      const ranges = optionRegExp ? getFindAllRanges(needle) : await findPlainRangesIncrementally(needle);
      const total = ranges.length;
      replaceAllTotal = total;
      await yieldToUi();

      const session = editor.session;
      const search = editor.$search;
      const replacementRaw = replaceText ?? '';

      try {
        const batchSize = 50;
        for (let i = total - 1; i >= 0; i--) {
          const r = ranges[i];
          try {
            const replacement = (() => {
              if (!optionRegExp) return replacementRaw;
              try {
                const source = String(session?.getTextRange?.(r) ?? '');
                const out = search?.replace?.(source, replacementRaw);
                return out === null || out === undefined ? source : String(out);
              } catch {
                return replacementRaw;
              }
            })();
            session?.replace?.(r, replacement);
          } catch {
          }

          replaceAllDone = total - i;
          if (replaceAllDone % batchSize === 0) {
            await yieldToUi();
          }
        }
      } finally {
        isReplacingAll = false;
        suppressHighlight = false;
        scheduleFindHighlight();
      }
    };

    void run();
  }

  function restoreScroll() {
    if (!editor) return;
    if (didRestoreScroll) return;
    if (!props.scrollPosition) return;
    didRestoreScroll = true;

    const nextTop = Math.max(0, Number(props.scrollPosition.scrollTop) || 0);
    const nextLeft = Math.max(0, Number(props.scrollPosition.scrollLeft) || 0);
    try {
      editor.session?.setScrollTop?.(nextTop);
    } catch {
    }
    try {
      editor.session?.setScrollLeft?.(nextLeft);
    } catch {
    }
  }

  function emitScrollPosition() {
    if (!editor) return;
    if (!props.editable) return;
    try {
      const scrollTop = Number(editor.session?.getScrollTop?.() ?? editor.renderer?.getScrollTop?.() ?? 0);
      const scrollLeft = Number(editor.session?.getScrollLeft?.() ?? editor.renderer?.getScrollLeft?.() ?? 0);
      props.onScrollPositionChange({
        scrollTop: Math.max(0, scrollTop || 0),
        scrollLeft: Math.max(0, scrollLeft || 0),
      });
    } catch {
    }
  }

  $effect(() => {
    editor;
    props.editable;
    props.scrollPosition;
    if (!editor) return;
    if (!props.editable) return;
    restoreScroll();
  });

  $effect(() => {
    editor;
    props.editable;
    if (!editor) return;
    if (!props.editable) return;

    const onScroll = () => emitScrollPosition();

    try {
      editor.session?.on?.('changeScrollTop', onScroll);
    } catch {
    }
    try {
      editor.session?.on?.('changeScrollLeft', onScroll);
    } catch {
    }

    emitScrollPosition();

    return () => {
      try {
        editor.session?.off?.('changeScrollTop', onScroll);
      } catch {
      }
      try {
        editor.session?.off?.('changeScrollLeft', onScroll);
      } catch {
      }
    };
  });

  $effect(() => {
    editor;
    props.editable;
    if (!editor) return;
    if (!props.editable) {
      clearFindHighlights();
      return;
    }
    scheduleFindHighlight();
  });

  $effect(() => {
    editor;
    props.editable;
    if (!editor) return;

    const onChange = () => {
      if (props.editable && !suppressHighlight) scheduleFindHighlight();
    };
    try {
      editor.on?.('change', onChange);
    } catch {
    }
    return () => {
      try {
        editor.off?.('change', onChange);
      } catch {
      }
    };
  });

  $effect(() => {
    editor;
    props.editable;
    optionRegExp;
    optionCaseSensitive;
    optionWholeWord;
    if (!editor || !props.editable) return;
    scheduleFindHighlight();
  });

  $effect(() => {
    editor;
    props.editable;
    if (!props.editable) return;

    const onKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && replaceExpanded) {
        e.preventDefault();
        replaceExpanded = false;
        return;
      }

      const isMac = navigator.platform.toLowerCase().includes('mac');
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;
      if (!cmdOrCtrl) return;

      if (!e.shiftKey && e.key.toLowerCase() === 'h') {
        e.preventDefault();
        replaceExpanded = true;
        setTimeout(() => replaceInput?.focus(), 0);
        return;
      }
    };

    window.addEventListener('keydown', onKeydown);
    return () => window.removeEventListener('keydown', onKeydown);
  });

  $effect(() => {
    editor;
    props.editable;
    if (!editor || !props.editable) {
      hasSelection = false;
      return;
    }

    const update = () => {
      try {
        const t = String(editor.getSelectedText?.() ?? '');
        hasSelection = t.length > 0;
        if (!hasSelection) {
          findIndex = -1;
          return;
        }
        const r = editor.getSelectionRange?.();
        if (!r || r.isEmpty?.()) {
          findIndex = -1;
          return;
        }
        const idx = findRanges.findIndex(
          (x) =>
            x?.start?.row === r.start.row &&
            x?.start?.column === r.start.column &&
            x?.end?.row === r.end.row &&
            x?.end?.column === r.end.column
        );
        if (idx !== -1) findIndex = idx;
      } catch {
        hasSelection = false;
        findIndex = -1;
      }
    };

    const selection = editor.session?.selection ?? editor.selection;
    const onSel = () => update();
    try {
      selection?.on?.('changeSelection', onSel);
    } catch {
    }

    update();

    return () => {
      try {
        selection?.off?.('changeSelection', onSel);
      } catch {
      }
    };
  });

  $effect(() => {
    props.active;
    props.editable;
    if (!props.active || !props.editable) return;

    const onShortcut = (e: Event) => {
      const detail = (e as any)?.detail;
      const action = String(detail?.action ?? '');
      if (action === 'find') {
        focusQuickFind(true);
        return;
      }
      if (action === 'replace') {
        focusReplace(true);
      }
    };

    window.addEventListener('pvzhe-text-shortcut', onShortcut as any);
    return () => window.removeEventListener('pvzhe-text-shortcut', onShortcut as any);
  });
</script>

<div class="text-scene">
  <div class="text-toolbar">
    <div class="text-toolbar-row">
      <div class="search-wrap">
        <div class="search-input-wrap" aria-label="查找">
          <input
            class="text-search"
            bind:this={quickFindInput}
            placeholder="查找（回车下一处 / Shift+回车上一处）"
            value={quickFind}
            oninput={(e) => {
              quickFind = (e.target as HTMLInputElement).value;
              scheduleFindHighlight();
            }}
            onkeydown={(e) => {
              if (e.key !== 'Enter') return;
              e.preventDefault();
              findNext(!!e.shiftKey);
            }}
            disabled={!props.editable}
          />

          <div class="search-icons" aria-label="查找选项">
            <div class="search-count" aria-label="匹配统计">{getMatchStatusText()}</div>
            <button
              type="button"
              class="search-icon {optionCaseSensitive ? 'active' : ''}"
              aria-pressed={optionCaseSensitive}
              onclick={() => (optionCaseSensitive = !optionCaseSensitive)}
              disabled={!props.editable}
            >
              Aa
            </button>
            <button
              type="button"
              class="search-icon {optionRegExp ? 'active' : ''}"
              aria-pressed={optionRegExp}
              onclick={() => (optionRegExp = !optionRegExp)}
              disabled={!props.editable}
            >
              .*
            </button>
            <button
              type="button"
              class="search-icon {optionWholeWord ? 'active' : ''}"
              aria-pressed={optionWholeWord}
              onclick={() => (optionWholeWord = !optionWholeWord)}
              disabled={!props.editable}
            >
              W
            </button>
          </div>
        </div>
      </div>

      <div class="text-toolbar-actions">
        <button type="button" class="button text-action" onclick={() => findNext(true)} title="上一处" disabled={!props.editable}>
          ↑
        </button>
        <button type="button" class="button text-action" onclick={() => findNext(false)} title="下一处" disabled={!props.editable}>
          ↓
        </button>
        <button type="button" class="button" onclick={toggleReplaceExpanded} disabled={!props.editable}>
          替换 {replaceExpanded ? '▴' : '▾'}
        </button>
      </div>
    </div>

    {#if replaceExpanded}
      <div class="text-toolbar-row replace-row">
        <input
          class="text-replace"
          bind:this={replaceInput}
          placeholder="输入替换内容"
          value={replaceText}
          oninput={(e) => (replaceText = (e.target as HTMLInputElement).value)}
          onkeydown={(e) => {
            if (e.key !== 'Enter') return;
            e.preventDefault();
            replaceSelection();
          }}
          disabled={!props.editable}
        />
        <div class="replace-actions">
          <button type="button" class="button" onclick={replaceSelection} disabled={!props.editable || !hasSelection}>
            替换
          </button>
          <button
            type="button"
            class="button"
            onclick={replaceAllMatches}
            disabled={!props.editable || !quickFind.trim() || isReplacingAll}
          >
            {isReplacingAll ? (replaceAllTotal ? `替换中 ${replaceAllDone}/${replaceAllTotal}` : '替换中...') : '全部替换'}
          </button>
        </div>
      </div>
    {/if}
  </div>

  <div class="text-editor">
    <div class="text-editor-inner {props.editable ? '' : 'disabled'}">
      <AlmanacTextEditor
        value={props.csvText}
        mode="almanac_csv"
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

  .text-toolbar {
    display: flex;
    flex-direction: column;
    gap: 10px;
    min-width: 0;
  }

  .text-toolbar-row {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 10px;
    align-items: center;
    min-width: 0;
  }

  .search-wrap {
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .search-icons {
    position: absolute;
    right: 10px;
    top: 50%;
    transform: translateY(-50%);
    display: inline-flex;
    gap: 6px;
    align-items: center;
    z-index: 2;
  }

  .text-toolbar-actions {
    display: inline-flex;
    align-items: center;
    justify-content: flex-end;
    gap: 10px;
    flex: none;
  }

  .search-input-wrap {
    position: relative;
    flex: 1;
    min-width: 0;
  }

  .text-search {
    width: 100%;
    height: 34px;
    border-radius: 10px;
    border: 1px solid rgba(0, 0, 0, 0.18);
    background: rgba(255, 255, 255, 0.26);
    padding: 0 10px;
    padding-right: 170px;
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

  .search-icon {
    width: 26px;
    height: 22px;
    border-radius: 6px;
    border: 0;
    background: transparent;
    color: rgba(0, 0, 0, 0.65);
    padding: 0;
    cursor: pointer;
    user-select: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 700;
    line-height: 1;
  }

  .search-count {
    min-width: 66px;
    padding: 0 6px;
    box-sizing: border-box;
    font-size: 12px;
    font-weight: 700;
    line-height: 1;
    text-align: right;
    color: color-mix(in srgb, var(--dark-bg-color) 70%, transparent);
    user-select: none;
    pointer-events: none;
  }

  .search-icon:hover:not(:disabled) {
    background: rgba(0, 0, 0, 0.06);
    color: rgba(0, 0, 0, 0.65);
  }

  .search-icon.active:hover:not(:disabled) {
    background: color-mix(in srgb, var(--dark-bg-color) 86%, white 14%);
    color: white;
  }

  .search-icon:disabled {
    opacity: 0.5;
    cursor: default;
  }

  .search-icon.active {
    background: var(--dark-bg-color);
    color: white;
  }

  .replace-row {
    grid-template-columns: 1fr auto;
  }

  .text-replace {
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

  .text-replace::placeholder {
    color: rgba(0, 0, 0, 0.5);
  }

  .text-replace:focus,
  .text-replace:focus-visible {
    outline: none;
    box-shadow: none;
  }

  .replace-actions {
    display: inline-flex;
    align-items: center;
    justify-content: flex-end;
    gap: 10px;
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

  :global(.ace_marker-layer .ace_pvzhe-find-highlight) {
    background: color-mix(in srgb, var(--bg-color) 28%, var(--dark-bg-color) 72%) !important;
    border: 1px solid color-mix(in srgb, var(--dark-bg-color) 35%, transparent) !important;
    border-radius: 2px;
    opacity: 0.35;
  }

  :global(.ace_marker-layer .ace_selection) {
    background: color-mix(in srgb, var(--dark-bg-color) 28%, transparent) !important;
  }

  :global(.ace_marker-layer .ace_selected-word) {
    border: 1px solid color-mix(in srgb, var(--dark-bg-color) 40%, transparent) !important;
  }

  :global(.ace_marker-layer .ace_step) {
    background: color-mix(in srgb, var(--dark-bg-color) 22%, transparent) !important;
  }
</style>
