import { afterEach, describe, expect, it, vi } from 'vitest';

import { browserHighlightApi, createHighlighter, type HighlightApi } from './highlighter';

/** A fake registry that records what the highlighter sets and deletes. */
function fakeApi(): {
  api: HighlightApi;
  highlights: Map<string, readonly Range[]>;
  stylesRemoved: ReturnType<typeof vi.fn>;
  addStyles: ReturnType<typeof vi.fn>;
} {
  const highlights = new Map<string, readonly Range[]>();
  const stylesRemoved = vi.fn();
  const addStyles = vi.fn(() => stylesRemoved);
  const api: HighlightApi = {
    registry: {
      set: (name, highlight) => {
        highlights.set(name, (highlight as { ranges: readonly Range[] }).ranges);
      },
      delete: (name) => {
        highlights.delete(name);
      },
    },
    createHighlight: (ranges) => ({ ranges }),
    addStyles,
  };
  return { api, highlights, stylesRemoved, addStyles };
}

function rangesIn(doc: Document, count: number): Range[] {
  doc.body.innerHTML = '<p>aa bb cc</p>';
  const text = doc.body.querySelector('p')?.firstChild;
  if (!(text instanceof Text)) {
    throw new Error('expected a text node');
  }
  return Array.from({ length: count }, (_, index) => {
    const range = doc.createRange();
    range.setStart(text, index);
    range.setEnd(text, index + 1);
    return range;
  });
}

afterEach(() => {
  document.body.replaceChildren();
});

describe('createHighlighter', () => {
  it('highlights every match, and gives the current one its own highlight', () => {
    const { api, highlights } = fakeApi();
    const ranges = rangesIn(document, 3);
    createHighlighter(document, api).show(ranges, 1);
    expect(highlights.get('vim-find')).toEqual(ranges);
    expect(highlights.get('vim-find-current')).toEqual([ranges[1]]);
  });

  it('shows no current highlight when the current index is out of range', () => {
    const { api, highlights } = fakeApi();
    const ranges = rangesIn(document, 2);
    createHighlighter(document, api).show(ranges, 5);
    expect(highlights.get('vim-find')).toEqual(ranges);
    expect(highlights.has('vim-find-current')).toBe(false);
  });

  it('removes both highlights when there are no ranges to show', () => {
    const { api, highlights } = fakeApi();
    const highlighter = createHighlighter(document, api);
    highlighter.show(rangesIn(document, 2), 0);
    highlighter.show([], 0);
    expect(highlights.size).toBe(0);
  });

  it('clears the highlights and leaves the DOM exactly as it was', () => {
    const { api, highlights } = fakeApi();
    const ranges = rangesIn(document, 2);
    const before = document.body.innerHTML;
    const highlighter = createHighlighter(document, api);
    highlighter.show(ranges, 0);
    highlighter.clear();
    expect(highlights.size).toBe(0);
    expect(document.body.innerHTML).toBe(before);
  });

  it('does nothing and does not throw when the browser has no highlight API', () => {
    const highlighter = createHighlighter(document, undefined);
    expect(() => {
      highlighter.show(rangesIn(document, 2), 0);
      highlighter.clear();
      highlighter.dispose();
    }).not.toThrow();
  });

  it('adds its stylesheet once when created and removes it on dispose', () => {
    const { api, addStyles, stylesRemoved } = fakeApi();
    const highlighter = createHighlighter(document, api);
    highlighter.show(rangesIn(document, 1), 0);
    highlighter.show(rangesIn(document, 1), 0);
    expect(addStyles).toHaveBeenCalledTimes(1);
    const css = String(addStyles.mock.calls[0]?.[1]);
    expect(css).toContain('::highlight(vim-find)');
    expect(css).toContain('::highlight(vim-find-current)');
    highlighter.dispose();
    expect(stylesRemoved).toHaveBeenCalledTimes(1);
  });

  it('still highlights when the page cannot take a stylesheet', () => {
    const { api, highlights } = fakeApi();
    const ranges = rangesIn(document, 1);
    createHighlighter(document, { ...api, addStyles: () => () => undefined }).show(ranges, 0);
    expect(highlights.get('vim-find')).toEqual(ranges);
  });
});

describe('browserHighlightApi', () => {
  it('is undefined when the browser has no CSS Custom Highlight API', () => {
    // jsdom has no CSS.highlights, so the browser path reports no API (R5.3)
    expect(browserHighlightApi()).toBeUndefined();
  });
});
