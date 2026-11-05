import { BACKGROUND_COMMAND_NAMES } from '../../messaging/protocol';

export const SCROLL_COMMAND_NAMES = [
  'scrollDown',
  'scrollUp',
  'scrollLeft',
  'scrollRight',
  'scrollHalfPageDown',
  'scrollHalfPageUp',
  'scrollToTop',
  'scrollToBottom',
] as const;
const PAGE_COMMAND_NAMES = ['reload', 'copyUrl', 'urlUp', 'urlRoot'] as const;
export const COMMAND_NAMES = [
  ...SCROLL_COMMAND_NAMES,
  ...PAGE_COMMAND_NAMES,
  ...BACKGROUND_COMMAND_NAMES,
] as const;
export type CommandName = (typeof COMMAND_NAMES)[number];

export interface CommandContext {
  /** `undefined` when no count was typed. */
  readonly count: number | undefined;
  readonly repeat: boolean;
}

export interface Command {
  readonly name: CommandName;
  readonly description: string;
  readonly acceptsCount: boolean;
  /** `'page'` commands run in the page; `'background'` commands run through the service worker. */
  readonly context: 'page' | 'background';
  run(ctx: CommandContext): void;
}

/** Wraps a command's `run` so a key held down runs it once (R10.3). */
export function onceOnly(run: (ctx: CommandContext) => void): (ctx: CommandContext) => void {
  return (ctx) => {
    if (!ctx.repeat) {
      run(ctx);
    }
  };
}

export interface CommandRegistry {
  get(name: CommandName): Command;
  /** Passes `count: undefined` to commands that don't accept a count (R5.3). */
  run(name: CommandName, ctx: CommandContext): void;
  list(): readonly Command[];
}

function indexByName(commands: readonly Command[]): ReadonlyMap<CommandName, Command> {
  const byName = new Map<CommandName, Command>();
  for (const command of commands) {
    if (byName.has(command.name)) {
      throw new Error(`Duplicate command: ${command.name}`);
    }
    byName.set(command.name, command);
  }
  for (const name of COMMAND_NAMES) {
    if (!byName.has(name)) {
      throw new Error(`Missing command: ${name}`);
    }
  }
  return byName;
}

/** Throws if a name is registered twice or a name in COMMAND_NAMES is missing. */
export function createCommandRegistry(commands: readonly Command[]): CommandRegistry {
  const byName = indexByName(commands);

  const get = (name: CommandName): Command => {
    const command = byName.get(name);
    if (command === undefined) {
      throw new Error(`Unknown command: ${name}`);
    }
    return command;
  };

  return {
    get,
    run: (name, ctx) => {
      const command = get(name);
      command.run(command.acceptsCount ? ctx : { ...ctx, count: undefined });
    },
    list: () => COMMAND_NAMES.map((name) => get(name)),
  };
}
