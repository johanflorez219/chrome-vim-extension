import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRouter } from './router';
import type {
  BackgroundCommandHandlers,
  HandlerContext,
  MessageHandlers,
  Router,
  SenderInfo,
} from './router';

const EXTENSION_ID = 'ext-id';

const runCommand = vi.fn<MessageHandlers['runCommand']>(() => Promise.resolve());
const goodSender: SenderInfo = { id: EXTENSION_ID, frameId: 0, tab: { id: 7, windowId: 3 } };
const goodMessage = { type: 'runCommand', command: 'tabNext', count: 2 };

let router: Router;

beforeEach(() => {
  runCommand.mockReset();
  runCommand.mockResolvedValue(undefined);
  router = createRouter({ handlers: { runCommand }, extensionId: EXTENSION_ID });
});

describe('createRouter', () => {
  it("runs the handler with the message and the sender's tab and window", async () => {
    await router.handle(goodMessage, goodSender);

    const expected: HandlerContext = { tabId: 7, windowId: 3 };
    expect(runCommand).toHaveBeenCalledOnce();
    expect(runCommand).toHaveBeenCalledWith(goodMessage, expected);
    expect(Object.keys(runCommand.mock.calls[0]?.[1] ?? {})).toStrictEqual(['tabId', 'windowId']);
  });

  it('passes a message without count unchanged', async () => {
    const message = { type: 'runCommand', command: 'historyBack' };

    await router.handle(message, goodSender);

    expect(runCommand.mock.calls[0]?.[0]).toStrictEqual(message);
  });

  it('ignores a sender with another extension id', async () => {
    await expect(
      router.handle(goodMessage, { ...goodSender, id: 'other' }),
    ).resolves.toBeUndefined();

    expect(runCommand).not.toHaveBeenCalled();
  });

  it('ignores a sender with no id', async () => {
    await expect(router.handle(goodMessage, { tab: goodSender.tab })).resolves.toBeUndefined();

    expect(runCommand).not.toHaveBeenCalled();
  });

  it.each<readonly [string, SenderInfo]>([
    ['without a tab', { id: EXTENSION_ID, frameId: 0 }],
    ['with a tab without id', { id: EXTENSION_ID, frameId: 0, tab: { windowId: 3 } }],
    ['with a tab without windowId', { id: EXTENSION_ID, frameId: 0, tab: { id: 7 } }],
  ])('ignores a sender %s', async (_label, sender) => {
    await router.handle(goodMessage, sender);

    expect(runCommand).not.toHaveBeenCalled();
  });

  it('ignores a sub-frame sender', async () => {
    await router.handle(goodMessage, { ...goodSender, frameId: 3 });

    expect(runCommand).not.toHaveBeenCalled();
  });

  it('accepts frameId 0 and an undefined frameId', async () => {
    await router.handle(goodMessage, goodSender);
    await router.handle(goodMessage, { id: EXTENSION_ID, tab: goodSender.tab });

    expect(runCommand).toHaveBeenCalledTimes(2);
  });

  it.each<readonly [string, unknown]>([
    ['an unknown type', { type: 'x', command: 'tabNext' }],
    ['an unknown command', { type: 'runCommand', command: 'tabTeleport' }],
    ['null', null],
    ['a string', 'runCommand'],
    ['an object without type', { command: 'tabNext' }],
  ])('ignores messages outside the protocol: %s', async (_label, message) => {
    await expect(router.handle(message, goodSender)).resolves.toBeUndefined();

    expect(runCommand).not.toHaveBeenCalled();
  });

  it('resolves when the handler rejects', async () => {
    runCommand.mockRejectedValueOnce(new Error('x'));

    await expect(router.handle(goodMessage, goodSender)).resolves.toBeUndefined();
  });

  it('resolves when the handler throws synchronously', async () => {
    runCommand.mockImplementationOnce(() => {
      throw new Error('x');
    });

    await expect(router.handle(goodMessage, goodSender)).resolves.toBeUndefined();
  });

  it('resolves when the sender getter throws', async () => {
    const sender: SenderInfo = {
      id: EXTENSION_ID,
      get tab(): never {
        throw new Error('boom');
      },
    };

    await expect(router.handle(goodMessage, sender)).resolves.toBeUndefined();
    expect(runCommand).not.toHaveBeenCalled();
  });

  it('keeps no state between calls', async () => {
    const other = createRouter({ handlers: { runCommand }, extensionId: EXTENSION_ID });

    await router.handle(goodMessage, goodSender);
    await router.handle(goodMessage, goodSender);
    await other.handle(goodMessage, goodSender);

    const [first, second, third] = runCommand.mock.calls;
    expect(second).toStrictEqual(first);
    expect(third).toStrictEqual(first);
  });

  it('requires a handler for every message type', () => {
    // @ts-expect-error missing handler for runCommand
    const missingHandlers = (): Router => createRouter({ handlers: {}, extensionId: EXTENSION_ID });

    expect(missingHandlers).toBeTypeOf('function');
  });
});

describe('BackgroundCommandHandlers', () => {
  const noop = (): Promise<void> => Promise.resolve();

  it('requires a handler for every background command', () => {
    const all: BackgroundCommandHandlers = {
      tabNext: noop,
      tabPrevious: noop,
      tabGoTo: noop,
      tabFirst: noop,
      tabLast: noop,
      tabClose: noop,
      tabRestore: noop,
      tabDuplicate: noop,
      historyBack: noop,
      historyForward: noop,
    };

    expect(Object.keys(all)).toHaveLength(10);
  });

  it('rejects a partial set of commands at compile time', () => {
    // @ts-expect-error missing commands
    const partial: BackgroundCommandHandlers = { tabNext: noop };

    expect(partial).toBeDefined();
  });
});
