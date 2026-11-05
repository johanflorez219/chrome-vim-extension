import type { BackgroundCommandName, Message } from '@/messaging/protocol';

export interface MessageClient {
  /** Fire and forget: resolves when sent or when sending failed. */
  sendCommand(command: BackgroundCommandName, count: number | undefined): Promise<void>;
}

/** `send` is chrome.runtime.sendMessage in the extension. It may throw or reject. */
export function createMessageClient(send: (message: Message) => Promise<unknown>): MessageClient {
  return {
    sendCommand: async (command, count): Promise<void> => {
      const message: Message =
        count === undefined
          ? { type: 'runCommand', command }
          : { type: 'runCommand', command, count };
      try {
        await send(message);
      } catch {
        // A stopped worker, an invalidated extension or a closed tab must not
        // surface in the page (R10.7); nothing is logged (NFR4.1).
      }
    },
  };
}
