import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createHistoryApi } from './history-api';
import type { CommitEvent } from './history-api';

interface Details {
  readonly tabId: number;
  readonly frameId: number;
}
type Listener = (details: Details) => void;

const goBack = vi.fn<(tabId: number) => Promise<void>>(() => Promise.resolve());
const goForward = vi.fn<(tabId: number) => Promise<void>>(() => Promise.resolve());
const listeners = new Set<Listener>();
const addListener = vi.fn<(listener: Listener) => void>((listener) => {
  listeners.add(listener);
});
const removeListener = vi.fn<(listener: Listener) => void>((listener) => {
  listeners.delete(listener);
});
const onCommitted: CommitEvent = { addListener, removeListener };

function emit(details: Details): void {
  for (const listener of [...listeners]) {
    listener(details);
  }
}

function track(done: Promise<void>): { settled: boolean } {
  const state = { settled: false };
  void done.then(() => {
    state.settled = true;
  });
  return state;
}

const api = createHistoryApi({ goBack, goForward, onCommitted });

beforeEach(() => {
  vi.useFakeTimers();
  goBack.mockReset();
  goBack.mockResolvedValue(undefined);
  goForward.mockReset();
  goForward.mockResolvedValue(undefined);
  addListener.mockClear();
  removeListener.mockClear();
  listeners.clear();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('go', () => {
  it('go back calls goBack with the tab', async () => {
    await api.go('back', 5);

    expect(goBack).toHaveBeenCalledOnce();
    expect(goBack).toHaveBeenCalledWith(5);
    expect(goForward).not.toHaveBeenCalled();
  });

  it('go forward calls goForward with the tab', async () => {
    await api.go('forward', 5);

    expect(goForward).toHaveBeenCalledOnce();
    expect(goForward).toHaveBeenCalledWith(5);
    expect(goBack).not.toHaveBeenCalled();
  });

  it('rejects when goBack or goForward rejects', async () => {
    goBack.mockRejectedValueOnce(new Error('no entry'));
    goForward.mockRejectedValueOnce(new Error('no entry'));

    await expect(api.go('back', 5)).rejects.toThrow('no entry');
    await expect(api.go('forward', 5)).rejects.toThrow('no entry');
  });

  it('rejects when goBack throws synchronously', async () => {
    goBack.mockImplementationOnce(() => {
      throw new Error('x');
    });

    await expect(api.go('back', 5)).rejects.toThrow('x');
  });
});

describe('expectCommit', () => {
  it('registers a listener before any event', () => {
    api.expectCommit(7, 1000);

    expect(addListener).toHaveBeenCalledOnce();
    expect(listeners.size).toBe(1);
  });

  it('resolves on a main-frame commit of the tab and removes the listener', async () => {
    const { done } = api.expectCommit(7, 1000);
    const registered = addListener.mock.calls[0]?.[0];

    emit({ tabId: 7, frameId: 0 });

    await expect(done).resolves.toBeUndefined();
    expect(removeListener).toHaveBeenCalledOnce();
    expect(removeListener).toHaveBeenCalledWith(registered);
    expect(listeners.size).toBe(0);
  });

  it('ignores other tabs and sub-frames', async () => {
    const { done } = api.expectCommit(7, 1000);
    const state = track(done);

    emit({ tabId: 8, frameId: 0 });
    emit({ tabId: 7, frameId: 2 });
    await vi.advanceTimersByTimeAsync(999);

    expect(state.settled).toBe(false);
    expect(removeListener).not.toHaveBeenCalled();
  });

  it('resolves after the timeout and removes the listener', async () => {
    const { done } = api.expectCommit(7, 1000);
    const state = track(done);

    await vi.advanceTimersByTimeAsync(999);
    expect(state.settled).toBe(false);
    await vi.advanceTimersByTimeAsync(1);

    expect(state.settled).toBe(true);
    expect(removeListener).toHaveBeenCalledOnce();
  });

  it('ignores events after it finished', async () => {
    const { done } = api.expectCommit(7, 1000);
    emit({ tabId: 7, frameId: 0 });
    await done;

    emit({ tabId: 7, frameId: 0 });
    await vi.advanceTimersByTimeAsync(5000);

    expect(removeListener).toHaveBeenCalledOnce();
  });

  it('cancel removes the listener and clears the timer', async () => {
    const expectation = api.expectCommit(7, 1000);

    expectation.cancel();
    expect(listeners.size).toBe(0);
    await vi.advanceTimersByTimeAsync(5000);

    expect(removeListener).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('cancel after done is a no-op', async () => {
    const expectation = api.expectCommit(7, 1000);
    emit({ tabId: 7, frameId: 0 });
    await expectation.done;

    expectation.cancel();
    expectation.cancel();

    expect(removeListener).toHaveBeenCalledOnce();
  });

  it('keeps two expectations independent', async () => {
    const first = track(api.expectCommit(7, 1000).done);
    const second = track(api.expectCommit(9, 1000).done);

    emit({ tabId: 9, frameId: 0 });
    await vi.advanceTimersByTimeAsync(0);

    expect(second.settled).toBe(true);
    expect(first.settled).toBe(false);
  });
});
