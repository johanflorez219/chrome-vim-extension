import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BACKGROUND_COMMAND_NAMES } from '@/messaging/protocol';
import type { Router, SenderInfo } from '@/messaging/router';
import { createBackgroundRouter } from './handlers';
import type { HistoryApi } from './history';
import type { SessionsApi, TabsApi } from './tabs';

const sender: SenderInfo = { id: 'ext', frameId: 0, tab: { id: 10, windowId: 1 } };

function createFakes() {
  const query = vi.fn<TabsApi['query']>(() =>
    Promise.resolve([
      { id: 10, index: 0 },
      { id: 11, index: 1 },
    ]),
  );
  const update = vi.fn<TabsApi['update']>(() => Promise.resolve(undefined));
  const remove = vi.fn<TabsApi['remove']>(() => Promise.resolve());
  const duplicate = vi.fn<TabsApi['duplicate']>(() => Promise.resolve({ id: 12, index: 2 }));
  const getRecentlyClosed = vi.fn<SessionsApi['getRecentlyClosed']>(() => Promise.resolve([]));
  const restore = vi.fn<SessionsApi['restore']>(() => Promise.resolve(undefined));
  const go = vi.fn<HistoryApi['go']>(() => Promise.resolve());
  const expectCommit = vi.fn<HistoryApi['expectCommit']>(() => ({
    done: Promise.resolve(),
    cancel: vi.fn<() => void>(),
  }));
  const router = createBackgroundRouter({
    tabs: {
      query: (filter) => query(filter),
      update: (id, props) => update(id, props),
      remove: (id) => remove(id),
      duplicate: (id) => duplicate(id),
    },
    sessions: {
      getRecentlyClosed: (filter) => getRecentlyClosed(filter),
      restore: (id) => restore(id),
    },
    history: {
      go: (direction, tabId) => go(direction, tabId),
      expectCommit: (tabId, timeoutMs) => expectCommit(tabId, timeoutMs),
    },
    extensionId: 'ext',
  });
  return {
    router,
    query,
    update,
    remove,
    duplicate,
    getRecentlyClosed,
    restore,
    go,
    expectCommit,
  };
}

let fakes: ReturnType<typeof createFakes>;
let router: Router;

beforeEach(() => {
  fakes = createFakes();
  router = fakes.router;
});

describe('createBackgroundRouter', () => {
  it("runs tabNext in the sender's window", async () => {
    await router.handle({ type: 'runCommand', command: 'tabNext' }, sender);

    expect(fakes.query).toHaveBeenCalledOnce();
    expect(fakes.query).toHaveBeenCalledWith({ windowId: 1 });
    expect(fakes.update).toHaveBeenCalledOnce();
    expect(fakes.update).toHaveBeenCalledWith(11, { active: true });
  });

  it('forwards the count', async () => {
    await router.handle({ type: 'runCommand', command: 'tabGoTo', count: 2 }, sender);
    expect(fakes.update).toHaveBeenCalledWith(11, { active: true });

    fakes.update.mockClear();
    await router.handle({ type: 'runCommand', command: 'tabGoTo', count: 1 }, sender);
    expect(fakes.update).not.toHaveBeenCalled();
  });

  it("reaches the history handlers with the sender's tab", async () => {
    await router.handle({ type: 'runCommand', command: 'historyBack' }, sender);
    await router.handle({ type: 'runCommand', command: 'historyForward' }, sender);

    expect(fakes.go).toHaveBeenNthCalledWith(1, 'back', 10);
    expect(fakes.go).toHaveBeenNthCalledWith(2, 'forward', 10);
    expect(fakes.expectCommit).not.toHaveBeenCalled();
  });

  it('reaches the API of every background command', async () => {
    const rows = [
      ['tabNext', fakes.query],
      ['tabPrevious', fakes.query],
      ['tabGoTo', fakes.query],
      ['tabFirst', fakes.query],
      ['tabLast', fakes.query],
      ['tabClose', fakes.remove],
      ['tabRestore', fakes.getRecentlyClosed],
      ['tabDuplicate', fakes.duplicate],
      ['historyBack', fakes.go],
      ['historyForward', fakes.go],
    ] as const;
    expect(rows.map(([command]) => command)).toStrictEqual([...BACKGROUND_COMMAND_NAMES]);

    for (const [command, fake] of rows) {
      fake.mockClear();
      await router.handle({ type: 'runCommand', command }, sender);
      expect(fake, command).toHaveBeenCalledOnce();
    }
  });

  it('ignores a sender from another extension', async () => {
    await router.handle({ type: 'runCommand', command: 'tabClose' }, { ...sender, id: 'other' });

    expect(fakes.remove).not.toHaveBeenCalled();
    expect(fakes.query).not.toHaveBeenCalled();
  });

  it('resolves when the API rejects', async () => {
    fakes.query.mockRejectedValueOnce(new Error('closed'));

    await expect(
      router.handle({ type: 'runCommand', command: 'tabNext' }, sender),
    ).resolves.toBeUndefined();

    expect(fakes.update).not.toHaveBeenCalled();
  });
});
