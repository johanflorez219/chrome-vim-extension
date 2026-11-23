import type { Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { HINTS_URL, OPENED_URL, openPage } from './fixtures/pages';
import {
  expectOnlySentinel,
  hintHost,
  nextFrames,
  openHints,
  pageState,
  press,
  readClicks,
  readEvents,
} from './fixtures/hints';

const CLICK_BUTTON = [
  'pointerdown:button',
  'mousedown:button',
  'pointerup:button',
  'mouseup:button',
  'click:button',
];
const KEYUP_Z = 'keyup:z:false';
const CTRL_LEFT_BRACKET = 'Control+BracketLeft';

async function scrollY(page: Page): Promise<number> {
  return page.evaluate(() => window.scrollY);
}

test('f and a label follow a link', async ({ context }) => {
  const page = await openHints(context);
  await press(page, ['f', 's']);
  await page.waitForURL(OPENED_URL);
});

test('f and a label click a button with press and release events, and the hints go away', async ({
  context,
}) => {
  const page = await openHints(context);
  await press(page, ['f']);
  await expect(hintHost(page)).toHaveCount(1);
  await press(page, ['a']);
  await expect.poll(() => readEvents(page)).toEqual(CLICK_BUTTON);
  await expect(hintHost(page)).toHaveCount(0);
});

test('the host keeps its own style against the page CSS', async ({ context }) => {
  const page = await openHints(context);
  await press(page, ['f']);
  await expect(hintHost(page)).toHaveCount(1);
  const style = await hintHost(page).evaluate((element) => {
    const computed = getComputedStyle(element);
    return {
      position: computed.position,
      pointerEvents: computed.pointerEvents,
      display: computed.display,
      ariaHidden: element.getAttribute('aria-hidden'),
      popoverOpen: element.matches(':popover-open'),
    };
  });
  expect(style.position).toBe('fixed');
  expect(style.pointerEvents).toBe('none');
  expect(style.display).not.toBe('none');
  expect(style.ariaHidden).toBe('true');
  expect(style.popoverOpen).toBe(true);
  await press(page, ['Escape']);
  await expect(hintHost(page)).toHaveCount(0);
});

test('showing hints leaves layout, scroll, focus and selection alone', async ({ context }) => {
  const page = await openHints(context);
  await page.evaluate(() => {
    const range = document.createRange();
    range.selectNodeContents(document.getElementById('first') ?? document.body);
    getSelection()?.addRange(range);
  });
  const before = await pageState(page);
  await press(page, ['f']);
  await expect(hintHost(page)).toHaveCount(1);
  expect(await pageState(page)).toBe(before);
  await press(page, ['Escape']);
  await expect(hintHost(page)).toHaveCount(0);
  expect(await pageState(page)).toBe(before);
});

test('f on a text input focuses it and enters Insert mode', async ({ context }) => {
  const page = await openHints(context);
  await press(page, ['f', 'd']);
  await page.keyboard.type('xj');
  await expect(page.locator('#text')).toHaveValue('xj');
  expect(await scrollY(page)).toBe(0);
  expect(await readClicks(page)).toStrictEqual([]);
});

test('f on a select focuses it and enters Insert mode', async ({ context }) => {
  const page = await openHints(context);
  await press(page, ['f', 'j']);
  await expect(page.locator('#pick')).toBeFocused();
  await press(page, ['j']);
  await expect.poll(() => page.evaluate(() => window.seen)).toContain('keydown:j:false');
  expect(await scrollY(page)).toBe(0);
  expect(await readClicks(page)).toStrictEqual([]);
});

test('a checkbox inside its label gets one hint', async ({ context }) => {
  const page = await openHints(context);
  await press(page, ['f', 'k']);
  await expect(page.locator('#check')).toBeChecked();
  await expect.poll(() => readClicks(page)).toStrictEqual(['check']);
});

test('f on a target=_blank link opens it', async ({ context }) => {
  const page = await openHints(context);
  const [opened] = await Promise.all([context.waitForEvent('page'), press(page, ['f', 'l'])]);
  await opened.waitForURL(OPENED_URL);
  await expect(page).toHaveURL(HINTS_URL);
});

test('f reaches a button in a closed shadow root', async ({ context }) => {
  const page = await openHints(context);
  await press(page, ['f', 'e']);
  await expect.poll(() => readClicks(page)).toStrictEqual(['shadow-host']);
});

test('off-screen, hidden, covered and iframe links get no label', async ({ context }) => {
  const page = await openHints(context);
  // Unscrolled: c is the off-screen link's label, so it must do nothing
  await press(page, ['f']);
  await expect(hintHost(page)).toHaveCount(1);
  await press(page, ['c']);
  await expect(hintHost(page)).toHaveCount(0);
  await expectOnlySentinel(page);
  await expect(page).toHaveURL(HINTS_URL);
  expect(await readClicks(page)).toStrictEqual([]);
  // w is the ninth label, so the hidden, covered and iframe links got none
  await press(page, ['f', 'w']);
  await expect(page).toHaveURL(`${HINTS_URL}#last`);
  expect(await readClicks(page)).toStrictEqual(['last']);
});

test('Esc and a non-label key cancel without reaching the page', async ({ context }) => {
  const page = await openHints(context);
  await press(page, ['f']);
  await expect(hintHost(page)).toHaveCount(1);
  await press(page, ['Escape']);
  await expect(hintHost(page)).toHaveCount(0);
  await press(page, ['f']);
  await expect(hintHost(page)).toHaveCount(1);
  await press(page, ['q']);
  await expect(hintHost(page)).toHaveCount(0);
  await expectOnlySentinel(page);
  expect(await readClicks(page)).toStrictEqual([]);
});

test('Ctrl+[ cancels without reaching the page', async ({ context }) => {
  const page = await openHints(context);
  await press(page, ['f']);
  await expect(hintHost(page)).toHaveCount(1);
  await press(page, [CTRL_LEFT_BRACKET]);
  await expect(hintHost(page)).toHaveCount(0);
  await page.keyboard.press('z');
  await expect.poll(() => page.evaluate(() => window.seen)).toContain(KEYUP_Z);
  const seen = await page.evaluate(() => window.seen);
  expect(seen.filter((entry) => entry.startsWith('keydown:['))).toStrictEqual([]);
  expect(await readClicks(page)).toStrictEqual([]);
});

test('a key with Ctrl cancels and reaches the page', async ({ context }) => {
  const page = await openHints(context);
  await press(page, ['f']);
  await expect(hintHost(page)).toHaveCount(1);
  await press(page, ['Control+b']);
  await expect(hintHost(page)).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => window.seen)).toContain('keydown:b:false');
});

test('scrolling cancels the hints', async ({ context }) => {
  const page = await openHints(context);
  await press(page, ['f']);
  await expect(hintHost(page)).toHaveCount(1);
  await nextFrames(page);
  await page.mouse.wheel(0, 200);
  await expect.poll(() => scrollY(page)).toBeGreaterThan(0);
  await expect(hintHost(page)).toHaveCount(0);
  // Hint mode is off, so the unmapped a reaches the page
  await press(page, ['a']);
  await expect.poll(() => page.evaluate(() => window.seen)).toContain('keydown:a:false');
  expect(await readClicks(page)).toStrictEqual([]);
});

test('a page with nothing to hint shows nothing and consumes f', async ({ context }) => {
  const page = await openPage(context, 'empty');
  await press(page, ['f']);
  await expect(hintHost(page)).toHaveCount(0);
  await expectOnlySentinel(page);
});

test('typing in a field never starts hints', async ({ context }) => {
  const page = await openHints(context);
  await page.focus('#text');
  await page.keyboard.type('fFyg');
  await expect(page.locator('#text')).toHaveValue('fFyg');
  await expect(hintHost(page)).toHaveCount(0);
});
