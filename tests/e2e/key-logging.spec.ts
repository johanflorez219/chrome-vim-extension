import { expect, test } from './fixtures';

const PAGE_URL = 'https://example.test/';

test('logs key presses in Vim notation', async ({ context }) => {
  const page = await context.newPage();
  await page.route(PAGE_URL, (route) =>
    route.fulfill({ contentType: 'text/html', body: '<p>A page</p>' }),
  );
  const logs: string[] = [];
  page.on('console', (message) => {
    if (message.text().startsWith('[vim]')) {
      logs.push(message.text());
    }
  });

  await page.goto(PAGE_URL);
  await page.keyboard.press('j');
  await page.keyboard.press('Control+d');
  await page.keyboard.press('Shift+G');

  await expect.poll(() => logs).toEqual(['[vim] j', '[vim] <C-d>', '[vim] G']);
});
