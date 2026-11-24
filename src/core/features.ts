import { createFindCommands } from './commands/find';
import { createHelpCommands } from './commands/help';
import type { Command } from './commands/registry';
import { collectSegments, toRange } from './find/page-text';
import { createFindSession, type FindSession } from './find/session';
import { createHighlighter, type HighlightApi } from './find/highlighter';
import type { HelpEntry } from './help/entries';
import { createFindMode } from './modes/find';
import { createHelpMode } from './modes/help';
import type { Mode, ModeMachine } from './mode-machine';
import { createFindBar } from '../ui/find-bar';
import { createHelpDialog } from '../ui/help-dialog';
import type { UiRoot } from '../ui/shadow-root';

/** The help feature: its mode, the `?` command, and the dialog it opens (R2). */
interface HelpFeature {
  readonly mode: Mode;
  readonly commands: readonly Command[];
}

/**
 * Builds the help feature. The controller passes the machine and the registry's
 * entries lazily, because both are created after this feature.
 */
export function createHelpFeature(deps: {
  readonly machine: Pick<ModeMachine, 'enter'>;
  readonly mount: () => UiRoot;
  readonly entries: () => readonly HelpEntry[];
}): HelpFeature {
  return {
    mode: createHelpMode({
      machine: deps.machine,
      dialog: createHelpDialog({ mount: deps.mount }),
      entries: deps.entries,
    }),
    commands: createHelpCommands({ machine: deps.machine }),
  };
}

/** The find feature: the search, its mode, its commands, and its highlights (R3, R4, R5). */
export interface FindFeature {
  readonly mode: Mode;
  readonly commands: readonly Command[];
  readonly session: FindSession;
  /** Removes the highlight stylesheet. Called when the controller stops. */
  dispose(): void;
}

/** Scrolls so the start of the range is visible, at the nearest position (R4.1). */
function revealRange(range: Range): void {
  const node = range.startContainer;
  const element = node instanceof Element ? node : node.parentElement;
  element?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}

/** The first match whose box ends at or below the viewport top, or the first match (R3.4). */
function firstAtOrBelowTop(ranges: readonly Range[]): number {
  const index = ranges.findIndex((range) => range.getBoundingClientRect().bottom >= 0);
  return index === -1 ? 0 : index;
}

/** Builds the find feature over the live page. Layout reads are injected through `isRendered`. */
export function createFindFeature(deps: {
  readonly machine: Pick<ModeMachine, 'enter'>;
  readonly mount: () => UiRoot;
  readonly document: Document;
  readonly isRendered: (element: Element) => boolean;
  readonly api: HighlightApi | undefined;
}): FindFeature {
  const highlighter = createHighlighter(deps.document, deps.api);
  const session = createFindSession({
    collect: () => collectSegments(deps.document, deps.isRendered),
    toRange: (match) => toRange(deps.document, match),
    highlighter,
    reveal: revealRange,
    firstAtOrBelowTop,
  });
  return {
    mode: createFindMode({
      machine: deps.machine,
      session,
      bar: createFindBar({ mount: deps.mount }),
    }),
    commands: createFindCommands({ machine: deps.machine, session }),
    session,
    dispose: () => {
      highlighter.dispose();
    },
  };
}
