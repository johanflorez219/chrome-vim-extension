import type { HistoryApi } from './history';

interface CommitDetails {
  readonly tabId: number;
  readonly frameId: number;
}

/** chrome.webNavigation.onCommitted, narrowed to what the history steps need. */
export interface CommitEvent {
  addListener(listener: (details: CommitDetails) => void): void;
  removeListener(listener: (details: CommitDetails) => void): void;
}

export function createHistoryApi(deps: {
  readonly goBack: (tabId: number) => Promise<void>;
  readonly goForward: (tabId: number) => Promise<void>;
  readonly onCommitted: CommitEvent;
}): HistoryApi {
  return {
    // No try/catch: a rejection must reach the history handlers (R6.4).
    go: async (direction, tabId): Promise<void> =>
      direction === 'back' ? deps.goBack(tabId) : deps.goForward(tabId),
    expectCommit: (tabId, timeoutMs) => {
      let settled = false;
      let resolveDone: () => void = () => undefined;
      const done = new Promise<void>((resolve) => {
        resolveDone = resolve;
      });
      const listener = (details: CommitDetails): void => {
        if (details.tabId === tabId && details.frameId === 0) {
          finish();
        }
      };
      // The timer is set before the listener so a listener fired synchronously
      // by addListener can never reach the timer before it exists.
      const timer = setTimeout(finish, timeoutMs);
      deps.onCommitted.addListener(listener);

      function finish(): void {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(timer);
        deps.onCommitted.removeListener(listener);
        resolveDone();
      }

      // `cancel` also resolves `done`; the history handlers never await it after cancelling.
      return { done, cancel: finish };
    },
  };
}
