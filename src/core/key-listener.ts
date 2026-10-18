import { toKeyNotation } from './key-notation';

/**
 * Calls `onKey` with the Vim notation of every key pressed inside `target`.
 * Listens in the capture phase so page scripts cannot hide keys from us.
 * Returns a function that removes the listener.
 */
export function listenForKeys(target: EventTarget, onKey: (key: string) => void): () => void {
  const handler = (event: Event): void => {
    if (!(event instanceof KeyboardEvent)) {
      return;
    }
    const key = toKeyNotation(event);
    if (key !== undefined) {
      onKey(key);
    }
  };

  target.addEventListener('keydown', handler, { capture: true });
  return () => {
    target.removeEventListener('keydown', handler, { capture: true });
  };
}
