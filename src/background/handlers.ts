import { createHistoryHandlers } from '@/background/history';
import type { HistoryApi } from '@/background/history';
import { createTabHandlers } from '@/background/tabs';
import type { SessionsApi, TabsApi } from '@/background/tabs';
import { createRouter } from '@/messaging/router';
import type { BackgroundCommandHandlers, MessageHandlers, Router } from '@/messaging/router';

/**
 * Merges the tab and history handlers into the one router of the service
 * worker. The real `chrome.*` objects come in through `deps`, so this stays
 * testable with fakes.
 */
export function createBackgroundRouter(deps: {
  readonly tabs: TabsApi;
  readonly sessions: SessionsApi;
  readonly history: HistoryApi;
  readonly extensionId: string;
}): Router {
  // The annotation makes the compiler flag a command with no handler.
  const commandHandlers: BackgroundCommandHandlers = {
    ...createTabHandlers({ tabs: deps.tabs, sessions: deps.sessions }),
    ...createHistoryHandlers({ history: deps.history }),
  };
  const runCommand: MessageHandlers['runCommand'] = (message, ctx) =>
    commandHandlers[message.command](message.count, ctx);
  return createRouter({ handlers: { runCommand }, extensionId: deps.extensionId });
}
