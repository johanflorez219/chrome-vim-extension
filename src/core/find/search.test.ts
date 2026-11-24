import { describe, expect, it } from 'vitest';

import { isCaseSensitive, locateMatches, MAX_MATCHES, type TextSegment } from './search';

/** Plain string nodes stand in for Text nodes. */
function segments(...texts: string[]): TextSegment<string>[] {
  return texts.map((text, index) => ({ node: `n${String(index)}`, text }));
}

describe('isCaseSensitive', () => {
  it('is case-insensitive for a query with no uppercase letter', () => {
    expect(isCaseSensitive('foo')).toBe(false);
    expect(isCaseSensitive('')).toBe(false);
  });

  it('is case-sensitive as soon as the query has an uppercase letter', () => {
    expect(isCaseSensitive('Foo')).toBe(true);
    expect(isCaseSensitive('FOO')).toBe(true);
    expect(isCaseSensitive('fooB')).toBe(true);
  });
});

describe('locateMatches', () => {
  it('finds every non-overlapping match in document order', () => {
    const found = locateMatches(segments('aaaa'), 'aa');
    expect(found.map((match) => match.start.offset)).toEqual([0, 2]);
  });

  it('matches any case when the query has no uppercase letter', () => {
    const found = locateMatches(segments('Foo foo FOO'), 'foo');
    expect(found).toHaveLength(3);
  });

  it('matches only the exact case when the query has an uppercase letter', () => {
    const found = locateMatches(segments('Foo foo FOO'), 'Foo');
    expect(found.map((match) => match.start.offset)).toEqual([0]);
  });

  it('gives the start and end nodes of a match that spans two segments', () => {
    const found = locateMatches(segments('hello wo', 'rld!'), 'world');
    expect(found).toEqual([
      {
        start: { node: 'n0', offset: 6 },
        end: { node: 'n1', offset: 3 },
      },
    ]);
  });

  it('keeps offsets right after non-ASCII text in an earlier segment', () => {
    // Folding keeps each character's length, so offsets in later segments stay exact
    const found = locateMatches(segments('ÀB', 'xab'), 'ab');
    expect(found).toHaveLength(1);
    expect(found[0]?.start).toEqual({ node: 'n1', offset: 1 });
    expect(found[0]?.end).toEqual({ node: 'n1', offset: 3 });
  });

  it('returns nothing for an empty query or a query with no hits', () => {
    expect(locateMatches(segments('abc'), '')).toEqual([]);
    expect(locateMatches(segments('abc'), 'z')).toEqual([]);
    expect(locateMatches([], 'a')).toEqual([]);
  });

  it('stops at the match cap', () => {
    const text = 'a'.repeat(MAX_MATCHES + 5);
    expect(locateMatches(segments(text), 'a')).toHaveLength(MAX_MATCHES);
  });
});
