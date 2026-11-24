import type { Command, CommandName } from '../commands/registry';
import type { KeymapEntry } from '../keymap-trie';

/** One row of the help dialog: a command and every key bound to it (R2.2). */
export interface HelpEntry {
  readonly name: CommandName;
  readonly description: string;
  /** Page commands and background commands are listed under different headings (design: help). */
  readonly context: Command['context'];
  /** One string per binding, in keymap order: `gg`, `<C-d>`. */
  readonly keys: readonly string[];
}

/**
 * One entry per command that has at least one key, in the order of `commands`
 * (R2.5, R2.7). The list comes from the same registry and keymap that run the
 * commands, so the help cannot drift from the real keys (R2.2).
 */
export function helpEntries(
  commands: readonly Command[],
  keymap: readonly KeymapEntry[],
): readonly HelpEntry[] {
  return commands.flatMap((command) => {
    const keys = keymap
      .filter((entry) => entry.command === command.name)
      .map((entry) => entry.keys.join(''));
    if (keys.length === 0) {
      return [];
    }
    return [
      {
        name: command.name,
        description: command.description,
        context: command.context,
        keys,
      },
    ];
  });
}
