import { setTimeout as sleep } from 'node:timers/promises';

import type { CDPSession, Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { openPage } from './fixtures/pages';

interface ScrollSample {
  readonly t: number;
  readonly y: number;
}

declare global {
  interface Window {
    scrollLog: ScrollSample[];
  }
}

const PANEL = '#panel';
const OUTSIDE = '#outside';
const MAIN = '#main';

function pageScrollY(page: Page): Promise<number> {
  return page.evaluate(() => window.scrollY);
}

function scrollTopOf(page: Page, selector: string): Promise<number> {
  return page.locator(selector).evaluate((element) => element.scrollTop);
}

async function expectNear(read: () => Promise<number>, expected: number): Promise<void> {
  await expect.poll(async () => Math.abs((await read()) - expected)).toBeLessThanOrEqual(1);
}

async function recordScrolls(page: Page): Promise<void> {
  await page.evaluate(() => {
    window.scrollLog = [];
    window.addEventListener(
      'scroll',
      () => {
        window.scrollLog.push({ t: performance.now(), y: window.scrollY });
      },
      { passive: true },
    );
  });
}

function scrollRange(page: Page): Promise<number> {
  return page.evaluate(
    () => document.documentElement.scrollHeight - document.documentElement.clientHeight,
  );
}

const KEY_J = { key: 'j', code: 'KeyJ', windowsVirtualKeyCode: 74 };

async function holdKey(session: CDPSession, repeats: number): Promise<void> {
  await session.send('Input.dispatchKeyEvent', { type: 'keyDown', ...KEY_J, text: 'j' });
  for (let i = 0; i < repeats; i += 1) {
    await sleep(33);
    await session.send('Input.dispatchKeyEvent', {
      type: 'keyDown',
      ...KEY_J,
      text: 'j',
      autoRepeat: true,
    });
  }
  await sleep(33);
  await session.send('Input.dispatchKeyEvent', { type: 'keyUp', ...KEY_J });
}

test('j and k scroll 60 px times the count', async ({ context }) => {
  const page = await openPage(context, 'article');

  await page.keyboard.press('j');
  await expect.poll(() => pageScrollY(page)).toBe(60);
  await page.keyboard.press('3');
  await page.keyboard.press('j');
  await expect.poll(() => pageScrollY(page)).toBe(240);
  await page.keyboard.press('k');
  await expect.poll(() => pageScrollY(page)).toBe(180);
});

test('h and l scroll 40 px times the count', async ({ context }) => {
  const page = await openPage(context, 'article');
  const scrollX = (): Promise<number> => page.evaluate(() => window.scrollX);

  await page.keyboard.press('l');
  await expect.poll(scrollX).toBe(40);
  await page.keyboard.press('3');
  await page.keyboard.press('l');
  await expect.poll(scrollX).toBe(160);
  await page.keyboard.press('h');
  await expect.poll(scrollX).toBe(120);
});

test('d, u, Control+d and Control+u scroll half the visible height', async ({ context }) => {
  const page = await openPage(context, 'article');
  // Not innerHeight: the horizontal scrollbar takes up height
  const half = await page.evaluate(() => document.documentElement.clientHeight / 2);

  for (const [key, sign] of [
    ['d', 1],
    ['Control+d', 1],
    ['u', -1],
    ['Control+u', -1],
  ] as const) {
    const before = await pageScrollY(page);
    await page.keyboard.press(key);
    await expectNear(() => pageScrollY(page), before + sign * half);
  }

  await expectNear(() => pageScrollY(page), 0);
});

test('G goes to the bottom and gg to the top', async ({ context }) => {
  const page = await openPage(context, 'article');
  const bottom = await scrollRange(page);

  await page.keyboard.press('Shift+G');
  await expect.poll(() => pageScrollY(page)).toBe(bottom);
  await page.keyboard.press('g');
  await page.keyboard.press('g');
  await expect.poll(() => pageScrollY(page)).toBe(0);
});

test('50G goes to half the scroll range', async ({ context }) => {
  const page = await openPage(context, 'article');
  const range = await scrollRange(page);

  await page.keyboard.press('5');
  await page.keyboard.press('0');
  await page.keyboard.press('Shift+G');

  await expectNear(() => pageScrollY(page), range / 2);
});

test('scrolls the panel that was clicked', async ({ context }) => {
  const page = await openPage(context, 'panel');

  await page.click(PANEL);
  await page.keyboard.press('j');

  await expect.poll(() => scrollTopOf(page, PANEL)).toBe(60);
  expect(await pageScrollY(page)).toBe(0);
});

test('scrolls the document after a click outside any panel', async ({ context }) => {
  const page = await openPage(context, 'panel');

  await page.click(PANEL);
  await page.keyboard.press('j');
  await expect.poll(() => scrollTopOf(page, PANEL)).toBe(60);
  await page.click(OUTSIDE);
  await page.keyboard.press('j');

  await expect.poll(() => pageScrollY(page)).toBe(60);
  expect(await scrollTopOf(page, PANEL)).toBe(60);
});

test('falls back to the document when the panel is removed', async ({ context }) => {
  const page = await openPage(context, 'panel');

  await page.click(PANEL);
  await page.locator(PANEL).evaluate((element) => {
    element.remove();
  });
  await page.keyboard.press('j');

  await expect.poll(() => pageScrollY(page)).toBe(60);
});

test("does not pass the scroll to the document at the panel's edge", async ({ context }) => {
  const page = await openPage(context, 'panel');
  await page.locator(PANEL).evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  const bottom = await scrollTopOf(page, PANEL);

  await page.click(PANEL);
  await page.keyboard.press('j');
  await page.keyboard.press('k');

  await expect.poll(() => scrollTopOf(page, PANEL)).toBe(bottom - 60);
  expect(await pageScrollY(page)).toBe(0);
});

test('scrolls the inner panel of an SPA without a click', async ({ context }) => {
  const page = await openPage(context, 'spa');

  await page.keyboard.press('j');

  await expect.poll(() => scrollTopOf(page, MAIN)).toBe(60);
  expect(await pageScrollY(page)).toBe(0);
});

test('scrolls instantly when reduced motion is preferred', async ({ context }) => {
  const page = await openPage(context, 'article');
  await recordScrolls(page);

  await page.keyboard.press('5');
  await page.keyboard.press('j');
  await expect.poll(() => pageScrollY(page)).toBe(300);

  // Scroll events fire on the next animation frame, after scrollY already changed
  await expect.poll(() => page.evaluate(() => window.scrollLog.length)).toBeGreaterThan(0);
  const log = await page.evaluate(() => window.scrollLog);
  expect(log.every((sample) => sample.y === 300)).toBe(true);
});

test('animates and arrives within 300 ms', async ({ context }) => {
  const page = await openPage(context, 'article', { reducedMotion: false });
  await recordScrolls(page);

  await page.keyboard.press('5');
  const start = await page.evaluate(() => performance.now());
  await page.keyboard.press('j');
  await expect.poll(() => pageScrollY(page)).toBe(300);

  const log = await page.evaluate(() => window.scrollLog);
  const between = new Set(log.map((sample) => sample.y).filter((y) => y > 0 && y < 300));
  expect(between.size).toBeGreaterThanOrEqual(2);
  const arrived = log.find((sample) => sample.y === 300)?.t ?? Number.POSITIVE_INFINITY;
  expect(arrived - start).toBeLessThanOrEqual(300);
});

test('keeps up with a held key and stops soon after release', async ({ context }) => {
  const page = await openPage(context, 'article', { reducedMotion: false });
  const session = await context.newCDPSession(page);

  await holdKey(session, 15);

  expect(Math.abs((await pageScrollY(page)) - 960)).toBeLessThanOrEqual(60);

  await sleep(100);
  const settled = await pageScrollY(page);
  await sleep(200);

  expect(await pageScrollY(page)).toBe(settled);
  expect(settled).toBe(960);
});
