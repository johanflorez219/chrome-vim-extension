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

/** Runs a background command for the tab where the key was pressed. */
export interface RunCommandMessage {
  readonly type: 'runCommand';
  readonly command: BackgroundCommandName;
  /** Absent when no count was typed (JSON drops `undefined`). */
  readonly count?: number;
}

/** Opens an http or https URL in a background tab after the current one (R5.2). */
export interface OpenTabMessage {
  readonly type: 'openTab';
  /** An absolute http or https URL (NFR3.2). */
  readonly url: string;
}

/** Every message from a content script to the service worker. Add a member here and the router stops compiling until it has a handler. */
export type Message = RunCommandMessage | OpenTabMessage;

// M1's key parser already caps counts at 9999, so a real count is never rejected.
const MAX_COUNT = 9999;
const MAX_URL_LENGTH = 32_768;

function isCount(value: unknown): boolean {
  return (
    value === undefined ||
    (typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= MAX_COUNT)
  );
}

function isRunCommand(record: Record<string, unknown>): boolean {
  return (
    typeof record.command === 'string' &&
    BACKGROUND_COMMAND_NAMES.some((name) => name === record.command) &&
    isCount(record.count)
  );
}

// URL.canParse without a base rejects relative URLs and the empty string
function isWebUrl(value: unknown): boolean {
  return (
    typeof value === 'string' &&
    value.length <= MAX_URL_LENGTH &&
    URL.canParse(value) &&
    ['http:', 'https:'].includes(new URL(value).protocol)
  );
}

/**
 * True only for a well-formed Message: a runCommand with a known command and a count
 * that is absent or an integer 1-9999, or an openTab whose url is an http(s) URL of
 * at most 32,768 characters.
 */
export function isMessage(value: unknown): value is Message {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    (record.type === 'runCommand' && isRunCommand(record)) ||
    (record.type === 'openTab' && isWebUrl(record.url))
  );
}
