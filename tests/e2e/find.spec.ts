import { expect, test } from './fixtures';
import { press } from './fixtures/hints';
import {
  currentMatch,
  highlightCount,
  scrollY,
  timeUntilCount,
  timeUntilScroll,
} from './fixtures/find';
import { openPage } from './fixtures/pages';

// The find page has five visible matches for "foo" in this order: p1:0, p2:0, p2:8, p3:5, p4:0.
// The bar's text is in a closed shadow root, so these tests read the highlights and the
// scroll position. The bar text and the 1/N count are covered by the unit tests.
const VISIBLE_FOO = 5;
const MS_LIMIT = 100;

test('/ foo Enter highlights every match and marks the first (R3.1, R3.3, R3.4)', async ({
  context,
}) => {
  const page = await openPage(context, 'find');
  await press(page, ['/', 'f', 'o', 'o', 'Enter']);
  expect(await highlightCount(page)).toBe(VISIBLE_FOO);
  expect(await currentMatch(page)).toBe('p1:0');
});

test('n moves to the next match, wraps from the last to the first, and N goes back (R4.1-R4.3)', async ({
  context,
}) => {
  const page = await openPage(context, 'find');
  await press(page, ['/', 'f', 'o', 'o', 'Enter']);
  await press(page, ['n']);
  expect(await currentMatch(page)).toBe('p2:0');
  await press(page, ['n', 'n', 'n']);
  expect(await currentMatch(page)).toBe('p4:0');
  await press(page, ['n']);
  expect(await currentMatch(page)).toBe('p1:0');
  await press(page, ['N']);
  expect(await currentMatch(page)).toBe('p4:0');
});

test('a count moves that many matches, as 3n does (R4.5)', async ({ context }) => {
  const page = await openPage(context, 'find');
  await press(page, ['/', 'f', 'o', 'o', 'Enter']);
  await press(page, ['3', 'n']);
  expect(await currentMatch(page)).toBe('p3:5');
});

test('smart case: a capital letter makes the search case-sensitive (R3.5)', async ({ context }) => {
  const page = await openPage(context, 'find');
  await press(page, ['/', 'F', 'o', 'o', 'Enter']);
  // Only the capital "Foo" in p2 matches; the lower-case "foo" elsewhere does not
  expect(await highlightCount(page)).toBe(1);
  expect(await currentMatch(page)).toBe('p2:0');
});

test('a query with no match highlights nothing, and n does not move (R3.6, R4.4)', async ({
  context,
}) => {
  const page = await openPage(context, 'find');
  await press(page, ['/', 'z', 'z', 'z', 'Enter']);
  expect(await highlightCount(page)).toBe(0);
  await press(page, ['n']);
  expect(await scrollY(page)).toBe(0);
});

test('Esc clears the highlights and forgets the query (R3.8)', async ({ context }) => {
  const page = await openPage(context, 'find');
  await press(page, ['/', 'f', 'o', 'o']);
  expect(await highlightCount(page)).toBe(VISIBLE_FOO);
  await press(page, ['Escape']);
  expect(await highlightCount(page)).toBe(0);
  expect(await page.evaluate(() => CSS.highlights.size)).toBe(0);
});

test('hidden text and textarea text are not matched (R3.7)', async ({ context }) => {
  // The hidden span and the textarea each also contain "foo"; neither may add a match
  const page = await openPage(context, 'find');
  await press(page, ['/', 'f', 'o', 'o', 'Enter']);
  expect(await highlightCount(page)).toBe(VISIBLE_FOO);
});

test('a click on a button keeps the bar open, and the next key is typed into the query (R6.2)', async ({
  context,
}) => {
  const page = await openPage(context, 'find');
  await press(page, ['/', 'f']);
  await page.click('#button');
  await press(page, ['o', 'o']);
  expect(await highlightCount(page)).toBe(VISIBLE_FOO);
});

test('/ typed in a text field is text and opens no bar (R6.1)', async ({ context }) => {
  const page = await openPage(context, 'find');
  await page.click('#text');
  await press(page, ['/']);
  await expect(page.locator('#text')).toHaveValue('/');
  expect(await highlightCount(page)).toBe(0);
});

test('on a 10,000 text-node page, highlights update and n scrolls within 100 ms (NFR1.1, NFR1.2)', async ({
  context,
}) => {
  const page = await openPage(context, 'large');
  await press(page, ['/', 'f', 'o']);
  await expect.poll(() => highlightCount(page)).toBe(10000);

  // "foo" matches the odd rows only, so the last keystroke halves the highlights
  const narrowed = timeUntilCount(page, 5000);
  await press(page, ['o']);
  expect(await narrowed).toBeLessThan(MS_LIMIT);

  await press(page, ['Enter', '2', '0', '0', '0']);
  const scrolled = timeUntilScroll(page);
  await press(page, ['n']);
  expect(await scrolled).toBeLessThan(MS_LIMIT);
});

test('without CSS.highlights, the bar still moves through matches and scrolls (R5.3)', async ({
  context,
}) => {
  await context.addInitScript(() => {
    Reflect.deleteProperty(CSS, 'highlights');
  });
  const page = await openPage(context, 'find');
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await press(page, ['/', 'f', 'o', 'o', 'Enter']);
  await press(page, ['n', 'n', 'n', 'n']);
  expect(await scrollY(page)).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});
