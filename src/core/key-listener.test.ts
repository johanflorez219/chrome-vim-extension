import { afterEach, describe, expect, it, vi } from 'vitest';

import { listenForKeys } from './key-listener';

function keydown(target: EventTarget, init: KeyboardEventInit): void {
  target.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, ...init }));
}

describe('listenForKeys', () => {
  let stop: (() => void) | undefined;

  afterEach(() => {
    stop?.();
    stop = undefined;
  });

  it('reports each key press in Vim notation', () => {
    const onKey = vi.fn();
    stop = listenForKeys(window, onKey);

    keydown(document.body, { key: 'j' });
    keydown(document.body, { key: 'd', ctrlKey: true });

    expect(onKey.mock.calls).toEqual([['j'], ['<C-d>']]);
  });

  it('skips keys that have no notation, such as a lone Shift', () => {
    const onKey = vi.fn();
    stop = listenForKeys(window, onKey);

    keydown(document.body, { key: 'Shift', shiftKey: true });

    expect(onKey).not.toHaveBeenCalled();
  });

  it('sees keys before page listeners that stop propagation', () => {
    const onKey = vi.fn();
    const pageHandler = (event: Event): void => {
      event.stopImmediatePropagation();
    };
    document.addEventListener('keydown', pageHandler, { capture: true });
    stop = listenForKeys(window, onKey);

    keydown(document.body, { key: 'k' });
    document.removeEventListener('keydown', pageHandler, { capture: true });

    expect(onKey).toHaveBeenCalledWith('k');
  });

  it('stops reporting keys after the returned function is called', () => {
    const onKey = vi.fn();
    listenForKeys(window, onKey)();

    keydown(document.body, { key: 'j' });

    expect(onKey).not.toHaveBeenCalled();
  });
});
