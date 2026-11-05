import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ShadowRootOf } from './editable';
import { watchFocus } from './focus-watcher';

// jsdom clears its focused element before firing focusout, so its real
// hasFocus() is always false there; tests decide it instead.
function windowHasFocus(value: boolean): void {
  vi.spyOn(document, 'hasFocus').mockReturnValue(value);
}

function add<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attributes: Record<string, string> = {},
  parent: Node = document.body,
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  for (const [name, value] of Object.entries(attributes)) {
    element.setAttribute(name, value);
  }
  parent.appendChild(element);
  return element;
}

describe('watchFocus', () => {
  const closedRoots = new Map<Element, ShadowRoot>();
  const shadowRootOf: ShadowRootOf = (host) => closedRoots.get(host) ?? host.shadowRoot;
  let onChange: ReturnType<typeof vi.fn<(editableFocused: boolean) => void>>;
  let stop: (() => void) | undefined;

  function closedInput(): { host: HTMLDivElement; input: HTMLInputElement } {
    const host = add('div');
    const root = host.attachShadow({ mode: 'closed' });
    closedRoots.set(host, root);
    return { host, input: add('input', {}, root) };
  }

  beforeEach(() => {
    windowHasFocus(true);
    onChange = vi.fn<(editableFocused: boolean) => void>();
    stop = watchFocus(window, shadowRootOf, onChange);
  });

  afterEach(() => {
    stop?.();
    stop = undefined;
    closedRoots.clear();
    document.body.replaceChildren();
  });

  it('reports true when a text input gains focus', () => {
    add('input').focus();

    expect(onChange.mock.calls).toEqual([[true]]);
  });

  it('reports false when a checkbox gains focus', () => {
    add('input', { type: 'checkbox' }).focus();

    expect(onChange.mock.calls).toEqual([[false]]);
  });

  it('reports true when an input inside a closed shadow root gains focus', () => {
    const { host, input } = closedInput();

    input.focus();

    expect(document.activeElement).toBe(host);
    expect(onChange.mock.calls).toEqual([[true]]);
  });

  it('reports false when an editable element loses focus to nothing', () => {
    const input = add('input');
    input.focus();
    onChange.mockClear();

    input.blur();

    expect(onChange.mock.calls).toEqual([[false]]);
  });

  it('stays silent on focusout when focus moves to another editable element', () => {
    add('input').focus();
    onChange.mockClear();

    add('textarea').focus();

    expect(onChange.mock.calls).toEqual([[true]]);
  });

  it('reports false when focus moves from a text field to a checkbox', () => {
    add('input').focus();
    onChange.mockClear();

    add('input', { type: 'checkbox' }).focus();

    expect(onChange).not.toHaveBeenCalledWith(true);
    expect(onChange).toHaveBeenLastCalledWith(false);
  });

  it('ends in true when focus moves from a text field into a closed shadow root input', () => {
    const { input } = closedInput();
    add('input').focus();
    onChange.mockClear();

    input.focus();

    expect(onChange).toHaveBeenLastCalledWith(true);
  });

  it('does nothing when the window loses focus', () => {
    const input = add('input');
    input.focus();
    onChange.mockClear();
    windowHasFocus(false);

    input.blur();

    expect(onChange).not.toHaveBeenCalled();
  });

  it('stops reporting after the returned function is called', () => {
    stop?.();
    stop = undefined;
    const input = add('input');

    input.focus();
    input.blur();

    expect(onChange).not.toHaveBeenCalled();
  });
});
