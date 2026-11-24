import { afterEach, describe, expect, it, vi } from 'vitest';

import { collectSegments, toRange } from './page-text';
import { createFindSession, type FindSession } from './session';
import type { Highlighter } from './highlighter';
import { MAX_MATCHES } from './search';

const rendered = (): boolean => true;

afterEach(() => {
  document.body.replaceChildren();
});

interface Harness {
  session: FindSession;
  show: ReturnType<typeof vi.fn>;
  clear: ReturnType<typeof vi.fn>;
  reveal: ReturnType<typeof vi.fn>;
  firstAtOrBelowTop: ReturnType<typeof vi.fn>;
}

/**
 * A session over real text in jsdom, with the highlighter and scrolling faked.
 * `setText` changes the page, so later `next` calls see the new matches (R4.7).
 */
function harness(initialText: string, topIndex = 0): Harness & { setText: (text: string) => void } {
  const setText = (text: string): void => {
    const paragraph = document.createElement('p');
    paragraph.textContent = text;
    document.body.replaceChildren(paragraph);
  };
  setText(initialText);
  const show = vi.fn();
  const clear = vi.fn();
  const reveal = vi.fn();
  const firstAtOrBelowTop = vi.fn(() => topIndex);
  const highlighter: Highlighter = { show, clear, dispose: () => undefined };
  const session = createFindSession({
    collect: () => collectSegments(document, rendered),
    toRange: (match) => toRange(document, match),
    highlighter,
    reveal,
    firstAtOrBelowTop,
  });
  return { session, show, clear, reveal, firstAtOrBelowTop, setText };
}

describe('createFindSession', () => {
  it('highlights every match on setQuery and sets the position to the first at or below the top', () => {
    const { session, show, firstAtOrBelowTop } = harness('foo bar foo foo', 0);
    session.setQuery('foo');
    expect(session.position).toEqual({ current: 1, total: 3, capped: false });
    expect(firstAtOrBelowTop).toHaveBeenCalledTimes(1);
    const lastCall = show.mock.calls.at(-1) as [readonly Range[], number] | undefined;
    expect(lastCall?.[0]).toHaveLength(3);
    expect(lastCall?.[1]).toBe(0);
  });

  it('uses the index the viewport check returns as the current match (R3.4)', () => {
    const { session } = harness('foo bar foo foo', 2);
    session.setQuery('foo');
    expect(session.position.current).toBe(3);
  });

  it('does not scroll when the query is typed (R3.3)', () => {
    const { session, reveal } = harness('foo foo');
    session.setQuery('foo');
    expect(reveal).not.toHaveBeenCalled();
  });

  it('reveals the current match when asked (R3.4)', () => {
    const { session, reveal } = harness('foo foo');
    session.setQuery('foo');
    session.reveal();
    expect(reveal).toHaveBeenCalledTimes(1);
  });

  it('moves to the next match and reveals it, wrapping from the last to the first (R4.1, R4.3)', () => {
    const { session, reveal } = harness('foo foo');
    session.setQuery('foo');
    session.next(1);
    expect(session.position.current).toBe(2);
    session.next(1);
    expect(session.position.current).toBe(1);
    expect(reveal).toHaveBeenCalledTimes(2);
  });

  it('moves back to the previous match, wrapping from the first to the last (R4.2, R4.3)', () => {
    const { session } = harness('foo foo foo');
    session.setQuery('foo');
    session.previous(1);
    expect(session.position.current).toBe(3);
  });

  it('moves the number of steps it is given, wrapping as needed (R4.5)', () => {
    const { session } = harness('foo foo');
    session.setQuery('foo');
    session.next(3);
    expect(session.position.current).toBe(2);
    session.previous(3);
    expect(session.position.current).toBe(1);
  });

  it('does nothing and reveals nothing with no query (R4.4)', () => {
    const { session, reveal, show } = harness('foo foo');
    session.next(1);
    session.previous(1);
    expect(reveal).not.toHaveBeenCalled();
    expect(show).not.toHaveBeenCalled();
    expect(session.position).toEqual({ current: 0, total: 0, capped: false });
  });

  it('clears the highlights and reveals nothing for an empty query (R3.7)', () => {
    const { session, clear, reveal } = harness('foo foo');
    session.setQuery('foo');
    session.setQuery('');
    expect(clear).toHaveBeenCalled();
    expect(session.position).toEqual({ current: 0, total: 0, capped: false });
    session.reveal();
    expect(reveal).not.toHaveBeenCalled();
  });

  it('shows 0/0 for a query with no matches (R3.6)', () => {
    const { session } = harness('foo foo');
    session.setQuery('zzz');
    expect(session.position).toEqual({ current: 0, total: 0, capped: false });
  });

  it('forgets the query and clears the highlights on clear (R3.8)', () => {
    const { session, clear } = harness('foo foo');
    session.setQuery('foo');
    session.clear();
    expect(session.query).toBe('');
    expect(clear).toHaveBeenCalled();
    expect(session.position).toEqual({ current: 0, total: 0, capped: false });
  });

  it('searches the page again on next, so new text is found (R4.7)', () => {
    const { session, setText } = harness('foo');
    session.setQuery('foo');
    expect(session.position.total).toBe(1);
    setText('foo foo foo');
    session.next(1);
    expect(session.position.total).toBe(3);
  });

  it('keeps the current index in range when matches disappear (R4.7)', () => {
    const { session, setText } = harness('foo foo foo');
    session.setQuery('foo');
    session.next(2);
    setText('foo');
    session.next(0);
    expect(session.position).toEqual({ current: 1, total: 1, capped: false });
  });

  it('reports the cap when the match limit is reached', () => {
    const { session } = harness('a'.repeat(MAX_MATCHES + 3));
    session.setQuery('a');
    expect(session.position).toEqual({ current: 1, total: MAX_MATCHES, capped: true });
  });

  it('remembers the query after setQuery so n and N can use it', () => {
    const { session } = harness('foo');
    session.setQuery('foo');
    expect(session.query).toBe('foo');
  });
});
