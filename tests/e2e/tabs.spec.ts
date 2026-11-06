import type { BrowserContext, Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { openPage, readSeen } from './fixtures/pages';

// The tests' tsconfig has no chrome types; this is all the worker call below uses.
declare const chrome: {
  readonly tabs: {
    query(filter: {
      readonly active: boolean;
      readonly lastFocusedWindow: boolean;
    }): Promise<readonly { readonly index: number }[]>;
  };
};

function pageAt(pages: readonly Page[], index: number): Page {
  const page = pages[index];
  if (page === undefined) {
    throw new Error(`no page at ${String(index)}`);
  }
  return page;
}

/** Opens `count` tabs in order; the last one is active. The blank tab goes last so the window survives. */
async function openTabs(context: BrowserContext, count: number): Promise<Page[]> {
  const pages: Page[] = [];
  for (let i = 0; i < count; i++) {
    pages.push(await openPage(context, 'recorder'));
  }
  for (const blank of context.pages().filter((candidate) => candidate.url() === 'about:blank')) {
    await blank.close();
  }
  return pages;
}

/**
 * The index of the active tab, read from the service worker: headless Chromium
 * reports every tab as visible, so `document.visibilityState` can't tell.
 */
async function activeIndex(context: BrowserContext): Promise<number> {
  const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'));
  return worker.evaluate(async () => {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    return tab?.index ?? -1;
  });
}

async function activate(
  context: BrowserContext,
  pages: readonly Page[],
  index: number,
): Promise<void> {
  await pageAt(pages, index).bringToFront();
  await expect.poll(() => activeIndex(context)).toBe(index);
}

async function press(
  context: BrowserContext,
  pages: readonly Page[],
  from: number,
  keys: string,
): Promise<void> {
  await activate(context, pages, from);
  const page = pageAt(pages, from);
  try {
    await page.keyboard.type(keys);
  } catch (error) {
    // x closes the tab, which can happen before the keyboard call returns
    if (!page.isClosed()) {
      throw error;
    }
  }
}

// A consumed key is hidden from the page, so once the unmapped q has been seen
// every earlier key was handled, and none of them reached the page (R10.1).
async function expectConsumed(page: Page): Promise<void> {
  await page.keyboard.press('q');
  await expect.poll(() => readSeen(page)).toContain('keyup:q:false');
  expect(await readSeen(page)).toEqual(['keydown:q:false', 'keyup:q:false']);
}

// Used only to prove that nothing happened, which polling cannot do.
async function settle(page: Page): Promise<void> {
  // eslint-disable-next-line sonarjs/no-fixed-wait-in-tests -- see above
  await page.waitForTimeout(300);
}

test('J moves to the next tab', async ({ context }) => {
  const pages = await openTabs(context, 4);

  await press(context, pages, 0, 'J');

  await expect.poll(() => activeIndex(context)).toBe(1);
});

test('K moves to the previous tab', async ({ context }) => {
  const pages = await openTabs(context, 4);

  await press(context, pages, 2, 'K');

  await expect.poll(() => activeIndex(context)).toBe(1);
});

test('J on the last tab wraps to the first and K on the first wraps to the last', async ({
  context,
}) => {
  const pages = await openTabs(context, 4);

  await press(context, pages, 3, 'J');
  await expect.poll(() => activeIndex(context)).toBe(0);
  await press(context, pages, 0, 'K');
  await expect.poll(() => activeIndex(context)).toBe(3);
});

test('2J skips one tab', async ({ context }) => {
  const pages = await openTabs(context, 4);

  await press(context, pages, 0, '2J');

  await expect.poll(() => activeIndex(context)).toBe(2);
});

test('3gt goes to the third tab and 99gt to the last', async ({ context }) => {
  const pages = await openTabs(context, 4);

  await press(context, pages, 0, '3gt');
  await expect.poll(() => activeIndex(context)).toBe(2);
  await press(context, pages, 2, '99gt');
  await expect.poll(() => activeIndex(context)).toBe(3);
});

test('gt without a count goes to the next tab', async ({ context }) => {
  const pages = await openTabs(context, 4);

  await press(context, pages, 0, 'gt');

  await expect.poll(() => activeIndex(context)).toBe(1);
});

test('g0 goes to the first tab and g$ to the last', async ({ context }) => {
  const pages = await openTabs(context, 4);

  await press(context, pages, 2, 'g0');
  await expect.poll(() => activeIndex(context)).toBe(0);
  await press(context, pages, 0, 'g$');
  await expect.poll(() => activeIndex(context)).toBe(3);
});

test('g0 on the first tab keeps it active and the key is consumed', async ({ context }) => {
  const pages = await openTabs(context, 4);

  await press(context, pages, 0, 'g0');

  await expectConsumed(pageAt(pages, 0));
  await settle(pageAt(pages, 0));
  expect(await activeIndex(context)).toBe(0);
});

test('2g0 ignores the count', async ({ context }) => {
  const pages = await openTabs(context, 4);

  await press(context, pages, 2, '2g0');

  await expect.poll(() => activeIndex(context)).toBe(0);
});

test('J in a window with one tab does nothing but is consumed', async ({ context }) => {
  const pages = await openTabs(context, 1);

  await press(context, pages, 0, 'J');

  await expectConsumed(pageAt(pages, 0));
  await settle(pageAt(pages, 0));
  expect(await activeIndex(context)).toBe(0);
});

test('x closes the current tab and keeps the others', async ({ context }) => {
  const pages = await openTabs(context, 4);

  await press(context, pages, 1, 'x');

  await expect.poll(() => pageAt(pages, 1).isClosed()).toBe(true);
  await expect.poll(() => context.pages().length).toBe(3);
});

test('2x closes only one tab', async ({ context }) => {
  const pages = await openTabs(context, 4);

  await press(context, pages, 1, '2x');

  await expect.poll(() => pageAt(pages, 1).isClosed()).toBe(true);
  await expect.poll(() => context.pages().length).toBe(3);
  await settle(pageAt(pages, 0));
  expect(context.pages()).toHaveLength(3);
});

test('yt adds one tab and activates it', async ({ context }) => {
  const pages = await openTabs(context, 4);

  await press(context, pages, 0, 'yt');

  await expect.poll(() => context.pages().length).toBe(5);
  // The browser puts a duplicate right after its original, so the copy of tab 0
  // sits at index 1. context.pages() lists pages by creation, not by strip order,
  // and page.route is per page, so the copy's content is not checked.
  await expect.poll(() => activeIndex(context)).toBe(1);
});
