import type { MessageClient } from '../messaging/client';
import { DEFAULT_KEYMAP, HINT_ALPHABET } from '../settings/defaults';

import { createBackgroundCommands } from './commands/background';
import { createNavigationCommands, type PageActions } from './commands/navigation';
import { createCommandRegistry, type Command, type CommandRegistry } from './commands/registry';
import { createScrollCommands } from './commands/scroll';
import { deepActiveElement, isEditable, type ShadowRootOf } from './editable';
import { watchFocus } from './focus-watcher';
import { listenForKeys } from './key-listener';
import { buildKeymapTrie } from './keymap-trie';
import { createModeMachine, type ModeMachine } from './mode-machine';
import { createInsertMode } from './modes/insert';
import { createHintMode, type HintMode } from './modes/hint';
import { createHintCommands } from './commands/hints';
import { hudView } from './hud';
import { createFindFeature, createHelpFeature, type FindFeature } from './features';
import type { FindPosition } from './find/session';
import { browserHighlightApi } from './find/highlighter';
import { helpEntries } from './help/entries';
import type { Finder } from './hints/finder';
import type { ScrollTargetTracker } from './scroll/scroll-target';
import { createHintActions } from './hints/actions';
import { createFinder } from './hints/finder';
import type { Geometry } from './hints/geometry';
import { watchPage } from './hints/page-watch';
import { createHintOverlay } from '../ui/hints';
import { createHud } from '../ui/hud';
import type { ModeName } from './mode-machine';
import { mountUiRoot } from '../ui/shadow-root';
import { createNormalMode, type Timer } from './modes/normal';
import type { Mode } from './mode-machine';
import { createScrollTargetTracker } from './scroll/scroll-target';
import { createScroller, type FrameScheduler, type Scroller } from './scroll/scroller';

export interface ControllerDeps {
  readonly window: Window;
  readonly timer: Timer;
  readonly frames: FrameScheduler;
  readonly now: () => number;
  /** False once the extension is reloaded or disabled (R1.4). */
  readonly isValid: () => boolean;
  /** `event.isTrusted` in the extension. */
  readonly isTrusted: (event: KeyboardEvent) => boolean;
  /** chrome.dom.openOrClosedShadowRoot in the extension (R3.2). */
  readonly shadowRootOf: ShadowRootOf;
  /** matchMedia in the extension, which jsdom lacks (NFR2). */
  readonly prefersReducedMotion: () => boolean;
  /** location and the clipboard in the extension (R7, R8, R9). */
  readonly page: PageActions;
  /** Hands background commands to the service worker (R1.3), and opens links in a new tab (R5.2). */
  readonly client: Pick<MessageClient, 'sendCommand' | 'openTab'>;
  /** Layout reads and hit tests: createDomGeometry in the extension (R1.2, R1.3). */
  readonly geometry: Geometry;
}

export interface Controller {
  stop(): void;
}

function blurElement(element: Element | null): void {
  if (element instanceof HTMLElement) {
    element.blur();
  }
}

/**
 * Hint mode and everything it uses. `machine` is read only when Hint mode switches
 * modes, after the machine exists. Building these objects reads no layout (NFR1.3).
 */
function createHints(
  deps: ControllerDeps,
  parts: {
    readonly scroller: Pick<Scroller, 'stop'>;
    readonly machine: () => Pick<ModeMachine, 'enter'>;
  },
): { readonly hint: HintMode; readonly finder: Finder } {
  const finder = createFinder({
    document: deps.window.document,
    shadowRootOf: deps.shadowRootOf,
    geometry: deps.geometry,
  });
  const hint = createHintMode({
    machine: {
      enter: (name, options) => {
        parts.machine().enter(name, options);
      },
    },
    finder,
    overlay: createHintOverlay({
      mount: () => mountUiRoot(deps.window.document),
      viewport: () => deps.geometry.viewport(),
    }),
    alphabet: HINT_ALPHABET,
    perform: createHintActions({
      geometry: deps.geometry,
      writeClipboard: (text) => deps.page.writeClipboard(text),
      client: deps.client,
    }),
    stopScrolling: () => {
      parts.scroller.stop();
    },
    watchPage: (hinted, onChange) =>
      watchPage({ window: deps.window, frames: deps.frames }, hinted, onChange),
  });
  return { hint, finder };
}

