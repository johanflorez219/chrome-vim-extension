export const BACKGROUND_COMMAND_NAMES = [
  'tabNext',
  'tabPrevious',
  'tabGoTo',
  'tabFirst',
  'tabLast',
  'tabClose',
  'tabRestore',
  'tabDuplicate',
  'historyBack',
  'historyForward',
] as const;
export type BackgroundCommandName = (typeof BACKGROUND_COMMAND_NAMES)[number];

/** Every message from a content script to the service worker. Add a member here and the router stops compiling until it has a handler. */
export interface Message {
  readonly type: 'runCommand';
  readonly command: BackgroundCommandName;
  /** Absent when no count was typed (JSON drops `undefined`). */
  readonly count?: number;
}

// M1's key parser already caps counts at 9999, so a real count is never rejected.
const MAX_COUNT = 9999;

function isCount(value: unknown): boolean {
  return (
    value === undefined ||
    (typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= MAX_COUNT)
  );
}

/** True only for a well-formed Message: known type, known command, count absent or an integer 1-9999. */
export function isMessage(value: unknown): value is Message {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const { type, command, count } = value as Record<string, unknown>;
  return (
    type === 'runCommand' &&
    typeof command === 'string' &&
    BACKGROUND_COMMAND_NAMES.some((name) => name === command) &&
    isCount(count)
  );
}
