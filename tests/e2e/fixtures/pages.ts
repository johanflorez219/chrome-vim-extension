import type { BrowserContext, Page } from '@playwright/test';

const TALL = '<div style="width: 3000px; height: 5000px">Article</div>';

const RECORDER =
  "<script>window.seen = []; for (const type of ['keydown', 'keyup']) { window.addEventListener(type, (event) => { window.seen.push(type + ':' + event.key + ':' + event.defaultPrevented); }, true); }</script>";

const FILLER = '<div id="filler" style="height: 5000px"></div>';

export const OPENED_URL = 'https://example.test/opened';
export const HINTS_URL = 'https://example.test/hints';

// A page rule that tries to hide the hint host and make it catch clicks; the host's
// inline !important styles must win (R2.6)
const HINTS_HEAD = `${RECORDER}<style>vim-hints { display: none !important; position: static !important; pointer-events: auto !important; }</style>`;

const HINTS_BODY = [
  `<a id="first" href="${OPENED_URL}">First</a>`,
  '<a id="hidden" href="https://example.test/hidden" style="display: none">Hidden</a>',
  '<button id="button">Button</button>',
  '<input id="text">',
  '<textarea id="area"></textarea>',
  '<select id="pick"><option>One</option><option>Two</option></select>',
  '<label id="check-label"><input id="check" type="checkbox"> Check</label>',
  `<a id="blank" href="${OPENED_URL}" target="_blank">Blank</a>`,
  '<div id="shadow-host"></div>',
  '<a id="covered" href="https://example.test/covered" style="position: absolute; top: 300px; left: 0">Covered</a>',
  '<div id="cover" style="position: absolute; top: 290px; left: 0; width: 400px; height: 60px; background: #fff"></div>',
  '<iframe id="frame" srcdoc="<a href=\'https://example.test/framed\'>Framed</a>" style="position: absolute; top: 400px; left: 0"></iframe>',
  '<a id="last" href="#last">Last</a>',
  '<a id="offscreen" href="https://example.test/offscreen" style="position: absolute; top: 3000px; left: 0">Off</a>',
  FILLER,
  // Records the clicks and presses the page receives, and closes a shadow root over a button
  `<script>
    window.events = [];
    for (const type of ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click']) {
      document.addEventListener(type, (event) => {
        const target = event.composedPath()[0];
        window.events.push(type + ':' + (target instanceof Element ? target.id : ''));
      }, true);
    }
    const root = document.getElementById('shadow-host').attachShadow({ mode: 'closed' });
    const shadowButton = document.createElement('button');
    shadowButton.id = 'shadow-button';
    shadowButton.textContent = 'Shadow';
    root.appendChild(shadowButton);
  </script>`,
].join('');

// 100 visible links and 900 off-screen buttons: 1,000 clickables in about 10,000 elements
const MANY_SCRIPT = `<script>
  const grid = document.getElementById('grid');
  for (let i = 0; i < 100; i += 1) {
    const link = document.createElement('a');
    link.id = 'link-' + i;
    link.href = '#link-' + i;
    link.textContent = 'L' + i;
    link.style.cssText = 'display: inline-block; width: 40px; height: 20px';
    grid.appendChild(link);
  }
  const rest = document.getElementById('rest');
  for (let i = 0; i < 9000; i += 1) {
    const box = document.createElement('div');
    if (i % 10 === 0) {
      const button = document.createElement('button');
      button.textContent = 'Off';
      box.appendChild(button);
    }
    rest.appendChild(box);
  }
</script>`;

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
  hints: page(HINTS_BODY, HINTS_HEAD),
  empty: page('<p>No links here</p>', RECORDER),
  many: page(
    '<div id="grid"></div><div style="height: 5000px"></div><div id="rest"></div>' + MANY_SCRIPT,
  ),
  spa: page(
    '<div id="main"><div id="main-content">App</div></div>',
    '<style>html, body { height: 100%; margin: 0 } #main { height: 100vh; overflow-y: auto } #main-content { height: 5000px }</style>',
  ),
} as const;

declare global {
  interface Window {
    seen: string[];
    events: string[];
    closedInput: HTMLInputElement;
    marker?: number;
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

/** Opens the article page at any path on example.test as the first history entry, with reduced motion. */
export async function openAt(context: BrowserContext, path: string): Promise<Page> {
  const page = await context.newPage();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  // A regex, so every path and query matches; the hash is never sent
  await page.route(/^https:\/\/example\.test\//, (route) =>
    route.fulfill({ contentType: 'text/html', body: PAGES.article }),
  );
  // location.replace swaps the initial about:blank entry, so the page under test
  // is the first history entry and H has nothing behind it
  const url = `https://example.test${path}`;
  await page.evaluate((target) => {
    location.replace(target);
  }, url);
  await page.waitForURL(url);
  return page;
}
