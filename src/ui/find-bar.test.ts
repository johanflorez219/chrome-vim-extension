import { afterEach, describe, expect, it } from 'vitest';

import { createFindBar } from './find-bar';
import type { UiRoot } from './shadow-root';

afterEach(() => {
  document.body.replaceChildren();
});

/** A UI root in an open shadow root, so the test can read what the bar drew. */
function fakeMount(): { mount: () => UiRoot; roots: ShadowRoot[] } {
  const roots: ShadowRoot[] = [];
  const mount = (): UiRoot => {
    const host = document.createElement('div');
    document.body.append(host);
    const root = host.attachShadow({ mode: 'open' });
    roots.push(root);
    return {
      root,
      unmount: () => {
        host.remove();
      },
    };
  };
  return { mount, roots };
}

const NONE = { current: 0, total: 0, capped: false };

describe('createFindBar', () => {
  it('shows only the prompt when the query is empty (R3.1)', () => {
    const { mount, roots } = fakeMount();
    createFindBar({ mount }).show('', NONE);
    expect(roots[0]?.querySelector('.prompt')?.textContent).toBe('/');
    expect(roots[0]?.querySelector('.count')?.textContent).toBe('');
  });

  it('shows the query and the position as current/total (R4.6)', () => {
    const { mount, roots } = fakeMount();
    createFindBar({ mount }).show('foo', { current: 2, total: 7, capped: false });
    expect(roots[0]?.querySelector('.query')?.textContent).toBe('foo');
    expect(roots[0]?.querySelector('.count')?.textContent).toBe('2/7');
  });

  it('shows 0/0 for a query with no matches (R3.6)', () => {
    const { mount, roots } = fakeMount();
    createFindBar({ mount }).show('zzz', NONE);
    expect(roots[0]?.querySelector('.count')?.textContent).toBe('0/0');
  });

  it('marks a capped count with a plus sign', () => {
    const { mount, roots } = fakeMount();
    createFindBar({ mount }).show('a', { current: 1, total: 10_000, capped: true });
    expect(roots[0]?.querySelector('.count')?.textContent).toBe('1/10000+');
  });

  it('mounts on show and removes itself on hide', () => {
    const { mount, roots } = fakeMount();
    const bar = createFindBar({ mount });
    bar.show('a', NONE);
    bar.hide();
    expect(roots[0]?.host.isConnected).toBe(false);
    bar.show('b', NONE);
    expect(roots).toHaveLength(2);
    bar.hide();
  });

  it('does nothing on hide when nothing is shown', () => {
    const { mount, roots } = fakeMount();
    createFindBar({ mount }).hide();
    expect(roots).toHaveLength(0);
  });

  it('draws the query with textContent, so markup in it stays text (NFR3.1)', () => {
    const { mount, roots } = fakeMount();
    createFindBar({ mount }).show('<b>x</b>', NONE);
    expect(roots[0]?.querySelector('b')).toBeNull();
    expect(roots[0]?.querySelector('.query')?.textContent).toBe('<b>x</b>');
  });
});
