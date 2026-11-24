/** Most matches that are found and highlighted; past this the count reads "10000+" (design: error handling). */
export const MAX_MATCHES = 10_000;

/** A piece of page text, with the node it came from. Tests use plain values for the node. */
export interface TextSegment<N> {
  readonly node: N;
  readonly text: string;
}

/** A match from one point in a node to another, both ends inside a segment's text. */
export interface MatchSpan<N> {
  readonly start: { readonly node: N; readonly offset: number };
  readonly end: { readonly node: N; readonly offset: number };
}

/** Smart case (R3.5): a query with an uppercase letter matches that exact case. */
export function isCaseSensitive(query: string): boolean {
  return query !== query.toLowerCase();
}

/**
 * Lower-cases one UTF-16 unit at a time and keeps the unit when the lower case
 * would change the length, so offsets into the folded text match the original.
 */
function foldKeepingLength(text: string): string {
  let folded = '';
  for (let index = 0; index < text.length; index += 1) {
    const unit = text.charAt(index);
    const lower = unit.toLowerCase();
    folded += lower.length === 1 ? lower : unit;
  }
  return folded;
}

/** Index of the segment whose span holds `position`; `end` allows the position at a span's end. */
function segmentIndex(
  spans: readonly { readonly start: number; readonly length: number }[],
  position: number,
  from: number,
  end: boolean,
): number {
  let index = from;
  const stillBefore = (span: { readonly start: number; readonly length: number }): boolean =>
    end ? position > span.start + span.length : position >= span.start + span.length;
  while (index < spans.length - 1) {
    const span = spans[index];
    if (span === undefined || !stillBefore(span)) {
      break;
    }
    index += 1;
  }
  return index;
}

/**
 * Every non-overlapping match of `query` in the page text, in document order.
 * The segments are read as one string, so a match can cross node boundaries
 * (R3.3). An empty query has no matches. At most MAX_MATCHES are returned.
 */
export function locateMatches<N>(
  segments: readonly TextSegment<N>[],
  query: string,
): readonly MatchSpan<N>[] {
  if (query === '' || segments.length === 0) {
    return [];
  }
  const caseSensitive = isCaseSensitive(query);
  const fold = (text: string): string => (caseSensitive ? text : foldKeepingLength(text));
  // One pass gives each segment's start in the joined text (linear, so 10,000 nodes stay fast)
  const spans: { node: N; start: number; length: number }[] = [];
  let joined = 0;
  for (const segment of segments) {
    spans.push({ node: segment.node, start: joined, length: segment.text.length });
    joined += segment.text.length;
  }
  const haystack = segments.map((segment) => fold(segment.text)).join('');
  const needle = fold(query);

  const matches: MatchSpan<N>[] = [];
  let from = 0;
  let startIndex = 0;
  while (matches.length < MAX_MATCHES) {
    const at = haystack.indexOf(needle, from);
    if (at === -1) {
      break;
    }
    const stop = at + needle.length;
    startIndex = segmentIndex(spans, at, startIndex, false);
    const endIndex = segmentIndex(spans, stop, startIndex, true);
    const startSpan = spans[startIndex];
    const endSpan = spans[endIndex];
    if (startSpan !== undefined && endSpan !== undefined) {
      matches.push({
        start: { node: startSpan.node, offset: at - startSpan.start },
        end: { node: endSpan.node, offset: stop - endSpan.start },
      });
    }
    // Non-overlapping: the next search starts after this match
    from = stop;
  }
  return matches;
}
