import type { BrowserContext, Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { HINTS_URL, OPENED_URL, openPage } from './fixtures/pages';
import { expectOnlySentinel, hintHost, openHints, press, readClicks } from './fixtures/hints';

const ORIGIN = 'https://example.test';

// The tests' tsconfig has no chrome types; this is all the worker call below uses.
interface WorkerTab {
  readonly id?: number | undefined;
  readonly index: number;
  readonly active: boolean;
  readonly openerTabId?: number | undefined;
}
declare const chrome: {
  readonly tabs: {
    query(filter: { readonly lastFocusedWindow: boolean }): Promise<readonly WorkerTab[]>;
  };
};

interface TabRow {
  readonly id: number;
  readonly index: number;
  readonly active: boolean;
  readonly openerTabId?: number | undefined;
}

/** The tabs of the last focused window, in order, read from the service worker. */
async function workerTabs(context: BrowserContext): Promise<TabRow[]> {
  const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'));
  const tabs = await worker.evaluate(() => chrome.tabs.query({ lastFocusedWindow: true }));
  return tabs
    .map((tab) => ({
      id: tab.id ?? -1,
      index: tab.index,
      active: tab.active,
      openerTabId: tab.openerTabId,
    }))
    .toSorted((a, b) => a.index - b.index);
}

async function tabCount(context: BrowserContext): Promise<number> {
  return (await workerTabs(context)).length;
}

async function grantClipboard(context: BrowserContext, page: Page): Promise<void> {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: ORIGIN });
  // A stale clipboard value must not pass for a copy
  await page.evaluate(() => navigator.clipboard.writeText('unset'));
}

async function clipboardText(page: Page): Promise<string> {
  return page.evaluate(() => navigator.clipboard.readText());
}

test('F opens a link in a background tab right after the current one', async ({ context }) => {
  const page = await openHints(context);
  // The new tab may show a network error: Playwright attaches its route after the
  // extension opens the tab, so the tab itself is checked through the worker below
  await Promise.all([context.waitForEvent('page'), press(page, ['F', 's'])]);
  await expect.poll(() => tabCount(context)).toBe(2);
  const [current, next] = await workerTabs(context);
  expect(current?.id).toBeDefined();
  expect(current).toMatchObject({ index: 0, active: true });
  expect(next).toMatchObject({ index: 1, active: false, openerTabId: current?.id });
  await expect(page).toHaveURL(HINTS_URL);
  await expect(hintHost(page)).toHaveCount(0);
});

test('F twice keeps the order of the new tabs', async ({ context }) => {
  const page = await openHints(context);
  await press(page, ['F', 's']);
  // Wait for the first tab, so the worker sees it before the second F
  await expect.poll(() => tabCount(context)).toBe(2);
  // k is the checkbox, which F would click; l is the blank link, which F opens
  await press(page, ['F', 'l']);
  await expect.poll(() => tabCount(context)).toBe(3);
  const [current, ...opened] = await workerTabs(context);
  expect(current?.id).toBeDefined();
  expect(opened.map((tab) => tab.index)).toStrictEqual([1, 2]);
  expect(opened.map((tab) => tab.openerTabId)).toStrictEqual([current?.id, current?.id]);
  expect(opened.map((tab) => tab.active)).toStrictEqual([false, false]);
  // Chromium hands out tab ids in creation order, so the first F's tab has the lower id
  expect(opened.map((tab) => tab.id)).toStrictEqual(
    opened.map((tab) => tab.id).toSorted((a, b) => a - b),
  );
});

test('F on a button clicks it and opens nothing', async ({ context }) => {
  const page = await openHints(context);
  await press(page, ['F', 'a']);
  await expect.poll(() => readClicks(page)).toStrictEqual(['button']);
  await expectOnlySentinel(page);
  expect(context.pages()).toHaveLength(1);
  expect(await tabCount(context)).toBe(1);
});

test('yf hints only copyable links and copies a link URL', async ({ context }) => {
  const page = await openHints(context);
  await grantClipboard(context, page);
  await press(page, ['y', 'f', 'a']);
  // The button is not hinted for yf, so a would have clicked it and copied nothing
  await expect.poll(() => clipboardText(page)).toBe(OPENED_URL);
  await expect(hintHost(page)).toHaveCount(0);
});

test('yf copies the absolute URL of a relative link', async ({ context }) => {
  const page = await openHints(context);
  await grantClipboard(context, page);
  // In yf order d is the last link, so this also shows that text inputs get no yf hint
  await press(page, ['y', 'f', 'd']);
  await expect.poll(() => clipboardText(page)).toBe(`${HINTS_URL}#last`);
});

test('gi focuses the first text input and enters Insert mode', async ({ context }) => {
  const page = await openHints(context);
  await press(page, ['g', 'i']);
  await expect(page.locator('#text')).toBeFocused();
  await page.keyboard.type('jk');
  await expect(page.locator('#text')).toHaveValue('jk');
  await expect(page.locator('#area')).toHaveValue('');
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
});

test('2gi focuses the second text input', async ({ context }) => {
  const page = await openHints(context);
  await press(page, ['2', 'g', 'i']);
  await page.keyboard.type('c');
  await expect(page.locator('#area')).toHaveValue('c');
  await expect(page.locator('#text')).toHaveValue('');
});

test('9gi focuses the last text input when there are fewer', async ({ context }) => {
  const page = await openHints(context);
  await press(page, ['9', 'g', 'i']);
  await expect(page.locator('#area')).toBeFocused();
  await page.keyboard.type('d');
  await expect(page.locator('#area')).toHaveValue('d');
});

test("gi keeps the field's value", async ({ context }) => {
  const page = await openHints(context);
  // evaluate, not fill: fill would focus the field first
  await page.locator('#text').evaluate((input: HTMLInputElement) => {
    input.value = 'hello';
  });
  await press(page, ['g', 'i']);
  await page.keyboard.type('x');
  const value = await page.locator('#text').inputValue();
  expect(value).toHaveLength(6);
  expect(value).toContain('hello');
});

test('gi without text inputs does nothing and consumes the keys', async ({ context }) => {
  const page = await openPage(context, 'empty');
  await press(page, ['g', 'i']);
  await expectOnlySentinel(page);
  expect(await page.evaluate(() => document.activeElement === document.body)).toBe(true);
});

test('f works on a page with 1,000 clickables', async ({ context }) => {
  const page = await openPage(context, 'many');
  await press(page, ['f']);
  await expect(hintHost(page)).toHaveCount(1);
  // ss is the label of link 7
  await press(page, ['s', 's']);
  await expect(page).toHaveURL(/#link-7$/);
  await expect(hintHost(page)).toHaveCount(0);
});
