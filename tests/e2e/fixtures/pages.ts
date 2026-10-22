import type { BrowserContext, Page } from '@playwright/test';

const TALL = '<div style="width: 3000px; height: 5000px">Article</div>';

const RECORDER =
  "<script>window.seen = []; for (const type of ['keydown', 'keyup']) { window.addEventListener(type, (event) => { window.seen.push(type + ':' + event.key + ':' + event.defaultPrevented); }, true); }</script>";

// Each page is a full document in standard mode, so document.scrollingElement is <html>
const PAGES = {
  article: `<!doctype html><html><head></head><body style="margin: 0">${TALL}</body></html>`,
  recorder: `<!doctype html><html><head>${RECORDER}</head><body style="margin: 0">${TALL}</body></html>`,
} as const;

declare global {
  interface Window {
    seen: string[];
  }
}

/** Opens one of the fixture pages, with reduced motion unless asked otherwise. */
export async function openPage(
  context: BrowserContext,
  name: keyof typeof PAGES,
  { reducedMotion = true }: { readonly reducedMotion?: boolean } = {},
): Promise<Page> {
  const page = await context.newPage();
  await page.emulateMedia({ reducedMotion: reducedMotion ? 'reduce' : 'no-preference' });
  const url = `https://example.test/${name}`;
  await page.route(url, (route) => route.fulfill({ contentType: 'text/html', body: PAGES[name] }));
  await page.goto(url);
  return page;
}

/** The keys the recorder page saw, as `type:key:defaultPrevented`. */
export function readSeen(page: Page): Promise<string[]> {
  return page.evaluate(() => window.seen);
}
