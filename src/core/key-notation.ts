/** The parts of a `KeyboardEvent` needed to describe it in Vim notation. */
export type KeyInput = Pick<
  KeyboardEvent,
  'key' | 'code' | 'ctrlKey' | 'altKey' | 'metaKey' | 'shiftKey' | 'isComposing'
>;

const IGNORED_KEYS: ReadonlySet<string> = new Set([
  'Shift',
  'Control',
  'Alt',
  'AltGraph',
  'Meta',
  'CapsLock',
  'Fn',
  'Dead',
  'Process',
  'Unidentified',
]);

const SPECIAL_KEYS: ReadonlyMap<string, string> = new Map([
  ['Escape', 'Esc'],
  ['Enter', 'CR'],
  ['Tab', 'Tab'],
  ['Backspace', 'BS'],
  ['Delete', 'Del'],
  ['Insert', 'Insert'],
  [' ', 'Space'],
  ['ArrowUp', 'Up'],
  ['ArrowDown', 'Down'],
  ['ArrowLeft', 'Left'],
  ['ArrowRight', 'Right'],
  ['Home', 'Home'],
  ['End', 'End'],
  ['PageUp', 'PageUp'],
  ['PageDown', 'PageDown'],
]);

const FUNCTION_KEY = /^F\d{1,2}$/;
const PHYSICAL_LETTER = /^Key([A-Z])$/;

function specialName(key: string): string | undefined {
  return SPECIAL_KEYS.get(key) ?? (FUNCTION_KEY.test(key) ? key : undefined);
}

// macOS turns Alt+letter into another character (Alt-j is "∆"), so read the
// physical key instead.
function altLetter(input: KeyInput): string {
  const letter = PHYSICAL_LETTER.exec(input.code)?.[1];
  if (letter === undefined) {
    return input.key;
  }
  return input.shiftKey ? letter : letter.toLowerCase();
}

function modifierPrefix(input: KeyInput, isSpecial: boolean): string {
  return [
    input.ctrlKey ? 'C-' : '',
    input.altKey ? 'A-' : '',
    // Shift is already visible in printable keys ("G"), only special keys need S-
    input.shiftKey && isSpecial ? 'S-' : '',
    input.metaKey ? 'D-' : '',
  ].join('');
}

/**
 * Converts a key press to Vim key notation: `j`, `G`, `<C-d>`, `<Esc>`, `<S-Tab>`.
 * Returns `undefined` for keys that are not commands on their own, such as a
 * lone Shift, or keys typed while an input method is composing text.
 */
export function toKeyNotation(input: KeyInput): string | undefined {
  if (input.isComposing || IGNORED_KEYS.has(input.key)) {
    return undefined;
  }

  const special = specialName(input.key);
  if (input.key === '<') {
    return `<${modifierPrefix(input, false)}lt>`;
  }

  const name = special ?? (input.altKey ? altLetter(input) : input.key);
  const prefix = modifierPrefix(input, special !== undefined);
  if (prefix === '' && special === undefined) {
    return name;
  }
  return `<${prefix}${name}>`;
}
