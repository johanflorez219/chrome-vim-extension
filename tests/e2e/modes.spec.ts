import type { Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { openPage, readSeen } from './fixtures/pages';

function scrollY(page: Page): Promise<number> {
  return page.evaluate(() => window.scrollY);
}

test('types into a clicked text input instead of scrolling', async ({ context }) => {
  const page = await openPage(context, 'form');

  await page.click('#text');
  await page.keyboard.type('jk');

  await expect(page.locator('#text')).toHaveValue('jk');
  expect(await scrollY(page)).toBe(0);
});

test('enters Insert mode when Tab focuses a field and stays in it on the next Tab', async ({
  context,
}) => {
  const page = await openPage(context, 'form');

  await page.keyboard.press('Tab');
  await expect(page.locator('#text')).toBeFocused();
  await page.keyboard.type('j');
  await page.keyboard.press('Tab');
  await expect(page.locator('#area')).toBeFocused();
  await page.keyboard.type('k');

  await expect(page.locator('#text')).toHaveValue('j');
  await expect(page.locator('#area')).toHaveValue('k');
  expect(await scrollY(page)).toBe(0);
});

for (const key of ['Escape', 'Control+BracketLeft']) {
  test(`leaves Insert mode and blurs the field on ${key}`, async ({ context }) => {
    const page = await openPage(context, 'form');

    await page.click('#text');
    await page.keyboard.type('j');
    await page.keyboard.press(key);
    await expect
      .poll(() => page.evaluate(() => document.activeElement === document.body))
      .toBe(true);
    await page.keyboard.press('j');

    await expect.poll(() => scrollY(page)).toBe(60);
    await expect(page.locator('#text')).toHaveValue('j');
  });
}

test('returns to Normal mode when a field loses focus to the page', async ({ context }) => {
  const page = await openPage(context, 'form');

  await page.click('#text');
  await page.mouse.click(640, 400);
  await expect(page.locator('#text')).not.toBeFocused();
  await page.keyboard.press('j');

  await expect.poll(() => scrollY(page)).toBe(60);
  await expect(page.locator('#text')).toHaveValue('');
});

test('stays in Normal mode when focus moves from a text field to a checkbox', async ({
  context,
}) => {
  const page = await openPage(context, 'form');

  await page.click('#text');
  await page.locator('#check').focus();
  await expect(page.locator('#check')).toBeFocused();
  await page.keyboard.press('j');

  await expect.poll(() => scrollY(page)).toBe(60);
});

test('types into a contenteditable element', async ({ context }) => {
  const page = await openPage(context, 'form');

  await page.click('#editor');
  await page.keyboard.type('j');

  await expect(page.locator('#editor')).toHaveText('j');
  expect(await scrollY(page)).toBe(0);
});

test('types into an input inside an open shadow root', async ({ context }) => {
  const page = await openPage(context, 'shadow');

  await page.locator('#open-input').click();
  await page.keyboard.type('j');

  await expect(page.locator('#open-input')).toHaveValue('j');
  expect(await scrollY(page)).toBe(0);
});

test('types into an input inside a closed shadow root focused by script', async ({ context }) => {
  const page = await openPage(context, 'shadow');

  await page.evaluate(() => {
    window.closedInput.focus();
  });
  await page.keyboard.type('j');

  await expect.poll(() => page.evaluate(() => window.closedInput.value)).toBe('j');
  expect(await scrollY(page)).toBe(0);
});

test('types into a designMode document', async ({ context }) => {
  const page = await openPage(context, 'design');

  await page.click('#para');
  await page.keyboard.press('j');

  await expect(page.locator('#para')).toContainText('j');
  expect(await scrollY(page)).toBe(0);
});

test('types into a field focused by autofocus', async ({ context }) => {
  const page = await openPage(context, 'autofocus');

  await expect(page.locator('#auto')).toBeFocused();
  await page.keyboard.type('j');

  await expect(page.locator('#auto')).toHaveValue('j');
  expect(await scrollY(page)).toBe(0);
});

test('i enters sticky Insert mode that ignores focus changes until Escape', async ({ context }) => {
  const page = await openPage(context, 'form');

  await page.keyboard.press('i');
  await page.keyboard.press('j');
  await page.click('#text');
  await page.mouse.click(640, 400);
  await expect(page.locator('#text')).not.toBeFocused();
  await page.keyboard.press('j');
  await page.keyboard.press('Escape');
  await page.keyboard.press('j');

  await expect.poll(() => scrollY(page)).toBe(60);
});

test('consumes i and lets later keys reach the page in sticky Insert mode', async ({ context }) => {
  const page = await openPage(context, 'recorder');

  await page.keyboard.press('i');
  await page.keyboard.press('x');

  await expect.poll(() => readSeen(page)).toEqual(['keydown:x:false', 'keyup:x:false']);
});
