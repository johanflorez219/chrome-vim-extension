import type { BrowserContext, Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { openAt } from './fixtures/pages';

function pathOf(page: Page): string {
  const url = new URL(page.url());
  return url.pathname + url.search + url.hash;
}

async function press(page: Page, keys: readonly string[]): Promise<void> {
  await page.bringToFront();
  for (const key of keys) {
    await page.keyboard.press(key);
  }
}

/** Four entries: p1, p2, p2#a, p3. */
async function openHistory(context: BrowserContext): Promise<Page> {
  const page = await openAt(context, '/p1');
  await page.goto('https://example.test/p2');
  await page.evaluate(() => {
    location.hash = 'a';
  });
  await page.goto('https://example.test/p3');
  await expect(page.evaluate(() => history.length)).resolves.toBe(4);
  return page;
}

async function setMarker(page: Page): Promise<void> {
  await page.evaluate(() => {
    window.marker = 1;
  });
}

const POLL = { timeout: 10_000 };

test('H goes back and L goes forward across two documents', async ({ context }) => {
  const page = await openAt(context, '/p1');
  await page.goto('https://example.test/p2');

  await press(page, ['Shift+H']);
  await expect.poll(() => pathOf(page), POLL).toBe('/p1');
  await press(page, ['Shift+L']);
  await expect.poll(() => pathOf(page), POLL).toBe('/p2');
});

test('3H steps back across documents and hash changes', async ({ context }) => {
  const page = await openHistory(context);

  await press(page, ['3', 'Shift+H']);

  await expect.poll(() => pathOf(page), POLL).toBe('/p1');
});

test('9H stops at the first entry', async ({ context }) => {
  const page = await openHistory(context);

  await press(page, ['9', 'Shift+H']);

  await expect.poll(() => pathOf(page), POLL).toBe('/p1');
});

test('H on the first entry does nothing', async ({ context }) => {
  const page = await openAt(context, '/p1');
  await setMarker(page);
  const length = await page.evaluate(() => history.length);

  await press(page, ['Shift+H']);

  expect(pathOf(page)).toBe('/p1');
  expect(await page.evaluate(() => window.marker)).toBe(1);
  expect(await page.evaluate(() => history.length)).toBe(length);
});

test('r reloads the page', async ({ context }) => {
  const page = await openAt(context, '/p1');
  await setMarker(page);

  await Promise.all([page.waitForEvent('load'), press(page, ['r'])]);

  expect(await page.evaluate(() => window.marker)).toBeUndefined();
});

test('yy copies the full URL', async ({ context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], {
    origin: 'https://example.test',
  });
  const page = await openAt(context, '/a/b?q=1#h');

  await press(page, ['y', 'y']);

  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toBe('https://example.test/a/b?q=1#h');
});

test('gu goes up one level', async ({ context }) => {
  const page = await openAt(context, '/a/b/c?q#h');

  await press(page, ['g', 'u']);

  await expect.poll(() => pathOf(page), POLL).toBe('/a/b');
});

test('2gu goes up two levels', async ({ context }) => {
  const page = await openAt(context, '/a/b/c?q#h');

  await press(page, ['2', 'g', 'u']);

  await expect.poll(() => pathOf(page), POLL).toBe('/a');
});

test('gU goes to the root', async ({ context }) => {
  const page = await openAt(context, '/a/b/c?q#h');

  await press(page, ['g', 'Shift+U']);

  await expect.poll(() => pathOf(page), POLL).toBe('/');
});

test('gu at the root does nothing', async ({ context }) => {
  const page = await openAt(context, '/');
  await setMarker(page);

  await press(page, ['g', 'u']);

  expect(pathOf(page)).toBe('/');
  expect(await page.evaluate(() => window.marker)).toBe(1);
});
