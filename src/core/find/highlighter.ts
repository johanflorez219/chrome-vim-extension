/** The highlight for every match, and the one for the current match (R5.2). */
const ALL_MATCHES = 'vim-find';
const CURRENT_MATCH = 'vim-find-current';

// Fixed colours, readable on light and dark pages: black text on yellow, and on orange for the current match
const STYLES = [
  `::highlight(${ALL_MATCHES}) { background-color: #ffe98a; color: #000; }`,
  `::highlight(${CURRENT_MATCH}) { background-color: #ff9632; color: #000; }`,
].join('\n');

export interface Highlighter {
  /** Highlights every range; the one at `current` gets the stronger colour (R5.2). */
  show(ranges: readonly Range[], current: number): void;
  /** Removes both highlights. Leaves the page's DOM alone (R5.4). */
  clear(): void;
  /** Removes the highlight stylesheet. Called when the controller stops. */
  dispose(): void;
}

/**
 * What the browser's CSS Custom Highlight API needs, as an object so the tests can
 * supply a fake. `addStyles` returns a function that removes what it added.
 */
export interface HighlightApi {
  readonly registry: {
    set(name: string, highlight: unknown): unknown;
    delete(name: string): unknown;
  };
  createHighlight(ranges: readonly Range[]): unknown;
  addStyles(doc: Document, css: string): () => void;
}

/**
 * Highlights matches with `api`. Without an API (no CSS.highlights, as in older
 * browsers and in jsdom) every method does nothing, so search still moves and counts (R5.3).
 */
export function createHighlighter(doc: Document, api: HighlightApi | undefined): Highlighter {
  if (api === undefined) {
    return { show: () => undefined, clear: () => undefined, dispose: () => undefined };
  }
  const removeStyles = api.addStyles(doc, STYLES);

  const clear = (): void => {
    api.registry.delete(ALL_MATCHES);
    api.registry.delete(CURRENT_MATCH);
  };

  return {
    show: (ranges, current) => {
      if (ranges.length === 0) {
        clear();
        return;
      }
      api.registry.set(ALL_MATCHES, api.createHighlight(ranges));
      const target = ranges[current];
      if (target === undefined) {
        api.registry.delete(CURRENT_MATCH);
      } else {
        api.registry.set(CURRENT_MATCH, api.createHighlight([target]));
      }
    },
    clear,
    dispose: () => {
      clear();
      removeStyles();
    },
  };
}

interface CssHighlightRegistry {
  set(name: string, highlight: unknown): unknown;
  delete(name: string): unknown;
}

function hasHighlightRegistry(value: unknown): value is { highlights: CssHighlightRegistry } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'highlights' in value &&
    typeof value.highlights === 'object' &&
    value.highlights !== null
  );
}

/**
 * The real browser API, or undefined when this browser lacks CSS.highlights or the
 * Highlight constructor. The page's own CSS cannot reach the stylesheet we add (it
 * is adopted, not inserted), so page styles never change a match's colour.
 */
export function browserHighlightApi(): HighlightApi | undefined {
  const css: unknown = Reflect.get(globalThis, 'CSS');
  const Highlight: unknown = Reflect.get(globalThis, 'Highlight');
  if (!hasHighlightRegistry(css) || typeof Highlight !== 'function') {
    return undefined;
  }
  const HighlightConstructor = Highlight as new (...ranges: Range[]) => unknown;
  return {
    registry: css.highlights,
    createHighlight: (ranges) => new HighlightConstructor(...ranges),
    addStyles: (doc, text) => {
      if (!('adoptedStyleSheets' in doc)) {
        return () => undefined;
      }
      const sheet = new CSSStyleSheet();
      sheet.replaceSync(text);
      doc.adoptedStyleSheets = [...doc.adoptedStyleSheets, sheet];
      return () => {
        doc.adoptedStyleSheets = doc.adoptedStyleSheets.filter((item) => item !== sheet);
      };
    },
  };
}
