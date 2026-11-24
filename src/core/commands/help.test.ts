import { describe, expect, it, vi } from 'vitest';

import type { ModeMachine } from '../mode-machine';

import { createHelpCommands } from './help';

describe('createHelpCommands', () => {
  it('registers helpOpen, which enters Help mode and ignores counts (R2.1)', () => {
    const enter = vi.fn<ModeMachine['enter']>();
    const [command] = createHelpCommands({ machine: { enter } });
    expect(command?.name).toBe('helpOpen');
    expect(command?.acceptsCount).toBe(false);
    command?.run({ count: 3, repeat: false });
    expect(enter).toHaveBeenCalledWith('help');
  });

  it('does nothing extra for a repeated key', () => {
    const enter = vi.fn<ModeMachine['enter']>();
    const [command] = createHelpCommands({ machine: { enter } });
    command?.run({ count: undefined, repeat: true });
    expect(enter).not.toHaveBeenCalled();
  });
});
