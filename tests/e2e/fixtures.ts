import path from 'node:path';

import { chromium, test as base, type BrowserContext } from '@playwright/test';

const EXTENSION_PATH = path.resolve(import.meta.dirname, '../../.output/chrome-mv3');

export const test = base.extend<{ context: BrowserContext }>({
  // Playwright requires the fixture argument to be an object pattern
  // eslint-disable-next-line no-empty-pattern
  context: async ({}, use) => {
    const context = await chromium.launchPersistentContext('', {
      channel: 'chromium',
      args: [`--disable-extensions-except=${EXTENSION_PATH}`, `--load-extension=${EXTENSION_PATH}`],
    });
    await use(context);
    await context.close();
  },
});

export { expect } from '@playwright/test';
