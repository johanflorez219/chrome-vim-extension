import type { MatchSpan, TextSegment } from './search';

/** Elements whose text is code or form data, never page text the user reads (R3.7). */
const SKIPPED_PARENTS: ReadonlySet<string> = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA']);

/**
 * Rendered text nodes of `doc`, in document order. A text node is skipped when its
 * parent is a script, style, noscript or textarea, when it is only whitespace, or when
 * its parent is not rendered (display: none, visibility: hidden). Shadow roots are not
 * entered: a TreeWalker stops at them (requirements, Out of scope). `isRendered` is
 * called once per parent element, so one walk reads each element's layout at most once.
 */
export function collectSegments(
  doc: Document,
  isRendered: (element: Element) => boolean,
): readonly TextSegment<Text>[] {
  const renderedCache = new Map<Element, boolean>();
  const rendered = (element: Element): boolean => {
    const known = renderedCache.get(element);
    if (known !== undefined) {
      return known;
    }
    const value = isRendered(element);
    renderedCache.set(element, value);
    return value;
  };

  const accept = (node: Node): number => {
    if (!(node instanceof Text)) {
      return NodeFilter.FILTER_REJECT;
    }
    const parent = node.parentElement;
    if (parent === null || SKIPPED_PARENTS.has(parent.tagName) || node.data.trim() === '') {
      return NodeFilter.FILTER_REJECT;
    }
    return rendered(parent) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
  };

  const walker = doc.createTreeWalker(doc.documentElement, NodeFilter.SHOW_TEXT, {
    acceptNode: accept,
  });
  const segments: TextSegment<Text>[] = [];
  for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
    if (node instanceof Text) {
      segments.push({ node, text: node.data });
    }
  }
  return segments;
}

/** A DOM Range covering one match, ready for the highlighter and for scrolling. */
export function toRange(doc: Document, match: MatchSpan<Text>): Range {
  const range = doc.createRange();
  range.setStart(match.start.node, match.start.offset);
  range.setEnd(match.end.node, match.end.offset);
  return range;
}
