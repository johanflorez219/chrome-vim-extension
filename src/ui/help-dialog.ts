import type { HelpEntry } from '../core/help/entries';

import type { UiRoot } from './shadow-root';

/** The `?` overlay: every command and its keys, shown until hidden (R2.1-R2.3). */
export interface HelpDialog {
  show(entries: readonly HelpEntry[]): void;
  hide(): void;
}

type Context = HelpEntry['context'];

const CONTEXTS: readonly Context[] = ['page', 'background'];

// Pointer events are off, so a click on the dialog reaches the page and the dialog stays open (R6.2)
const STYLE = [
  '.dialog { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);',
  'box-sizing: border-box; width: min(640px, 90vw); max-height: 80vh; overflow: auto;',
  'padding: 16px 20px; font: 13px/1.5 system-ui, sans-serif; color: #111; background: #fff;',
  'border-radius: 8px; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3); pointer-events: none; }',
  'h1 { font-size: 15px; margin: 0 0 8px; }',
  'h2 { font-size: 13px; margin: 12px 0 4px; }',
  '.row { display: flex; gap: 12px; }',
  '.keys { min-width: 110px; font: bold 12px ui-monospace, monospace; }',
  '[hidden] { display: none; }',
].join(' ');

function sectionTitle(context: Context): string {
  switch (context) {
    case 'page':
      return 'In the page';
    case 'background':
      return 'Browser';
  }
}

function createRow(doc: Document, entry: HelpEntry): HTMLDivElement {
  const row = doc.createElement('div');
  row.className = 'row';
  const keys = doc.createElement('span');
  keys.className = 'keys';
  keys.textContent = entry.keys.join(' ');
  const description = doc.createElement('span');
  description.textContent = entry.description;
  row.append(keys, description);
  return row;
}

/** One heading and its rows, or nothing when no entry belongs to `context`. */
function createSection(
  doc: Document,
  context: Context,
  entries: readonly HelpEntry[],
): HTMLElement | undefined {
  const rows = entries.filter((entry) => entry.context === context);
  if (rows.length === 0) {
    return undefined;
  }
  const section = doc.createElement('section');
  const heading = doc.createElement('h2');
  heading.textContent = sectionTitle(context);
  section.append(heading, ...rows.map((entry) => createRow(doc, entry)));
  return section;
}

function createPanel(doc: Document, entries: readonly HelpEntry[]): HTMLElement {
  const panel = doc.createElement('div');
  panel.className = 'dialog';
  const title = doc.createElement('h1');
  title.textContent = 'Keys';
  panel.append(title);
  for (const context of CONTEXTS) {
    const section = createSection(doc, context, entries);
    if (section !== undefined) {
      panel.append(section);
    }
  }
  return panel;
}

/** Mounts the dialog in its own UI root when shown, and removes it when hidden. */
export function createHelpDialog(deps: { readonly mount: () => UiRoot }): HelpDialog {
  let ui: UiRoot | undefined;

  const hide = (): void => {
    ui?.unmount();
    ui = undefined;
  };

  return {
    show: (entries) => {
      hide();
      const mounted = deps.mount();
      ui = mounted;
      const doc = mounted.root.ownerDocument;
      const style = doc.createElement('style');
      style.textContent = STYLE;
      mounted.root.append(style, createPanel(doc, entries));
    },
    hide,
  };
}
