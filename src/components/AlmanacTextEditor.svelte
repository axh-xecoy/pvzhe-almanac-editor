<script lang="ts">
  import { onMount } from 'svelte';
  import aceScriptUrl from 'ace-builds/src-noconflict/ace.js?url';
  import { ALMANAC_COLOR_PRESETS } from '@util/almanacTokens';

  type Props = {
    value: string;
    onValueChange: (value: string) => void;
    mode?: 'text' | 'almanac';
  };

  let props: Props = $props();

  function getMode() {
    return props.mode ?? 'text';
  }

  let container: HTMLDivElement | null = $state(null);
  let aceEditor: any = $state(null);
  let unmounted = false;
  let changeHandler: (() => void) | null = null;
  let lastMode: Props['mode'] = $state('text');

  function ensureAlmanacMode(ace: any) {
    const existing = (() => {
      try {
        return ace.require('ace/mode/pvzhe_almanac');
      } catch {
        return null;
      }
    })();
    if (existing?.Mode) return;

    ace.define(
      'ace/mode/pvzhe_almanac_highlight_rules',
      ['require', 'exports', 'module', 'ace/lib/oop', 'ace/mode/text_highlight_rules'],
      function (require: any, exports: any) {
        const oop = require('ace/lib/oop');
        const TextHighlightRules = require('ace/mode/text_highlight_rules').TextHighlightRules;

        const PvzheAlmanacHighlightRules = function (this: any) {
          this.$rules = {
            start: [
              { token: ['custom-purple', 'custom-cyan', 'custom-purple'], regex: /(\[color=)([#0-9a-fA-F]{3,8})(\])/ },
              { token: 'custom-purple', regex: /\[color=\]/ },
              { token: 'custom-purple', regex: /\[color\]/ },
              { token: 'custom-purple', regex: /\[\/color\]/ },
            ],
          };
          this.normalizeRules();
        };

        oop.inherits(PvzheAlmanacHighlightRules, TextHighlightRules);
        (exports as any).PvzheAlmanacHighlightRules = PvzheAlmanacHighlightRules;
      }
    );

    ace.define(
      'ace/mode/pvzhe_almanac',
      ['require', 'exports', 'module', 'ace/lib/oop', 'ace/mode/text', 'ace/mode/pvzhe_almanac_highlight_rules'],
      function (require: any, exports: any) {
        const oop = require('ace/lib/oop');
        const TextMode = require('ace/mode/text').Mode;
        const PvzheAlmanacHighlightRules = require('ace/mode/pvzhe_almanac_highlight_rules').PvzheAlmanacHighlightRules;

        const Mode = function (this: any) {
          this.HighlightRules = PvzheAlmanacHighlightRules;
          this.$id = 'ace/mode/pvzhe_almanac';
        };
        oop.inherits(Mode, TextMode);

        (exports as any).Mode = Mode;
      }
    );
  }

  function setAceMode(nextMode: 'text' | 'almanac') {
    if (!aceEditor) return;
    if (nextMode === 'almanac') {
      try {
        const ace = aceEditor.constructor;
        const mod = ace.require('ace/mode/pvzhe_almanac');
        if (mod?.Mode) {
          aceEditor.session.setMode(new mod.Mode());
          return;
        }
      } catch {
      }
      aceEditor.session.setMode('ace/mode/pvzhe_almanac');
      return;
    }
    aceEditor.session.setMode('ace/mode/text');
  }

  function ensureAlmanacCompleter(ace: any) {
    if (ace.__pvzheAlmanacCompleterAdded) return;
    ace.__pvzheAlmanacCompleterAdded = true;

    const langTools = ace.require('ace/ext/language_tools');
    const completer = {
      getCompletions: (_editor: any, session: any, pos: any, prefix: string, callback: any) => {
        const line = String(session.getLine(pos.row) ?? '');
        const linePrefix = line.slice(0, pos.column);
        const prefixStart = pos.column - prefix.length;
        const charBefore = prefixStart > 0 ? line[prefixStart - 1] : '';
        const charBefore2 = prefixStart > 1 ? line.slice(prefixStart - 2, prefixStart) : '';
        const charAfter = line[pos.column];

        // 2. Check for [color...] trigger
      // Trigger if:
        // - charBefore is '[' (e.g. "[c")
        // - OR charBefore is '/' AND charBefore2 ends with '[' (e.g. "[/c")
        // - OR we are exactly at "[/" (charBefore is '[' and prefix is '/')
        const isBracketTrigger = charBefore === '[';
        const isCloseTagTrigger = charBefore === '/' && charBefore2.endsWith('[');
        const isSlashTrigger = charBefore === '[' && prefix === '/';

        if (!isBracketTrigger && !isCloseTagTrigger && !isSlashTrigger) {
          callback(null, []);
          return;
        }

        const presetColors = ALMANAC_COLOR_PRESETS;

        // Adjust value logic: avoid duplicating closing bracket if it exists
        const adjustValue = (v: string) => (charAfter === ']' && v.endsWith(']') ? v.slice(0, -1) : v);

        // If user typed "[/", we should ONLY suggest "[/color]" and give it high score
        if (isSlashTrigger || isCloseTagTrigger) {
           callback(null, [{
             caption: '[/color]',
             value: adjustValue(isCloseTagTrigger ? 'color]' : '/color]'), // "[/" -> "color]" or "[" + "/" -> "/color]"
             meta: 'tag',
             score: 1000
           }]);
           return;
        }

        callback(null, [
          ...presetColors.map((c) => ({
            caption: `[color=${c.value}]`,
            value: adjustValue(`color=${c.value}]`),
            meta: c.meta,
          })),
          {
            caption: '[color=]',
            value: adjustValue('color=]'),
            meta: 'tag',
          },
          {
            caption: '[/color]',
            value: adjustValue('/color]'),
            meta: 'tag',
          },
        ]);
      },
      // Ensure '/' is treated as part of the identifier for completion triggering
      identifierRegexps: [/[a-zA-Z_0-9\$\-\u00A2-\uFFFF\/]/]
    };
    
    langTools.addCompleter(completer);
    ace.__pvzheAlmanacCompleterInstance = completer;
  }

  function decodeEscapedNewlines(value: string) {
    return value.replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n');
  }

  function setValue(next: string) {
    if (!aceEditor) return;

    const current = aceEditor.getValue();
    if (current === next) return;

    const currentCursorPos = aceEditor.getCursorPosition();
    const currentCursorIndex =
      aceEditor.session?.doc?.positionToIndex?.(currentCursorPos, 0) ??
      aceEditor.session?.getDocument?.()?.positionToIndex?.(currentCursorPos, 0) ??
      0;

    const mappedCursorIndex = (() => {
      if (decodeEscapedNewlines(current) === next) return decodeEscapedNewlines(current.slice(0, currentCursorIndex)).length;
      return Math.min(currentCursorIndex, next.length);
    })();

    // Temporarily remove change listener to avoid infinite loop
    if (changeHandler) {
      aceEditor.off('change', changeHandler);
    }

    aceEditor.setValue(next, -1);
    aceEditor.clearSelection();

    try {
      const idx = Math.max(0, Math.min(mappedCursorIndex, next.length));
      const pos =
        aceEditor.session?.doc?.indexToPosition?.(idx, 0) ??
        aceEditor.session?.getDocument?.()?.indexToPosition?.(idx, 0) ?? { row: 0, column: 0 };
      aceEditor.moveCursorTo(pos.row, pos.column);
      aceEditor.clearSelection();
      aceEditor.renderer?.scrollCursorIntoView?.();
    } catch {
    }

    // Re-attach change listener
    if (changeHandler) {
      aceEditor.on('change', changeHandler);
    }
  }

  $effect(() => {
    if (!aceEditor) return;
    // Normalize input value: remove \r and ensure string
    const next = String(props.value ?? '').replace(/\r/g, '');
    setValue(next);
  });

  $effect(() => {
    if (!aceEditor) return;
    const nextMode = getMode();
    if (lastMode === nextMode) return;
    lastMode = nextMode;
    setAceMode(nextMode);
  });

  onMount(() => {
    let disposed = false;
    let resizeObserver: ResizeObserver | null = null;

    const init = async () => {
      if (!container || disposed) return;

      const aceModule = await import('ace-builds/src-noconflict/ace');
      await import('ace-builds/src-noconflict/mode-text');
      await import('ace-builds/src-noconflict/ext-language_tools');

      if (!container || disposed) return;

      const ace = aceModule.default;
      const aceUrl = aceScriptUrl.split('?')[0];
      const basePath = aceUrl.slice(0, aceUrl.lastIndexOf('/'));
      ace.config.set('basePath', basePath);
      ace.config.set('modePath', basePath);
      ace.config.set('themePath', basePath);
      ace.config.set('workerPath', basePath);

      ensureAlmanacMode(ace);
      ensureAlmanacCompleter(ace);

      const editor = ace.edit(container);
      aceEditor = editor;

      // Disable default local completers (avoid noise like "abc" -> "abd")
      // We only want our custom completer.
      const langTools = ace.require('ace/ext/language_tools');
      editor.setOptions({
        enableBasicAutocompletion: true,
        enableLiveAutocompletion: true,
        enableSnippets: false,
        showPrintMargin: false,
        indentedSoftWrap: false,
      });
      // Clear default completers to remove noise
      if (langTools) {
        editor.completers = [editor.completers.find((c: any) => c === ace.__pvzheAlmanacCompleterInstance)];
      }

      editor.setShowFoldWidgets(false);
      editor.renderer.setShowGutter(false);
      editor.setHighlightActiveLine(false);
      editor.setHighlightGutterLine(false);
      editor.session.setUseWrapMode(true);
      setAceMode(getMode());
      editor.session.setUseWorker(false);
      lastMode = getMode();

      changeHandler = () => {
        if (unmounted || disposed || !aceEditor) return;
        const next = String(editor.getValue()).replace(/\r/g, '');
        props.onValueChange(next);
      };

      editor.on('change', changeHandler);

      setValue(String(props.value ?? '').replace(/\r/g, ''));
      editor.resize(true);

      resizeObserver = new ResizeObserver(() => {
        if (!aceEditor || disposed) return;
        aceEditor.resize(true);
      });
      resizeObserver.observe(container);
    };

    void init();

    return () => {
      disposed = true;
      unmounted = true;
      try {
        if (aceEditor) {
          if (changeHandler) aceEditor.off('change', changeHandler);
          aceEditor.destroy();
        }
      } catch {
      }
      try {
        resizeObserver?.disconnect();
      } catch {
      }
      resizeObserver = null;
      aceEditor = null;
      changeHandler = null;
    };
  });
</script>

<div class="shell">
  <div class="editor" bind:this={container}></div>
</div>

<style>
  .shell {
    width: 100%;
    height: 100%;
    min-width: 0;
    min-height: 0;
    box-sizing: border-box;
    padding: 6px;
    overflow: hidden;
  }

  .editor {
    width: 100%;
    height: 100%;
    min-width: 0;
    min-height: 0;
    overflow: hidden;
    background: transparent;
  }

  :global(.editor.ace_editor) {
    width: 100% !important;
    height: 100% !important;
    background: transparent;
  }

  :global(.editor .ace_scroller) {
    background: transparent;
    padding: 0 !important;
  }

  :global(.editor .ace_content) {
    color: var(--dark-bg-color);
    padding: 0 !important;
  }

  :global(.editor .ace_cursor) {
    color: var(--dark-bg-color);
  }

  :global(.editor:not(.ace_focus) .ace_cursor) {
    opacity: 0;
  }

  :global(.editor .ace_marker-layer .ace_active-line) {
    background: color-mix(in srgb, var(--bg-color) 70%, var(--dark-bg-color) 30%);
  }

  :global(.editor:not(.ace_focus) .ace_marker-layer .ace_active-line) {
    background: transparent;
  }

  :global(.editor .ace_marker-layer .ace_selection) {
    background: color-mix(in srgb, var(--bg-color) 55%, var(--dark-bg-color) 45%);
  }

  :global(.editor *) {
    font-family:
      'Monaco',
      'Menlo',
      'Ubuntu Mono',
      'Droid Sans Mono',
      'Consolas',
      monospace !important;
    font-size: 16px !important;
    direction: ltr !important;
    text-align: left !important;
  }

  :global(.ace_editor.ace_autocomplete) {
    background: color-mix(in srgb, var(--bg-color, #fdc689) 35%, white) !important;
    border: 1px solid color-mix(in srgb, var(--bg-color) 45%, var(--dark-bg-color) 55%);
    font-size: 16px;
    opacity: 1 !important;
  }

  :global(.ace_editor.ace_autocomplete .ace_scroller) {
    background: color-mix(in srgb, var(--bg-color, #fdc689) 35%, white) !important;
  }

  :global(.ace_editor.ace_autocomplete .ace_content) {
    background: color-mix(in srgb, var(--bg-color, #fdc689) 35%, white) !important;
  }

  :global(.ace_editor.ace_autocomplete .ace_marker-layer .ace_active-line) {
    background: color-mix(in srgb, var(--bg-color, #fdc689) 55%, white) !important;
  }

  :global(.ace_editor.ace_autocomplete .ace_line.ace_selected) {
    color: var(--dark-bg-color, #8f431b);
    background: color-mix(in srgb, var(--bg-color, #fdc689) 55%, white) !important;
  }

  :global(.ace_editor.ace_autocomplete .ace_line) {
    color: var(--dark-bg-color, #8f431b);
  }

  :global(.ace_editor.ace_autocomplete .ace_line.ace_selected .ace_completion-highlight) {
    color: var(--dark-bg-color, #8f431b);
  }

  :global(.ace_editor.ace_autocomplete .ace_line .ace_completion-highlight) {
    color: var(--dark-bg-color, #8f431b);
  }

  :global(.ace_scrollbar::-webkit-scrollbar) {
    width: 13px;
    height: 13px;
    box-sizing: border-box;
  }

  :global(.ace_scrollbar::-webkit-scrollbar-thumb) {
    border-radius: 999px;
    background-color: rgba(0, 0, 0, 0.2);
  }

  :global(.ace_scrollbar::-webkit-scrollbar-thumb:hover) {
    background-color: rgba(0, 0, 0, 0.4);
  }

  :global(.ace_editor.ace_autocomplete .ace_scrollbar::-webkit-scrollbar) {
    width: 8px;
    height: 8px;
  }

  :global(.ace_editor.ace_autocomplete .ace_scrollbar::-webkit-scrollbar-thumb) {
    border-radius: 0 !important;
    background-color: color-mix(in srgb, var(--dark-bg-color, #8f431b) 40%, white) !important;
  }

  :global(.ace_editor.ace_autocomplete .ace_scrollbar::-webkit-scrollbar-thumb:hover) {
    background-color: color-mix(in srgb, var(--dark-bg-color, #8f431b) 60%, white) !important;
  }

  :global(.ace_editor.ace_autocomplete .ace_scrollbar::-webkit-scrollbar-track) {
    background-color: color-mix(in srgb, var(--bg-color, #fdc689) 25%, white) !important;
  }

  :global(.editor .ace_scrollbar) {
    display: none !important;
  }

  :global(.ace_custom-keyword) {
    color: color-mix(in srgb, var(--dark-bg-color) 65%, #d33b2c) !important;
  }

  :global(.ace_custom-purple) {
    color: #ff4fa3 !important;
  }

  :global(.ace_custom-cyan) {
    color: #00bcd4 !important;
  }

  :global(.ace_custom-color) {
    color: color-mix(in srgb, var(--dark-bg-color) 65%, white) !important;
  }
</style>
