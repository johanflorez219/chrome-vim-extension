import type { BrowserContext, Page } from '@playwright/test';

const TALL = '<div style="width: 3000px; height: 5000px">Article</div>';

const RECORDER =
  "<script>window.seen = []; for (const type of ['keydown', 'keyup']) { window.addEventListener(type, (event) => { window.seen.push(type + ':' + event.key + ':' + event.defaultPrevented); }, true); }</script>";

const FILLER = '<div id="filler" style="height: 5000px"></div>';

const SHADOW_SCRIPT =
  "<script>const open = document.getElementById('open-host').attachShadow({ mode: 'open' }); const input = document.createElement('input'); input.id = 'open-input'; open.appendChild(input); const closed = document.getElementById('closed-host').attachShadow({ mode: 'closed' }); window.closedInput = closed.appendChild(document.createElement('input'));</script>";

function page(body: string, head = ''): string {
  return `<!doctype html><html><head>${head}</head><body style="margin: 0">${body}</body></html>`;
}

// Each page is a full document in standard mode, so document.scrollingElement is <html>
const PAGES = {
  article: page(TALL),
  recorder: page(TALL, RECORDER),
  form: page(
    `<input id="text"><textarea id="area"></textarea><input id="check" type="checkbox"><div id="editor" contenteditable style="min-height: 2em"></div>${FILLER}`,
  ),
  shadow: page(`<div id="open-host"></div><div id="closed-host"></div>${FILLER}${SHADOW_SCRIPT}`),
  design: page(`<p id="para">Type here</p>${FILLER}<script>document.designMode = 'on';</script>`),
  autofocus: page(`<input id="auto" autofocus>${FILLER}`),
  panel: page(
    '<div id="panel"><div id="panel-content">Panel</div></div><div id="outside">Outside</div><div id="rest"></div>',
    '<style>#panel { height: 300px; width: 400px; overflow-y: auto } #panel-content { height: 3000px } #outside { height: 100px; width: 400px } #rest { height: 5000px }</style>',
  ),
  spa: page(
    '<div id="main"><div id="main-content">App</div></div>',
    '<style>html, body { height: 100%; margin: 0 } #main { height: 100vh; overflow-y: auto } #main-content { height: 5000px }</style>',
  ),
} as const;

declare global {
  interface Window {
    seen: string[];
    closedInput: HTMLInputElement;
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
