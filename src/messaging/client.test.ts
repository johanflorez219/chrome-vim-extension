import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Message } from '@/messaging/protocol';
import { createMessageClient } from './client';
import type { MessageClient } from './client';

const send = vi.fn<(message: Message) => Promise<unknown>>();
const client: MessageClient = createMessageClient((message) => send(message));

describe('createMessageClient', () => {
  beforeEach(() => {
    send.mockReset();
    send.mockResolvedValue(undefined);
  });

  it('sends a runCommand message with the command and count', async () => {
    await client.sendCommand('tabNext', 3);

    expect(send).toHaveBeenCalledOnce();
    expect(send).toHaveBeenCalledWith({ type: 'runCommand', command: 'tabNext', count: 3 });
  });

  it('omits count when none was typed', async () => {
    await client.sendCommand('tabNext', undefined);

    expect(send).toHaveBeenCalledOnce();
    expect(send.mock.calls[0]?.[0]).toStrictEqual({ type: 'runCommand', command: 'tabNext' });
  });

  it('resolves when send throws synchronously', async () => {
    send.mockImplementation(() => {
      throw new Error('gone');
    });

    await expect(client.sendCommand('tabNext', undefined)).resolves.toBeUndefined();
  });

  it('resolves when send rejects', async () => {
    send.mockRejectedValue(new Error('Extension context invalidated.'));

    await expect(client.sendCommand('tabNext', undefined)).resolves.toBeUndefined();
  });

  it('resolves when send resolves with a response', async () => {
    send.mockResolvedValue('ignored');

    await expect(client.sendCommand('tabNext', undefined)).resolves.toBeUndefined();
  });
});
