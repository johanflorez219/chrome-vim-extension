import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { HandlerContext } from '@/messaging/router';
import { createHistoryHandlers } from './history';
import type { HistoryApi } from './history';

type Direction = Parameters<HistoryApi['go']>[0];

const ctx: HandlerContext = { tabId: 7, windowId: 1 };

let events: string[] = [];
const go = vi.fn<HistoryApi['go']>();
const expectCommit = vi.fn<HistoryApi['expectCommit']>();
const cancel = vi.fn<() => void>();
/** Makes the `done` promise of the next expectations; the default resolves at once. */
let makeDone: () => Promise<void>;

const history: HistoryApi = {
  go: (direction, tabId) => go(direction, tabId),
  expectCommit: (tabId, timeoutMs) => expectCommit(tabId, timeoutMs),
};
const handlers = createHistoryHandlers({ history });

beforeEach(() => {
  events = [];
  go.mockReset();
  go.mockImplementation((direction) => {
    events.push(`go:${direction}`);
    return Promise.resolve();
  });
  expectCommit.mockReset();
  expectCommit.mockImplementation(() => {
    events.push('expect');
    return { done: makeDone(), cancel };
  });
  cancel.mockReset();
  makeDone = () =>
    Promise.resolve().then(() => {
      events.push('wait');
    });
});

function rejectOnCall(call: number): void {
  let calls = 0;
  go.mockImplementation((direction) => {
    calls += 1;
    events.push(`go:${direction}`);
    return calls === call ? Promise.reject(new Error('no entry')) : Promise.resolve();
  });
}

describe('historyBack and historyForward', () => {
  it('historyBack without a count goes back once', async () => {
    await handlers.historyBack(undefined, ctx);

    expect(go).toHaveBeenCalledOnce();
    expect(go).toHaveBeenCalledWith('back', 7);
    expect(expectCommit).not.toHaveBeenCalled();
  });

  it('historyForward without a count goes forward once', async () => {
    await handlers.historyForward(undefined, ctx);

    expect(go).toHaveBeenCalledOnce();
    expect(go).toHaveBeenCalledWith('forward', 7);
    expect(expectCommit).not.toHaveBeenCalled();
  });

  it('count 3 takes three steps', async () => {
    await handlers.historyBack(3, ctx);

    expect(go).toHaveBeenCalledTimes(3);
    expect(expectCommit).toHaveBeenCalledTimes(2);
    expect(expectCommit).toHaveBeenNthCalledWith(1, 7, 1000);
    expect(expectCommit).toHaveBeenNthCalledWith(2, 7, 1000);
    expect(events).toStrictEqual([
      'expect',
      'go:back',
      'wait',
      'expect',
      'go:back',
      'wait',
      'go:back',
    ]);
  });

  it('steps forward with a count too', async () => {
    await handlers.historyForward(2, ctx);

    expect(events).toStrictEqual(['expect', 'go:forward', 'wait', 'go:forward']);
  });

  it('waits for each commit before the next step', async () => {
    let release: () => void = () => undefined;
    makeDone = () =>
      new Promise<void>((resolve) => {
        release = resolve;
      });

    const run = handlers.historyBack(2, ctx);
    await vi.waitFor(() => {
      expect(go).toHaveBeenCalledOnce();
    });
    await Promise.resolve();
    await Promise.resolve();
    expect(go).toHaveBeenCalledOnce();

    release();
    await run;
    expect(go).toHaveBeenCalledTimes(2);
  });

  it('a go that rejects on step 2 of 3 stops the run', async () => {
    rejectOnCall(2);

    await expect(handlers.historyBack(3, ctx)).resolves.toBeUndefined();

    expect(go).toHaveBeenCalledTimes(2);
    expect(cancel).toHaveBeenCalledOnce();
    expect(expectCommit).toHaveBeenCalledTimes(2);
  });

  it('a go that rejects on step 1 of 3 cancels and stops', async () => {
    rejectOnCall(1);

    await expect(handlers.historyBack(3, ctx)).resolves.toBeUndefined();

    expect(go).toHaveBeenCalledOnce();
    expect(cancel).toHaveBeenCalledOnce();
    expect(expectCommit).toHaveBeenCalledOnce();
  });

  it('a rejection with count 1 does nothing and resolves', async () => {
    rejectOnCall(1);

    await expect(handlers.historyBack(1, ctx)).resolves.toBeUndefined();

    expect(expectCommit).not.toHaveBeenCalled();
    expect(cancel).not.toHaveBeenCalled();
  });

  it('a rejection on the last step of a counted run resolves', async () => {
    rejectOnCall(2);

    await expect(handlers.historyBack(2, ctx)).resolves.toBeUndefined();

    expect(go).toHaveBeenCalledTimes(2);
    expect(cancel).not.toHaveBeenCalled();
  });

  it('uses the tab of the context', async () => {
    await handlers.historyBack(2, { tabId: 9, windowId: 1 });

    expect(go).toHaveBeenCalledWith('back', 9);
    expect(expectCommit).toHaveBeenCalledWith(9, 1000);
  });

  it('keeps no state between calls', async () => {
    await handlers.historyBack(2, ctx);
    const first = [...events];
    events = [];
    await handlers.historyBack(2, ctx);

    expect(events).toStrictEqual(first);
  });
});

describe('direction', () => {
  it.each<readonly [Direction]>([['back'], ['forward']])('%s goes to go() as given', async (d) => {
    await (d === 'back' ? handlers.historyBack : handlers.historyForward)(undefined, ctx);

    expect(go).toHaveBeenCalledWith(d, 7);
  });
});
