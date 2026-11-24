import { afterEach, describe, expect, it } from 'vitest';

import type { HelpEntry } from '../core/help/entries';

import { createHelpDialog } from './help-dialog';
import type { UiRoot } from './shadow-root';

afterEach(() => {
  document.body.replaceChildren();
});

/** A UI root in an open shadow root, so the test can read what the dialog drew. */
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

const PAGE_ENTRY: HelpEntry = {
  name: 'scrollDown',
  description: 'Scroll down',
  context: 'page',
  keys: ['j'],
};
const BROWSER_ENTRY: HelpEntry = {
  name: 'tabPrevious',
  description: 'Previous tab',
  context: 'background',
  keys: ['K', 'gT'],
};
const ENTRIES: readonly HelpEntry[] = [PAGE_ENTRY, BROWSER_ENTRY];

describe('createHelpDialog', () => {
  it('writes one row per entry with its keys and description (R2.2)', () => {
    const { mount, roots } = fakeMount();
    createHelpDialog({ mount }).show(ENTRIES);
    const text = roots[0]?.textContent ?? '';
    expect(text).toContain('j');
    expect(text).toContain('Scroll down');
    expect(text).toContain('K gT');
    expect(text).toContain('Previous tab');
  });

  it('groups rows under headings for page and browser commands', () => {
    const { mount, roots } = fakeMount();
    createHelpDialog({ mount }).show(ENTRIES);
    const headings = Array.from(roots[0]?.querySelectorAll('h2') ?? []).map((h) => h.textContent);
    expect(headings).toEqual(['In the page', 'Browser']);
  });

  it('leaves out a heading whose group has no rows', () => {
    const { mount, roots } = fakeMount();
    createHelpDialog({ mount }).show([PAGE_ENTRY]);
    const headings = Array.from(roots[0]?.querySelectorAll('h2') ?? []).map((h) => h.textContent);
    expect(headings).toEqual(['In the page']);
  });

  it('replaces the rows when shown again', () => {
    const { mount, roots } = fakeMount();
    const dialog = createHelpDialog({ mount });
    dialog.show(ENTRIES);
    dialog.show([PAGE_ENTRY]);
    expect(roots).toHaveLength(2);
    expect(roots[0]?.host.isConnected).toBe(false);
    expect(roots[1]?.textContent).not.toContain('Previous tab');
    dialog.hide();
  });

  it('unmounts on hide, and hide with nothing shown does nothing', () => {
    const { mount, roots } = fakeMount();
    const dialog = createHelpDialog({ mount });
    dialog.hide();
    dialog.show(ENTRIES);
    dialog.hide();
    dialog.hide();
    expect(roots[0]?.host.isConnected).toBe(false);
  });

  it('draws with pointer events off, so clicks reach the page (R6.2)', () => {
    const { mount, roots } = fakeMount();
    createHelpDialog({ mount }).show(ENTRIES);
    const style = roots[0]?.querySelector('style')?.textContent ?? '';
    expect(style).toMatch(/\.dialog \{[^}]*pointer-events: none/);
  });

  it('writes page text with textContent, so markup in a description stays text (NFR3.1)', () => {
    const { mount, roots } = fakeMount();
    createHelpDialog({ mount }).show([
      { name: 'reload', description: '<img src=x>', context: 'page', keys: ['r'] },
    ]);
    expect(roots[0]?.querySelector('img')).toBeNull();
    expect(roots[0]?.textContent).toContain('<img src=x>');
  });
});
