import { deepActiveElement, isEditable, type ShadowRootOf } from './editable';

/**
 * Calls `onChange` with whether an editable element has focus, whenever focus
 * moves in `win`. It can report the same value twice in a row. Focus moving
 * between two elements inside one shadow root sends no event to `win`; the
 * modes' per-key `editableFocused()` check covers that case.
 * Returns a function that stops watching.
 */
export function watchFocus(
  win: Window,
  shadowRootOf: ShadowRootOf,
  onChange: (editableFocused: boolean) => void,
): () => void {
  const doc = win.document;

  // A closed shadow root retargets the event to its host, so ask the document
  const onFocusIn = (): void => {
    onChange(isEditable(deepActiveElement(doc, shadowRootOf)));
  };

  const onFocusOut = (event: FocusEvent): void => {
    if (event.relatedTarget instanceof Element && isEditable(event.relatedTarget)) {
      return;
    }
    // The window itself is losing focus; the next focusin decides
    if (!doc.hasFocus()) {
      return;
    }
    onChange(false);
  };

  win.addEventListener('focusin', onFocusIn, { capture: true });
  win.addEventListener('focusout', onFocusOut, { capture: true });
  return () => {
    win.removeEventListener('focusin', onFocusIn, { capture: true });
    win.removeEventListener('focusout', onFocusOut, { capture: true });
  };
}
