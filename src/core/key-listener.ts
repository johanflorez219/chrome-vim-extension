import { toKeyNotation } from './key-notation';

/** Whether the extension used a key (hidden from the page) or let it through. */
export type KeyResult = 'consumed' | 'passed';

/** A key press, in Vim notation, as handed to the extension. */
export interface KeyPress {
  readonly key: string;
  /** True while the key is held down and the browser repeats it. */
  readonly repeat: boolean;
}

/**
 * Calls `onKey` with every key pressed inside `target`, in Vim notation.
 * Listens in the capture phase so page scripts cannot hide keys from us.
 * A consumed key is hidden from the page along with its keyup; passed keys
 * and events the page dispatched itself (`isTrusted` false) are left alone.
 * Returns a function that removes both listeners.
 */
export function listenForKeys(
  target: EventTarget,
  onKey: (press: KeyPress) => KeyResult,
  isTrusted: (event: KeyboardEvent) => boolean,
): () => void {
  // Codes of consumed keys whose keyup the page must not see either
  const swallowed = new Set<string>();

  const onKeydown = (event: Event): void => {
    if (!(event instanceof KeyboardEvent) || !isTrusted(event)) {
      return;
    }
    const key = toKeyNotation(event);
    if (key === undefined) {
      return;
    }
    if (onKey({ key, repeat: event.repeat }) === 'consumed') {
      event.preventDefault();
      event.stopImmediatePropagation();
      swallowed.add(event.code);
    } else {
      swallowed.delete(event.code);
    }
  };

  const onKeyup = (event: Event): void => {
    if (!(event instanceof KeyboardEvent) || !isTrusted(event)) {
      return;
    }
    if (swallowed.delete(event.code)) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  };

  target.addEventListener('keydown', onKeydown, { capture: true });
  target.addEventListener('keyup', onKeyup, { capture: true });
  return () => {
    target.removeEventListener('keydown', onKeydown, { capture: true });
    target.removeEventListener('keyup', onKeyup, { capture: true });
    swallowed.clear();
  };
}
