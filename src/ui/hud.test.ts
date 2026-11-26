import { afterEach, describe, expect, it, vi } from 'vitest';

import type { UiRoot } from './shadow-root';
import { createHud } from './hud';

afterEach(() => {
  document.body.replaceChildren();
});

/** A UI root in an open shadow root, so the test can read what the HUD drew. */
function fakeRoot(): { ui: UiRoot; host: Element; unmount: ReturnType<typeof vi.fn> } {
  const host = document.createElement('div');
  document.body.append(host);
  const root = host.attachShadow({ mode: 'open' });
  const unmount = vi.fn(() => {
    host.remove();
  });
  return { ui: { root, unmount }, host, unmount };
}

describe('createHud', () => {
  it('mounts once, when it is created', () => {
    const { ui } = fakeRoot();
    const mount = vi.fn(() => ui);
    const hud = createHud({ mount });
    hud.update({ mode: 'NORMAL', pending: '', position: '' });
    hud.update({ mode: 'INSERT', pending: '', position: '' });
    expect(mount).toHaveBeenCalledTimes(1);
    hud.unmount();
  });

  it('writes the mode, pending keys and position as text', () => {
    const { ui } = fakeRoot();
    const hud = createHud({ mount: () => ui });
    hud.update({ mode: 'INSERT', pending: '5g', position: '2/7' });
    const text = ui.root.textContent;
    expect(text).toContain('INSERT');
    expect(text).toContain('5g');
    expect(text).toContain('2/7');
    hud.unmount();
  });

  it('replaces the text on each update', () => {
    const { ui } = fakeRoot();
    const hud = createHud({ mount: () => ui });
    hud.update({ mode: 'NORMAL', pending: '5g', position: '' });
    hud.update({ mode: 'HINT', pending: '', position: '' });
    expect(ui.root.textContent).toContain('HINT');
    expect(ui.root.textContent).not.toContain('5g');
    hud.unmount();
  });

  it('draws the page text literally, so a page cannot inject markup (NFR3.1)', () => {
    const { ui } = fakeRoot();
    const hud = createHud({ mount: () => ui });
    hud.update({ mode: 'NORMAL', pending: '<b>x</b>', position: '' });
    expect(ui.root.querySelector('b')).toBeNull();
    expect(ui.root.textContent).toContain('<b>x</b>');
    hud.unmount();
  });

  it('hides the badge in normal mode when nothing is pending or remembered', () => {
    const { ui } = fakeRoot();
    const hud = createHud({ mount: () => ui });
    hud.update({ mode: '', pending: '', position: '' });
    const box = ui.root.querySelector('.hud');
    expect(box?.hasAttribute('hidden')).toBe(true);
    hud.update({ mode: 'INSERT', pending: '', position: '' });
    expect(box?.hasAttribute('hidden')).toBe(false);
    hud.unmount();
  });

  it('keeps the badge visible in normal mode while keys are pending', () => {
    const { ui } = fakeRoot();
    const hud = createHud({ mount: () => ui });
    hud.update({ mode: '', pending: '5g', position: '' });
    expect(ui.root.querySelector('.hud')?.hasAttribute('hidden')).toBe(false);
    expect(ui.root.textContent).toContain('5g');
    hud.unmount();
  });

  it('removes its root on unmount', () => {
    const { ui, unmount } = fakeRoot();
    const hud = createHud({ mount: () => ui });
    hud.unmount();
    expect(unmount).toHaveBeenCalledTimes(1);
  });
});
