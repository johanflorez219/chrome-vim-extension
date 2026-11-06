import { describe, expect, it, vi } from 'vitest';
import type { HandlerContext } from '@/messaging/router';
import { createTabHandlers } from './tabs';
import type { ClosedEntry, SessionsApi, TabInfo, TabsApi } from './tabs';

function createFakes(count: number, activeIndex: number) {
  const tabList: TabInfo[] = Array.from({ length: count }, (_, index) => ({
    id: 10 + index,
    index,
  }));
  const query = vi.fn<TabsApi['query']>(() => Promise.resolve([...tabList].reverse()));
  const update = vi.fn<TabsApi['update']>(() => Promise.resolve(undefined));
  const remove = vi.fn<TabsApi['remove']>(() => Promise.resolve());
  const duplicate = vi.fn<TabsApi['duplicate']>(() => Promise.resolve(undefined));
  const tabs: TabsApi = {
    query: (filter) => query(filter),
    update: (id, props) => update(id, props),
    remove: (id) => remove(id),
    duplicate: (id) => duplicate(id),
  };
  let closed: readonly ClosedEntry[] = [];
  const getRecentlyClosed = vi.fn<SessionsApi['getRecentlyClosed']>((filter) =>
    Promise.resolve(closed.slice(0, filter.maxResults)),
  );
  const restore = vi.fn<SessionsApi['restore']>(() => Promise.resolve(undefined));
  const sessions: SessionsApi = {
    getRecentlyClosed: (filter) => getRecentlyClosed(filter),
    restore: (id) => restore(id),
  };
  const handlers = createTabHandlers({ tabs, sessions });
  const ctx: HandlerContext = { tabId: 10 + activeIndex, windowId: 1 };
  return {
    handlers,
    ctx,
    query,
    update,
    remove,
    duplicate,
    getRecentlyClosed,
    restore,
    setClosed: (entries: readonly ClosedEntry[]): void => {
      closed = entries;
    },
  };
}

const idAt = (index: number): number => 10 + index;

describe('tabNext and tabPrevious', () => {
  it.each([
    ['tabNext', undefined, 2, 3],
    ['tabNext', undefined, 4, 0],
    ['tabPrevious', undefined, 0, 4],
    ['tabPrevious', undefined, 3, 2],
    ['tabNext', 2, 4, 1],
    ['tabPrevious', 7, 1, 4],
  ] as const)(
    '%s with count %s from index %i activates index %i',
    async (name, count, from, to) => {
      const fakes = createFakes(5, from);

      await fakes.handlers[name](count, fakes.ctx);

      expect(fakes.update).toHaveBeenCalledOnce();
      expect(fakes.update).toHaveBeenCalledWith(idAt(to), { active: true });
      expect(fakes.remove).not.toHaveBeenCalled();
      expect(fakes.duplicate).not.toHaveBeenCalled();
      expect(fakes.restore).not.toHaveBeenCalled();
    },
  );
});

describe('tabGoTo', () => {
  it('behaves like next without a count', async () => {
    const fakes = createFakes(4, 1);

    await fakes.handlers.tabGoTo(undefined, fakes.ctx);

    expect(fakes.update).toHaveBeenCalledWith(idAt(2), { active: true });
  });

  it.each([
    [3, 2],
    [99, 3],
    [1, 0],
  ])('count %i activates the tab at index %i', async (count, index) => {
    const fakes = createFakes(4, 1);

    await fakes.handlers.tabGoTo(count, fakes.ctx);

    expect(fakes.update).toHaveBeenCalledOnce();
    expect(fakes.update).toHaveBeenCalledWith(idAt(index), { active: true });
  });

  it('does nothing when the target is already the current tab', async () => {
    const fakes = createFakes(4, 2);

    await fakes.handlers.tabGoTo(3, fakes.ctx);

    expect(fakes.update).not.toHaveBeenCalled();
  });
});

describe('a window with one tab', () => {
  it.each([
    ['tabNext', undefined],
    ['tabPrevious', undefined],
    ['tabGoTo', undefined],
    ['tabGoTo', 3],
    ['tabNext', 4],
  ] as const)('%s with count %s does nothing', async (name, count) => {
    const fakes = createFakes(1, 0);

    await fakes.handlers[name](count, fakes.ctx);

    expect(fakes.update).not.toHaveBeenCalled();
  });
});

describe('a current tab missing from the window', () => {
  it('does not activate anything', async () => {
    const fakes = createFakes(3, 0);

    await fakes.handlers.tabNext(undefined, { tabId: 999, windowId: 1 });

    expect(fakes.update).not.toHaveBeenCalled();
  });
});

describe('tabFirst and tabLast', () => {
  it('tabFirst activates the first tab', async () => {
    const fakes = createFakes(4, 2);

    await fakes.handlers.tabFirst(undefined, fakes.ctx);

    expect(fakes.update).toHaveBeenCalledWith(idAt(0), { active: true });
  });

  it('tabLast activates the last tab', async () => {
    const fakes = createFakes(4, 1);

    await fakes.handlers.tabLast(undefined, fakes.ctx);

    expect(fakes.update).toHaveBeenCalledWith(idAt(3), { active: true });
  });

  it('does nothing when the current tab is already there', async () => {
    const first = createFakes(4, 0);
    const last = createFakes(4, 3);

    await first.handlers.tabFirst(undefined, first.ctx);
    await last.handlers.tabLast(undefined, last.ctx);

    expect(first.update).not.toHaveBeenCalled();
    expect(last.update).not.toHaveBeenCalled();
  });

  it('ignores a count', async () => {
    const fakes = createFakes(4, 2);

    await fakes.handlers.tabFirst(4, fakes.ctx);
    await fakes.handlers.tabLast(4, fakes.ctx);

    expect(fakes.update).toHaveBeenNthCalledWith(1, idAt(0), { active: true });
    expect(fakes.update).toHaveBeenNthCalledWith(2, idAt(3), { active: true });
  });
});

