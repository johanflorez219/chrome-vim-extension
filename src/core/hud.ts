import type { FindPosition } from './find/session';
import type { ModeName } from './mode-machine';

/** The text the HUD shows for one moment (R1.1). */
export interface HudView {
  readonly mode: string;
  /** The keys still waiting for a second press, such as `5g`, or '' (R1.3). */
  readonly pending: string;
  /** `current/total` while a query is remembered, or '' (R4.6). */
  readonly position: string;
}

function modeLabel(mode: ModeName): string {
  switch (mode) {
    case 'normal':
      // Normal mode is the quiet default, so the badge shows no name for it.
      return '';
    case 'insert':
      return 'INSERT';
    case 'hint':
      return 'HINT';
    case 'help':
      return 'HELP';
    case 'find':
      return 'FIND';
  }
}

export function positionText(position: FindPosition | undefined): string {
  if (position === undefined) {
    return '';
  }
  // "+" tells the user the count stopped at the match cap (design: error handling)
  const total = String(position.total);
  return `${String(position.current)}/${total}${position.capped ? '+' : ''}`;
}

/** The HUD text for the current state. `position` is undefined when no query is remembered. */
export function hudView(
  mode: ModeName,
  pending: string,
  position: FindPosition | undefined,
): HudView {
  return { mode: modeLabel(mode), pending, position: positionText(position) };
}
