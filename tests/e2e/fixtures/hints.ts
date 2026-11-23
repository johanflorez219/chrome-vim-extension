import { expect, type BrowserContext, type Locator, type Page } from '@playwright/test';

import { OPENED_URL, openPage, readSeen } from './pages';

/** Opens the hints page with the opened page routed, and leaves the test's own page in front. */
export async function openHints(context: BrowserContext): Promise<Page> {
  await context.route(OPENED_URL, (route) =>
    route.fulfill({ contentType: 'text/html', body: '<!doctype html><p>Opened</p>' }),
  );
  const hints = await openPage(context, 'hints');
  // Close the blank tab last, so the window survives
  for (const blank of context.pages().filter((candidate) => candidate.url() === 'about:blank')) {
    await blank.close();
  }
  await hints.bringToFront();
  return hints;
}

/** Presses each key in turn. F is always 'F': a lone Shift reaches the page. */
export async function press(page: Page, keys: readonly string[]): Promise<void> {
  for (const key of keys) {
    await page.keyboard.press(key);
  }
}

/** The hint host: it exists only while Hint mode is on. */
export function hintHost(page: Page): Locator {
  return page.locator('vim-hints');
}

/** Every mouse and pointer event the page received, as `type:id`. */
export function readEvents(page: Page): Promise<string[]> {
  return page.evaluate(() => window.events);
}

/** The ids of the clicks the page received. */
export async function readClicks(page: Page): Promise<string[]> {
  const events = await readEvents(page);
  return events
    .filter((event) => event.startsWith('click:'))
    .map((event) => event.slice('click:'.length));
}

/**
 * Proves that every earlier key was handled and none reached the page: z is not
 * mapped, so it is the only key the page should see.
 */
export async function expectOnlySentinel(page: Page): Promise<void> {
  await page.keyboard.press('z');
  await expect.poll(() => readSeen(page)).toContain('keyup:z:false');
  expect(await readSeen(page)).toEqual(['keydown:z:false', 'keyup:z:false']);
}

/** Three animation frames: one more than the page watcher's two-frame grace. */
export function nextFrames(page: Page): Promise<void> {
  return page.evaluate(async () => {
    for (let i = 0; i < 3; i += 1) {
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          resolve();
        });
      });
    }
  });
}

/** Scroll, layout, focus and selection of the page, as one string to compare. */
export function pageState(page: Page): Promise<string> {
  return page.evaluate(() => {
    const last = document.getElementById('last')?.getBoundingClientRect();
    return [
      scrollX,
      scrollY,
      document.documentElement.scrollWidth,
      document.documentElement.scrollHeight,
      last?.left ?? '',
      last?.top ?? '',
      document.activeElement?.tagName ?? '',
      getSelection()?.toString() ?? '',
    ].join(',');
  });
}
