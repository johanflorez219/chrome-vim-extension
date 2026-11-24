import type { FindPosition } from '../core/find/session';
import { positionText } from '../core/hud';

import type { UiRoot } from './shadow-root';

/** The `/` bar at the bottom left, drawn while find mode is on (R3.1, R3.6). */
interface FindBar {
  show(query: string, position: FindPosition): void;
  hide(): void;
}

const STYLE = [
  '.bar { position: absolute; left: 8px; bottom: 8px; box-sizing: border-box; padding: 2px 8px;',
  'font: 13px/1.4 ui-monospace, monospace; color: #111; background: #fff;',
  'border: 1px solid #888; border-radius: 4px; white-space: nowrap; }',
  '.count { color: #555; margin-left: 10px; }',
].join(' ');

interface BarElements {
  readonly query: HTMLSpanElement;
  readonly count: HTMLSpanElement;
}

function createBar(doc: Document, ui: UiRoot): BarElements {
  const style = doc.createElement('style');
  style.textContent = STYLE;
  const box = doc.createElement('div');
  box.className = 'bar';
  const prompt = doc.createElement('span');
  prompt.className = 'prompt';
  prompt.textContent = '/';
  const query = doc.createElement('span');
  query.className = 'query';
  const count = doc.createElement('span');
  count.className = 'count';
  box.append(prompt, query, count);
  ui.root.append(style, box);
  return { query, count };
}

/**
 * Draws the bar with textContent only (NFR3.1). It mounts on the first show and
 * stays until hide, so typing a letter only rewrites two spans.
 */
export function createFindBar(deps: { readonly mount: () => UiRoot }): FindBar {
  let ui: UiRoot | undefined;
  let elements: BarElements | undefined;

  const hide = (): void => {
    ui?.unmount();
    ui = undefined;
    elements = undefined;
  };

  return {
    show: (query, position) => {
      if (ui === undefined) {
        ui = deps.mount();
        elements = createBar(ui.root.ownerDocument, ui);
      }
      if (elements !== undefined) {
        elements.query.textContent = query;
        // An empty query shows no count: there is nothing to count yet (R3.1)
        elements.count.textContent = query === '' ? '' : positionText(position);
      }
    },
    hide,
  };
}
