import type { HudView } from '../core/hud';

import type { UiRoot } from './shadow-root';

/**
 * The corner badge with the mode and pending keys (R1.1, R1.5, R1.6). It hides itself when
 * it has nothing to show, such as normal mode with no keys pending.
 */
export interface Hud {
  update(view: HudView): void;
  unmount(): void;
}

const STYLE = [
  '.hud { position: absolute; right: 8px; bottom: 8px; box-sizing: border-box; padding: 2px 8px;',
  'font: 12px/1.4 ui-monospace, monospace; color: #fff; background: #1d1d1f;',
  'border-radius: 4px; white-space: nowrap; }',
  '.pending { color: #ffd94a; margin-left: 6px; }',
  '.position { color: #9fd4ff; margin-left: 6px; }',
  '[hidden] { display: none; }',
].join(' ');

/**
 * Mounts the HUD once. Every update writes text with `textContent`, so nothing the
 * page could set ever becomes markup (NFR3.1). The host is shown with
 * `pointer-events: none` by mountUiRoot, so clicks still reach the page (R1.5).
 */
export function createHud(deps: { readonly mount: () => UiRoot }): Hud {
  const ui = deps.mount();
  const doc = ui.root.ownerDocument;
  const style = doc.createElement('style');
  style.textContent = STYLE;

  const box = doc.createElement('div');
  box.className = 'hud';
  const mode = doc.createElement('span');
  const pending = doc.createElement('span');
  pending.className = 'pending';
  const position = doc.createElement('span');
  position.className = 'position';
  box.append(mode, pending, position);
  ui.root.append(style, box);

  return {
    update: (view) => {
      // Nothing to show in normal mode with no keys pending or position: hide the badge.
      box.hidden = view.mode === '' && view.pending === '' && view.position === '';
      mode.textContent = view.mode;
      pending.textContent = view.pending;
      pending.hidden = view.pending === '';
      position.textContent = view.position;
      position.hidden = view.position === '';
    },
    unmount: () => {
      ui.unmount();
    },
  };
}
