import { afterEach, describe, expect, it } from 'vitest';

import { collectSegments, toRange } from './page-text';
import { locateMatches } from './search';

const everythingRendered = (): boolean => true;

afterEach(() => {
  document.body.replaceChildren();
});

function texts(segments: readonly { text: string }[]): string[] {
  return segments.map((segment) => segment.text);
}

describe('collectSegments', () => {
  it('returns text nodes in document order across nested elements', () => {
    document.body.innerHTML = '<p>one <b>two</b></p><p>three</p>';
    expect(texts(collectSegments(document, everythingRendered))).toEqual(['one ', 'two', 'three']);
  });

  it('skips text inside script, style, noscript and textarea', () => {
    document.body.innerHTML =
      '<p>kept</p><script>var hidden = 1;</script><style>p { color: red; }</style>' +
      '<noscript>no js</noscript><textarea>typed value</textarea>';
    expect(texts(collectSegments(document, everythingRendered))).toEqual(['kept']);
  });

  it('skips text whose parent is not rendered and keeps its rendered siblings', () => {
    document.body.innerHTML = '<p id="gone">hidden words</p><p id="shown">visible words</p>';
    const isRendered = (element: Element): boolean => element.id !== 'gone';
    expect(texts(collectSegments(document, isRendered))).toEqual(['visible words']);
  });

  it('skips empty and whitespace-only text nodes', () => {
    document.body.innerHTML = '<p>  </p><p></p><p>text</p>';
    expect(texts(collectSegments(document, everythingRendered))).toEqual(['text']);
  });

  it('does not enter shadow roots', () => {
    document.body.innerHTML = '<div id="host">outside</div>';
    const host = document.getElementById('host');
    host?.attachShadow({ mode: 'open' }).append('inside a shadow root');
    expect(texts(collectSegments(document, everythingRendered))).toEqual(['outside']);
  });

  it('returns the text nodes themselves, so a match can be turned into a range', () => {
    document.body.innerHTML = '<p>hello wo</p><p>rld</p>';
    const segments = collectSegments(document, everythingRendered);
    const [match] = locateMatches(segments, 'world');
    expect(match).toBeDefined();
    if (match === undefined) {
      return;
    }
    expect(toRange(document, match).toString()).toBe('world');
  });
});