/** The commands, in the order the keymap refers to them. */
function createRegistry(
  deps: ControllerDeps,
  parts: {
    readonly scroller: Scroller;
    readonly tracker: ScrollTargetTracker;
    readonly hint: Pick<HintMode, 'start'>;
    readonly finder: Pick<Finder, 'find'>;
    readonly help: readonly Command[];
    readonly find: readonly Command[];
  },
): CommandRegistry {
  return createCommandRegistry([
    ...createScrollCommands({ scroller: parts.scroller, targets: parts.tracker }),
    ...createNavigationCommands(deps.page),
    ...createHintCommands({ hints: parts.hint, finder: parts.finder }),
    ...parts.help,
    ...parts.find,
    ...createBackgroundCommands({ client: deps.client }),
  ]);
}

/**
 * Help mode and its `?` command. The machine and the registry are read lazily, since
 * both are built after this feature; the entries come from the same registry that runs keys (R2.2).
 */
function createHelp(
  doc: Document,
  parts: {
    readonly machine: () => Pick<ModeMachine, 'enter'>;
    readonly registry: () => Pick<CommandRegistry, 'list'>;
  },
): ReturnType<typeof createHelpFeature> {
  return createHelpFeature({
    machine: {
      enter: (name, options) => {
        parts.machine().enter(name, options);
      },
    },
    mount: () => mountUiRoot(doc, 'vim-help'),
    entries: () => helpEntries(parts.registry().list(), DEFAULT_KEYMAP),
  });
}

/** The find feature over the live page, with the machine read lazily (R3-R5). */
function createFind(
  deps: ControllerDeps,
  parts: { readonly machine: () => Pick<ModeMachine, 'enter'> },
): FindFeature {
  return createFindFeature({
    machine: {
      enter: (name, options) => {
        parts.machine().enter(name, options);
      },
    },
    mount: () => mountUiRoot(deps.window.document, 'vim-find'),
    document: deps.window.document,
    isRendered: (element) => deps.geometry.isRendered(element),
    api: browserHighlightApi(),
  });
}

/**
 * Modes that draw an overlay. They stay open when focus moves between non-editable
 * elements (R7.3, R2.4, R6.2), and `stop()` ends them.
 */
const OVERLAY_MODES: ReadonlySet<ModeName> = new Set(['hint', 'help', 'find']);

/**
 * The HUD, mounted once and redrawn when the mode, the pending keys or the find
 * position change (R1.2, R1.4, R4.6).
 */
function createHudRedraw(
  doc: Document,
  parts: {
    readonly machine: () => Pick<ModeMachine, 'current'>;
    readonly pending: () => string;
    readonly find: Pick<FindFeature, 'session'>;
  },
): { readonly refresh: () => void; readonly unmount: () => void } {
  const hud = createHud({ mount: () => mountUiRoot(doc, 'vim-hud') });
  return {
    refresh: () => {
      hud.update(
        hudView(parts.machine().current, parts.pending(), findPosition(parts.find.session)),
      );
    },
    unmount: () => {
      hud.unmount();
    },
  };
}

/** The find position for the HUD, or undefined while no query is remembered (R4.6). */
function findPosition(session: Pick<FindFeature, 'session'>['session']): FindPosition | undefined {
  return session.query === '' ? undefined : session.position;
}

/**
 * Sends every key to the machine and redraws the HUD after it. An orphaned copy
 * (extension reloaded or disabled) passes every key and stops itself (R1.4, R1.6).
 */
function routeKeys(
  deps: ControllerDeps,
  machine: Pick<ModeMachine, 'handleKey'>,
  refresh: () => void,
  stop: () => void,
): () => void {
  return listenForKeys(
    deps.window,
    (press) => {
      if (!deps.isValid()) {
        stop();
        return 'passed';
      }
      const result = machine.handleKey(press);
      refresh();
      return result;
    },
    deps.isTrusted,
  );
}

