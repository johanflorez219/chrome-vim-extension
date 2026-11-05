import type { CommandName } from './commands/registry';

export interface KeymapEntry {
  /** One key per element, in Vim notation: `['g', 'g']`, `['<C-d>']`. */
  readonly keys: readonly string[];
  readonly command: CommandName;
}

export interface KeymapTrie {
  /** 'complete' with the command, 'prefix' if more keys can follow, 'none'. */
  lookup(keys: readonly string[]): TrieLookup;
}

export type TrieLookup =
  | { readonly type: 'complete'; readonly command: CommandName }
  | { readonly type: 'prefix' }
  | { readonly type: 'none' };

interface TrieNode {
  command?: CommandName;
  readonly children: Map<string, TrieNode>;
}

const NONE: TrieLookup = { type: 'none' };
const PREFIX: TrieLookup = { type: 'prefix' };

function insertEntry(root: TrieNode, entry: KeymapEntry): void {
  const name = entry.keys.join('');
  if (entry.keys.length === 0) {
    throw new Error(`Empty mapping for ${entry.command}`);
  }
  let node = root;
  for (const [index, key] of entry.keys.entries()) {
    if (node.command !== undefined) {
      throw new Error(`Mapping ${name} starts with mapping ${entry.keys.slice(0, index).join('')}`);
    }
    let child = node.children.get(key);
    if (child === undefined) {
      child = { children: new Map() };
      node.children.set(key, child);
    }
    node = child;
  }
  if (node.command !== undefined) {
    throw new Error(`Duplicate mapping: ${name}`);
  }
  if (node.children.size > 0) {
    throw new Error(`Mapping ${name} is the start of another mapping`);
  }
  node.command = entry.command;
}

/** Throws if a mapping is empty, duplicated, or a prefix of another mapping. */
export function buildKeymapTrie(entries: readonly KeymapEntry[]): KeymapTrie {
  const root: TrieNode = { children: new Map() };
  for (const entry of entries) {
    insertEntry(root, entry);
  }

  return {
    lookup: (keys) => {
      let node = root;
      for (const key of keys) {
        const child = node.children.get(key);
        if (child === undefined) {
          return NONE;
        }
        node = child;
      }
      return node.command === undefined ? PREFIX : { type: 'complete', command: node.command };
    },
  };
}
