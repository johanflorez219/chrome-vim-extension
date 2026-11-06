import { describe, expect, it } from 'vitest';
import config from '../wxt.config';

describe('manifest permissions', () => {
  it('asks for exactly scripting, sessions and webNavigation', () => {
    expect(config).toMatchObject({
      manifest: { permissions: ['scripting', 'sessions', 'webNavigation'] },
    });
  });

  it('does not ask for the tabs permission', () => {
    const manifest =
      typeof config.manifest === 'object' && !(config.manifest instanceof Promise)
        ? config.manifest
        : undefined;

    expect(manifest?.permissions).toBeDefined();
    expect(manifest?.permissions).not.toContain('tabs');
  });
});
