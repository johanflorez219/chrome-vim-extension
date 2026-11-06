import type { BackgroundCommandName, Message } from './protocol';
import { isMessage } from './protocol';

export interface HandlerContext {
  /** The tab and window where the key was pressed (R10.5). */
  readonly tabId: number;
  readonly windowId: number;
}

/** A handler for every Message type, checked by the compiler (R1.2). */
export type MessageHandlers = {
  readonly [T in Message['type']]: (
    message: Extract<Message, { type: T }>,
    ctx: HandlerContext,
  ) => Promise<void>;
};

/** A handler for every background command, checked by the compiler (R1.2). */
export type BackgroundCommandHandlers = Readonly<
  Record<BackgroundCommandName, (count: number | undefined, ctx: HandlerContext) => Promise<void>>
>;

export interface SenderInfo {
  readonly id?: string | undefined;
  readonly frameId?: number | undefined;
  readonly tab?:
    { readonly id?: number | undefined; readonly windowId?: number | undefined } | undefined;
}

export interface Router {
  /**
   * Never rejects: the whole body, `isMessage` and the sender checks included,
   * runs inside one try/catch. Ignores a sender whose id is not ours, that has
   * no tab, or whose `frameId` is defined and not 0 (R1.4, R10.6), and a
   * message that fails `isMessage` (R1.5). Swallows handler failures (R1.6).
   */
  handle(message: unknown, sender: SenderInfo): Promise<void>;
}

/** The tab context of a sender we accept, or undefined for one we ignore. */
function contextOf(sender: SenderInfo, extensionId: string): HandlerContext | undefined {
  if (sender.id !== extensionId) {
    return undefined;
  }
  const tab = sender.tab;
  if (tab?.id === undefined || tab.windowId === undefined) {
    return undefined;
  }
  if (sender.frameId !== undefined && sender.frameId !== 0) {
    return undefined;
  }
  return { tabId: tab.id, windowId: tab.windowId };
}

export function createRouter(deps: {
  readonly handlers: MessageHandlers;
  /** chrome.runtime.id */
  readonly extensionId: string;
}): Router {
  return {
    handle: async (message, sender): Promise<void> => {
      try {
        const ctx = contextOf(sender, deps.extensionId);
        if (ctx === undefined || !isMessage(message)) {
          return;
        }
        await deps.handlers[message.type](message, ctx);
      } catch {
        // Never surface an error to the sender and never log (NFR4.1).
      }
    },
  };
}
