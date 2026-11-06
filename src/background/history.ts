import type { BackgroundCommandHandlers, HandlerContext } from '@/messaging/router';

export interface HistoryApi {
  /** chrome.tabs.goBack / goForward. Rejects when there is no entry in that direction. */
  go(direction: 'back' | 'forward', tabId: number): Promise<void>;
  /**
   * Resolves when the tab commits a navigation in its main frame
   * (chrome.webNavigation.onCommitted), or after `timeoutMs`, whichever comes first.
   * Call it before `go` so the event can't be missed; `cancel` removes the listener.
   */
  expectCommit(tabId: number, timeoutMs: number): { readonly done: Promise<void>; cancel(): void };
}

const COMMIT_TIMEOUT_MS = 1000;

/** Takes one step; false when there was no entry to go to (R6.4). */
async function step(
  history: HistoryApi,
  direction: 'back' | 'forward',
  tabId: number,
  last: boolean,
): Promise<boolean> {
  const pending = last ? undefined : history.expectCommit(tabId, COMMIT_TIMEOUT_MS);
  try {
    await history.go(direction, tabId);
  } catch {
    // Expected at the end of history; not an error and not logged (NFR4.1).
    pending?.cancel();
    return false;
  }
  await pending?.done;
  return true;
}

function createStepper(
  history: HistoryApi,
  direction: 'back' | 'forward',
): (count: number | undefined, ctx: HandlerContext) => Promise<void> {
  return async (count, ctx) => {
    const total = count ?? 1;
    for (let i = 1; i <= total; i++) {
      // Sequential on purpose: each step starts after the previous one committed.
      if (!(await step(history, direction, ctx.tabId, i === total))) {
        return;
      }
    }
  };
}

/** One step at a time, waiting for each to commit, so counts go as far as the history allows (R6). */
export function createHistoryHandlers(deps: {
  readonly history: HistoryApi;
}): Pick<BackgroundCommandHandlers, 'historyBack' | 'historyForward'> {
  return {
    historyBack: createStepper(deps.history, 'back'),
    historyForward: createStepper(deps.history, 'forward'),
  };
}
