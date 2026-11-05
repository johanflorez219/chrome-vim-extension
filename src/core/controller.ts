import type { MessageClient } from '../messaging/client';
import { DEFAULT_KEYMAP } from '../settings/defaults';

import { createBackgroundCommands } from './commands/background';
import { createNavigationCommands, type PageActions } from './commands/navigation';
import { createCommandRegistry, type CommandRegistry } from './commands/registry';
import { createScrollCommands } from './commands/scroll';
import { deepActiveElement, isEditable, type ShadowRootOf } from './editable';
import { watchFocus } from './focus-watcher';
import { listenForKeys } from './key-listener';
import { buildKeymapTrie } from './keymap-trie';
import { createModeMachine, type ModeMachine } from './mode-machine';
import { createInsertMode } from './modes/insert';
import { createNormalMode, type Timer } from './modes/normal';
import { createScrollTargetTracker } from './scroll/scroll-target';
import { createScroller, type FrameScheduler } from './scroll/scroller';

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
  /** Hands background commands to the service worker (R1.3). */
  readonly client: Pick<MessageClient, 'sendCommand'>;
}

export interface Controller {
  stop(): void;
}

function blurElement(element: Element | null): void {
  if (element instanceof HTMLElement) {
    element.blur();
  }
}

function createModes(deps: {
  readonly timer: Timer;
  readonly registry: CommandRegistry;
  readonly editableFocused: () => boolean;
  readonly blurActive: () => void;
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
  });
  const insert = createInsertMode({
    machine: switcher,
    blurActive: deps.blurActive,
    editableFocused: deps.editableFocused,
  });
  const machine = createModeMachine([normal, insert], deps.editableFocused() ? 'insert' : 'normal');
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
  const tracker = createScrollTargetTracker(doc);
  const registry = createCommandRegistry([
    ...createScrollCommands({ scroller, targets: tracker }),
    ...createNavigationCommands(deps.page),
    ...createBackgroundCommands({ client: deps.client }),
  ]);
  const { machine, normal } = createModes({
    timer: deps.timer,
    registry,
    editableFocused,
    blurActive: () => {
      blurElement(activeElement());
    },
  });

  // Sticky Insert mode ignores focus changes (R3.7)
  const stopFocus = watchFocus(deps.window, deps.shadowRootOf, (editable) => {
    if (!machine.isSticky) {
      machine.enter(editable ? 'insert' : 'normal');
    }
  });

  let stopped = false;
  const stop = (): void => {
    if (stopped) {
      return;
    }
    stopped = true;
    stopKeys();
    stopFocus();
    tracker.stop();
    scroller.stop();
    normal.reset();
  };

  // An orphaned copy (extension reloaded or disabled) passes every key and
  // stops itself (R1.4, R1.6)
  const stopKeys = listenForKeys(
    deps.window,
    (press) => {
      if (!deps.isValid()) {
        stop();
        return 'passed';
      }
      return machine.handleKey(press);
    },
    deps.isTrusted,
  );

  return { stop };
}
