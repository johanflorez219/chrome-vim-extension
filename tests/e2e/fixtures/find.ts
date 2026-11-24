import type { Page } from '@playwright/test';

// The highlight names the extension paints with (src/core/find/highlighter.ts)
export type HighlightName = 'vim-find' | 'vim-find-current';

/** How many ranges the named highlight holds, or 0 when it is not set. */
export function highlightCount(page: Page, name: HighlightName = 'vim-find'): Promise<number> {
  return page.evaluate((highlight) => CSS.highlights.get(highlight)?.size ?? 0, name);
}

/** The current match as `elementId:offset`, from the current-match highlight. */
export function currentMatch(page: Page): Promise<string | undefined> {
  return page.evaluate(() => {
    const highlight = CSS.highlights.get('vim-find-current');
    const range = highlight === undefined ? undefined : [...highlight][0];
    if (range === undefined) {
      return undefined;
    }
    const element = range.startContainer.parentElement;
    return `${element?.id ?? ''}:${String(range.startOffset)}`;
  });
}

export function scrollY(page: Page): Promise<number> {
  return page.evaluate(() => window.scrollY);
}

/**
 * Starts waiting in the page for `count` matches to be shown, and resolves with the
 * time it took. Call it before the key, so the time covers the key's whole effect.
 */
export function timeUntilCount(page: Page, count: number): Promise<number> {
  return page.evaluate(
    (target) =>
      new Promise<number>((resolve) => {
        const start = performance.now();
        const check = (): void => {
          if ((CSS.highlights.get('vim-find')?.size ?? 0) === target) {
            resolve(performance.now() - start);
          } else {
            requestAnimationFrame(check);
          }
        };
        check();
      }),
    count,
  );
}

/** Starts waiting for the page to scroll, and resolves with the time it took. */
export function timeUntilScroll(page: Page): Promise<number> {
  return page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        const start = performance.now();
        const initial = window.scrollY;
        const check = (): void => {
          if (window.scrollY !== initial) {
            resolve(performance.now() - start);
          } else {
            requestAnimationFrame(check);
          }
        };
        check();
      }),
  );
}
