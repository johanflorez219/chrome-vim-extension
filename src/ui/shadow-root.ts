/** A host element in the top layer with a closed shadow root for our own UI. */
export interface UiRoot {
  readonly root: ShadowRoot;
  /** Removes the host from the page. Safe to call twice or after the page removed it. */
  unmount(): void;
}

// Inline !important beats any page rule (R2.6, R7.5). `all: initial` also overrides the
// popover's UA style, so the host still shows when showPopover fails. z-index is the
// fallback when the top layer is not available.
const HOST_STYLE = [
  'all: initial',
  'position: fixed',
  'inset: 0',
  'margin: 0',
  'padding: 0',
  'border: 0',
  'background: transparent',
  'pointer-events: none',
  'z-index: 2147483647',
]
  .map((declaration) => `${declaration} !important`)
  .join('; ');

/**
 * Appends one host with a closed shadow root to the page and shows it in the top
 * layer, above the page's own stacking and modal dialogs (R2.6). Hints are drawn
 * inside the root, so page CSS cannot reach them.
 */
export function mountUiRoot(doc: Document): UiRoot {
  const host = doc.createElement('vim-hints');
  host.setAttribute('popover', 'manual');
  host.setAttribute('aria-hidden', 'true');
  host.setAttribute('style', HOST_STYLE);
  const root = host.attachShadow({ mode: 'closed' });
  doc.documentElement.append(host);
  try {
    host.showPopover();
  } catch {
    // No popover API (jsdom, an old engine) or the call was refused: the fixed host still sits on top
  }
  return {
    root,
    unmount: () => {
      host.remove();
    },
  };
}
