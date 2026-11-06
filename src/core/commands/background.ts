import type { MessageClient } from '../../messaging/client';
import { BACKGROUND_COMMAND_NAMES, type BackgroundCommandName } from '../../messaging/protocol';

import { onceOnly, type Command } from './registry';

interface Described {
  readonly description: string;
  readonly acceptsCount: boolean;
}

const COMMANDS: Record<BackgroundCommandName, Described> = {
  tabNext: { description: 'Next tab (count: that many tabs forward)', acceptsCount: true },
  tabPrevious: { description: 'Previous tab (count: that many tabs back)', acceptsCount: true },
  tabGoTo: { description: 'Go to tab N, or the next tab without count', acceptsCount: true },
  tabFirst: { description: 'First tab', acceptsCount: false },
  tabLast: { description: 'Last tab', acceptsCount: false },
  tabClose: { description: 'Close the tab', acceptsCount: false },
  tabRestore: { description: 'Restore closed tabs (count: that many)', acceptsCount: true },
  tabDuplicate: { description: 'Duplicate the tab', acceptsCount: false },
  historyBack: { description: 'Back in history (count: that many entries)', acceptsCount: true },
  historyForward: { description: 'Forward in history (count: that many)', acceptsCount: true },
};

/** One command per background name; each hands the work to the service worker (R1.3). */
export function createBackgroundCommands(deps: {
  readonly client: Pick<MessageClient, 'sendCommand'>;
}): readonly Command[] {
  return BACKGROUND_COMMAND_NAMES.map((name): Command => ({
    name,
    ...COMMANDS[name],
    context: 'background',
    run: onceOnly((ctx) => {
      // Safe to ignore the promise: sendCommand never rejects.
      void deps.client.sendCommand(name, ctx.count);
    }),
  }));
}