describe('window scoping', () => {
  it.each(['tabNext', 'tabPrevious', 'tabGoTo', 'tabFirst', 'tabLast'] as const)(
    '%s queries only the window of the context',
    async (name) => {
      const fakes = createFakes(3, 1);

      await fakes.handlers[name](undefined, fakes.ctx);
      await fakes.handlers[name](undefined, { ...fakes.ctx, windowId: 7 });

      expect(fakes.query).toHaveBeenNthCalledWith(1, { windowId: 1 });
      expect(fakes.query).toHaveBeenNthCalledWith(2, { windowId: 7 });
    },
  );
});

describe('tabClose', () => {
  it('removes the tab of the context without reading the tab list', async () => {
    const fakes = createFakes(3, 1);

    await fakes.handlers.tabClose(undefined, fakes.ctx);

    expect(fakes.remove).toHaveBeenCalledOnce();
    expect(fakes.remove).toHaveBeenCalledWith(idAt(1));
    expect(fakes.query).not.toHaveBeenCalled();
  });
});

describe('tabRestore', () => {
  const entries = (): readonly ClosedEntry[] => [
    { tab: { sessionId: 's1' } },
    {},
    { tab: {} },
    { tab: { sessionId: 's2' } },
    { tab: { sessionId: 's3' } },
    { tab: { sessionId: 's4' } },
  ];

  it('asks for the 25 most recent entries', async () => {
    const fakes = createFakes(2, 0);

    await fakes.handlers.tabRestore(undefined, fakes.ctx);

    expect(fakes.getRecentlyClosed).toHaveBeenCalledWith({ maxResults: 25 });
  });

  it('restores only the first valid entry without a count', async () => {
    const fakes = createFakes(2, 0);
    fakes.setClosed(entries());

    await fakes.handlers.tabRestore(undefined, fakes.ctx);

    expect(fakes.restore).toHaveBeenCalledOnce();
    expect(fakes.restore).toHaveBeenCalledWith('s1');
  });

  it('restores N entries in list order, skipping windows and entries without a session', async () => {
    const fakes = createFakes(2, 0);
    fakes.setClosed(entries());

    await fakes.handlers.tabRestore(3, fakes.ctx);

    expect(fakes.restore.mock.calls).toStrictEqual([['s1'], ['s2'], ['s3']]);
  });

  it('waits for each restore before starting the next', async () => {
    const fakes = createFakes(2, 0);
    fakes.setClosed(entries());
    let release: () => void = () => undefined;
    fakes.restore.mockReturnValueOnce(
      new Promise<void>((resolve) => {
        release = resolve;
      }),
    );

    const run = fakes.handlers.tabRestore(2, fakes.ctx);
    await Promise.resolve();
    await Promise.resolve();
    expect(fakes.restore).toHaveBeenCalledOnce();

    release();
    await run;
    expect(fakes.restore.mock.calls).toStrictEqual([['s1'], ['s2']]);
  });

  it('restores only what exists when fewer valid entries than N', async () => {
    const fakes = createFakes(2, 0);
    fakes.setClosed([{ tab: { sessionId: 'a' } }, {}]);

    await fakes.handlers.tabRestore(5, fakes.ctx);

    expect(fakes.restore.mock.calls).toStrictEqual([['a']]);
  });

  it('does nothing and resolves when no entry is valid', async () => {
    const fakes = createFakes(2, 0);
    fakes.setClosed([{}, { tab: {} }]);

    await expect(fakes.handlers.tabRestore(2, fakes.ctx)).resolves.toBeUndefined();

    expect(fakes.restore).not.toHaveBeenCalled();
  });

  it('restores at most the 25 entries the browser returns', async () => {
    const fakes = createFakes(2, 0);
    fakes.setClosed(
      Array.from({ length: 30 }, (_, i) => ({ tab: { sessionId: `s${String(i)}` } })),
    );

    await fakes.handlers.tabRestore(40, fakes.ctx);

    expect(fakes.restore).toHaveBeenCalledTimes(25);
    expect(fakes.restore).toHaveBeenCalledWith('s0');
  });
});

describe('tabDuplicate', () => {
  it('duplicates the tab and activates the copy', async () => {
    const fakes = createFakes(2, 0);
    fakes.duplicate.mockResolvedValue({ id: 50, index: 1 });

    await fakes.handlers.tabDuplicate(undefined, fakes.ctx);

    expect(fakes.duplicate).toHaveBeenCalledWith(idAt(0));
    expect(fakes.update).toHaveBeenCalledOnce();
    expect(fakes.update).toHaveBeenCalledWith(50, { active: true });
  });

  it.each([undefined, { index: 1 }])('does not activate when duplicate gives %j', async (copy) => {
    const fakes = createFakes(2, 0);
    fakes.duplicate.mockResolvedValue(copy);

    await fakes.handlers.tabDuplicate(undefined, fakes.ctx);

    expect(fakes.update).not.toHaveBeenCalled();
  });
});
