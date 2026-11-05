import type { KeyPress, KeyResult } from './key-listener';

export const MODE_NAMES = ['normal', 'insert'] as const;
export type ModeName = (typeof MODE_NAMES)[number];

export interface EnterOptions {
  /** Insert mode entered with `i`: it ignores focus changes until Esc (R3.7). */
  readonly sticky?: boolean;
}

export interface Mode {
  readonly name: ModeName;
  handleKey(press: KeyPress): KeyResult;
  onEnter?(options: EnterOptions): void;
  onExit?(): void;
}

export interface ModeMachine {
  readonly current: ModeName;
  readonly isSticky: boolean;
  /** No-op if already in that mode with the same stickiness. */
  enter(name: ModeName, options?: EnterOptions): void;
  handleKey(press: KeyPress): KeyResult;
}

function modeNamed(byName: ReadonlyMap<ModeName, Mode>, name: ModeName): Mode {
  const mode = byName.get(name);
  if (mode === undefined) {
    throw new Error(`Missing mode: ${name}`);
  }
  return mode;
}

function indexModes(modes: readonly Mode[]): ReadonlyMap<ModeName, Mode> {
  const byName = new Map<ModeName, Mode>();
  for (const mode of modes) {
    if (byName.has(mode.name)) {
      throw new Error(`Duplicate mode: ${mode.name}`);
    }
    byName.set(mode.name, mode);
  }
  for (const name of MODE_NAMES) {
    modeNamed(byName, name);
  }
  return byName;
}

/**
 * Holds the current mode (State pattern) and sends every key to it. Hooks run
 * only on a real mode change; the initial mode's `onEnter` is not called.
 */
export function createModeMachine(modes: readonly Mode[], initial: ModeName): ModeMachine {
  const byName = indexModes(modes);
  let active = modeNamed(byName, initial);
  let sticky = false;

  return {
    get current() {
      return active.name;
    },
    get isSticky() {
      return sticky;
    },
    enter: (name, options) => {
      const nextSticky = options?.sticky ?? false;
      if (name === active.name) {
        sticky = nextSticky;
        return;
      }
      active.onExit?.();
      const next = modeNamed(byName, name);
      active = next;
      sticky = nextSticky;
      next.onEnter?.({ sticky: nextSticky });
    },
    // Looked up at each call: a mode may switch modes and hand the key on
    handleKey: (press) => active.handleKey(press),
  };
}