/**
 * Sticky Insert mode ignores focus changes (R3.7). Hint and Help modes ignore all but
 * an editable getting focus, so moving focus between buttons keeps them open (R7.3, R6.2).
 */
function followFocus(
  deps: ControllerDeps,
  machine: Pick<ModeMachine, 'current' | 'isSticky' | 'enter'>,
): () => void {
  return watchFocus(deps.window, deps.shadowRootOf, (editable) => {
    if (machine.isSticky || (OVERLAY_MODES.has(machine.current) && !editable)) {
      return;
    }
    machine.enter(editable ? 'insert' : 'normal');
  });
}

function createModes(deps: {
  readonly timer: Timer;
  readonly registry: CommandRegistry;
  readonly editableFocused: () => boolean;
  readonly blurActive: () => void;
  readonly hint: HintMode;
  readonly help: Mode;
  readonly find: Mode;
  readonly onPendingChange: () => void;
}): { readonly machine: ModeMachine; readonly normal: ReturnType<typeof createNormalMode> } {
  // The modes need the machine before it exists: forward to it at call time
  const switcher: Pick<ModeMachine, 'enter' | 'handleKey' | 'isSticky'> = {
    enter: (name, options) => {
      machine.enter(name, options);
    },
    handleKey: (press) => machine.handleKey(press),
    get isSticky() {
      return machine.isSticky;
    },
  };
  const normal = createNormalMode({
    machine: switcher,
    trie: buildKeymapTrie(DEFAULT_KEYMAP),
    registry: deps.registry,
    timer: deps.timer,
    editableFocused: deps.editableFocused,
    onPendingChange: deps.onPendingChange,
  });
  const insert = createInsertMode({
    machine: switcher,
    blurActive: deps.blurActive,
    editableFocused: deps.editableFocused,
  });
  const machine = createModeMachine(
    [normal, insert, deps.hint, deps.help, deps.find],
    deps.editableFocused() ? 'insert' : 'normal',
  );
  return { machine, normal };
}

/**
 * The composition root: builds the modes, commands and scroller and connects
 * them to the page's keys and focus. `stop()` removes every listener, clears
 * the key timer and stops animations.
 */
export function createController(deps: ControllerDeps): Controller {
  const doc = deps.window.document;
  const activeElement = (): Element | null => deepActiveElement(doc, deps.shadowRootOf);
  const editableFocused = (): boolean => isEditable(activeElement());

  const scroller = createScroller({
    frames: deps.frames,
    now: deps.now,
    prefersReducedMotion: deps.prefersReducedMotion,
  });
  const { hint, finder } = createHints(deps, { scroller, machine: () => machine });
  const tracker = createScrollTargetTracker(doc);
  const help = createHelp(doc, { machine: () => machine, registry: () => registry });
  const find = createFind(deps, { machine: () => machine });
  const registry = createRegistry(deps, {
    scroller,
    tracker,
    hint,
    finder,
    help: help.commands,
    find: find.commands,
  });
  const hud = createHudRedraw(doc, {
    machine: () => machine,
    pending: () => normal.pending(),
    find,
  });
  const { machine, normal } = createModes({
    timer: deps.timer,
    registry,
    hint,
    editableFocused,
    blurActive: () => {
      blurElement(activeElement());
    },
    help: help.mode,
    find: find.mode,
    onPendingChange: hud.refresh,
  });
  machine.subscribe(hud.refresh);
  hud.refresh();

  // Sticky Insert mode ignores focus changes (R3.7)
  const stopFocus = followFocus(deps, machine);

  let stopped = false;
  const stop = (): void => {
    if (stopped) {
      return;
    }
    stopped = true;
    // Ends the overlay modes: removes hints, the help dialog and the find bar (R7.7)
    if (OVERLAY_MODES.has(machine.current)) {
      machine.enter('normal');
    }
    stopKeys();
    stopFocus();
    tracker.stop();
    scroller.stop();
    normal.reset();
    find.dispose();
    hud.unmount();
  };

  const stopKeys = routeKeys(deps, machine, hud.refresh, stop);

  return { stop };
}
