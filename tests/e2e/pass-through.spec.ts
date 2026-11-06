import { expect, test } from './fixtures';
import { openPage, readSeen } from './fixtures/pages';
import type { Page } from '@playwright/test';

// q is unmapped, so once its keyup reaches the page every earlier key was handled
async function waitForPage(page: Page): Promise<void> {
  await page.keyboard.press('q');
  await expect.poll(() => readSeen(page)).toContain('keyup:q:false');
}

function scrollY(page: Page): Promise<number> {
  return page.evaluate(() => window.scrollY);
}

test('hides consumed keys from the page, keyup included', async ({ context }) => {
  const page = await openPage(context, 'recorder');

  await page.keyboard.press('j');
  await waitForPage(page);

  expect(await readSeen(page)).toEqual(['keydown:q:false', 'keyup:q:false']);
  expect(await scrollY(page)).toBe(60);
});

test('lets unmapped keys reach the page with their default action', async ({ context }) => {
  const page = await openPage(context, 'recorder');

  await page.keyboard.press('q');
  await expect.poll(() => readSeen(page)).toContain('keyup:q:false');

  expect(await readSeen(page)).toEqual(['keydown:q:false', 'keyup:q:false']);
});

test('lets Escape reach the page when nothing is pending', async ({ context }) => {
  const page = await openPage(context, 'recorder');

  await page.keyboard.press('Escape');
  await waitForPage(page);

  expect(await readSeen(page)).toEqual([
    'keydown:Escape:false',
    'keyup:Escape:false',
    'keydown:q:false',
    'keyup:q:false',
  ]);
});

test('ignores keys the page dispatches itself', async ({ context }) => {
  const page = await openPage(context, 'recorder');

  await page.evaluate(() => {
    window.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'j', code: 'KeyJ', bubbles: true, cancelable: true }),
    );
  });
  await waitForPage(page);

  expect(await readSeen(page)).toEqual(['keydown:j:false', 'keydown:q:false', 'keyup:q:false']);
  expect(await scrollY(page)).toBe(0);
});
