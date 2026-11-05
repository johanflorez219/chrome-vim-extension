import { describe, expect, it, vi } from 'vitest';

import { reinjectContentScript, type ReinjectDeps } from './reinject';

const FILES = ['content-scripts/content.js'];

type Tabs = Awaited<ReturnType<ReinjectDeps['queryTabs']>>;

function deps(
  tabs: Tabs,
  executeScript: ReinjectDeps['executeScript'],
  queryTabs: ReinjectDeps['queryTabs'] = () => Promise.resolve(tabs),
): ReinjectDeps {
  return { queryTabs, executeScript, files: FILES };
}

describe('reinjectContentScript', () => {
  it('injects the content script into every open tab', async () => {
    const executeScript = vi.fn<ReinjectDeps['executeScript']>(() => Promise.resolve());

    await reinjectContentScript(deps([{ id: 1 }, { id: 2 }], executeScript));

    expect(executeScript.mock.calls).toEqual([
      [1, FILES],
      [2, FILES],
    ]);
  });

  it('skips tabs without an id and discarded tabs', async () => {
    const executeScript = vi.fn<ReinjectDeps['executeScript']>(() => Promise.resolve());

    await reinjectContentScript(
      deps([{}, { id: 3, discarded: true }, { id: 4, discarded: false }], executeScript),
    );

    expect(executeScript.mock.calls).toEqual([[4, FILES]]);
  });

  it('resolves when a tab rejects the injection', async () => {
    const executeScript = vi.fn<ReinjectDeps['executeScript']>((tabId) =>
      tabId === 1 ? Promise.reject(new Error('Cannot access a chrome:// URL')) : Promise.resolve(),
    );

    await expect(
      reinjectContentScript(deps([{ id: 1 }, { id: 2 }, { id: 3 }], executeScript)),
    ).resolves.toBeUndefined();
    expect(executeScript.mock.calls.map(([tabId]) => tabId)).toEqual([1, 2, 3]);
  });

  it('resolves without injecting when querying tabs fails', async () => {
    const executeScript = vi.fn<ReinjectDeps['executeScript']>(() => Promise.resolve());

    await expect(
      reinjectContentScript(deps([], executeScript, () => Promise.reject(new Error('no tabs')))),
    ).resolves.toBeUndefined();
    expect(executeScript).not.toHaveBeenCalled();
  });

  it('resolves only after every injection settles', async () => {
    let finish: () => void = () => undefined;
    const executeScript = vi.fn<ReinjectDeps['executeScript']>(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    let done = false;

    const running = reinjectContentScript(deps([{ id: 1 }], executeScript)).then(() => {
      done = true;
    });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(done).toBe(false);

    finish();
    await running;

    expect(done).toBe(true);
  });
});
