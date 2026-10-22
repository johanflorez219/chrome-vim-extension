import { defineContentScript } from 'wxt/utils/define-content-script';

import { listenForKeys } from '@/core/key-listener';

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_start',
  main(ctx) {
    const stop = listenForKeys(
      window,
      (press) => {
        // eslint-disable-next-line no-console -- M0 "hello world"; replaced by the mode machine in M1
        console.debug(`[vim] ${press.key}`);
        return 'passed';
      },
      (event) => event.isTrusted,
    );
    ctx.onInvalidated(stop);
  },
});
