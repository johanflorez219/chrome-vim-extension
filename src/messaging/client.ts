import type { BackgroundCommandName, Message } from '@/messaging/protocol';

export interface MessageClient {
  /** Fire and forget: resolves when sent or when sending failed. */
  sendCommand(command: BackgroundCommandName, count: number | undefined): Promise<void>;
  /** Fire and forget: resolves when sent or when sending failed; never rejects. The worker checks the URL (NFR3.2). */
  openTab(url: string): Promise<void>;
}

async function deliver(
  send: (message: Message) => Promise<unknown>,
  message: Message,
): Promise<void> {
  try {
    // The await also catches a synchronous throw from send
    await send(message);
  } catch {
    // A stopped worker, an invalidated extension or a closed tab must not surface in
    // the page (M2's R10.7, R5.6); nothing is logged (NFR4.1).
  }
}

/** `send` is chrome.runtime.sendMessage in the extension. It may throw or reject. */
export function createMessageClient(send: (message: Message) => Promise<unknown>): MessageClient {
  return {
    sendCommand: (command, count): Promise<void> =>
      deliver(
        send,
        count === undefined
          ? { type: 'runCommand', command }
          : { type: 'runCommand', command, count },
      ),
    openTab: (url): Promise<void> => deliver(send, { type: 'openTab', url }),
  };
}
