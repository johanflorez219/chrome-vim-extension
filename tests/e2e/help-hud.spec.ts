import type { Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { press } from './fixtures/hints';
import { openPage } from './fixtures/pages';

// The HUD and the help dialog sit in closed shadow roots, so these tests read their
// hosts, their pixels and the keys the page gets, not their text. The text is covered by the unit tests.
const HUD_HOST = 'vim-hud';
const HELP_HOST = 'vim-help';
const HUD_WIDTH = 260;
const HUD_HEIGHT = 60;

/** The bottom-right corner, where the HUD is drawn (R1.1). */
function hudCorner(page: Page): { x: number; y: number; width: number; height: number } {
  const size = page.viewportSize() ?? { width: 1280, height: 720 };
  return {
    x: size.width - HUD_WIDTH,
    y: size.height - HUD_HEIGHT,
    width: HUD_WIDTH,
    height: HUD_HEIGHT,
  };
}

async function hudPixels(page: Page): Promise<Buffer> {
  return page.screenshot({ clip: hudCorner(page) });
}

async function scrollY(page: Page): Promise<number> {
  return page.evaluate(() => window.scrollY);
}

test('the HUD is on the page and lets clicks through (R1.5)', async ({ context }) => {
  const page = await openPage(context, 'controls');
  const hud = page.locator(HUD_HOST);
  await expect(hud).toHaveCount(1);
  expect(await hud.evaluate((element) => getComputedStyle(element).pointerEvents)).toBe('none');
});

test('a pending count shows in the HUD and goes away after the timeout (R1.3, R1.4)', async ({
  context,
}) => {
  const page = await openPage(context, 'article');
  const idle = await hudPixels(page);
  await press(page, ['5', 'g']);
  expect((await hudPixels(page)).equals(idle)).toBe(false);
  // The key timeout is one second, so the pixels return to idle shortly after
  await expect.poll(async () => (await hudPixels(page)).equals(idle), { timeout: 3000 }).toBe(true);
});

test('? opens the key list and ? or Esc closes it (R2.1, R2.3)', async ({ context }) => {
  const page = await openPage(context, 'article');
  await press(page, ['?']);
  await expect(page.locator(HELP_HOST)).toHaveCount(1);
  await press(page, ['?']);
  await expect(page.locator(HELP_HOST)).toHaveCount(0);
  await press(page, ['?']);
  await press(page, ['Escape']);
  await expect(page.locator(HELP_HOST)).toHaveCount(0);
});

test('while the key list is open, j does not scroll the page (R2.4)', async ({ context }) => {
  const page = await openPage(context, 'article');
  await press(page, ['?']);
  await press(page, ['j']);
  expect(await scrollY(page)).toBe(0);
  await press(page, ['?']);
  await press(page, ['j']);
  expect(await scrollY(page)).toBeGreaterThan(0);
});

test('clicking a button while the key list is open keeps it open (R6.2)', async ({ context }) => {
  const page = await openPage(context, 'controls');
  await press(page, ['?']);
  await page.click('#button');
  await expect(page.locator(HELP_HOST)).toHaveCount(1);
});

test('? typed in a text field is text and opens nothing (R6.1)', async ({ context }) => {
  const page = await openPage(context, 'controls');
  await page.click('#text');
  await page.keyboard.press('?');
  await expect(page.locator('#text')).toHaveValue('?');
  await expect(page.locator(HELP_HOST)).toHaveCount(0);
});
