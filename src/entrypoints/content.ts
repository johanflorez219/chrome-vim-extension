import { defineContentScript } from 'wxt/utils/define-content-script';

import { listenForKeys } from '@/core/key-listener';

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_start',
  main(ctx) {
    const stop = listenForKeys(window, (key) => {
      // eslint-disable-next-line no-console -- M0 "hello world"; replaced by the mode machine in M1
      console.debug(`[vim] ${key}`);
    });
    ctx.onInvalidated(stop);
  },
});
