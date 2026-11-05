import { defineContentScript } from 'wxt/utils/define-content-script';

import { createController } from '@/core/controller';
import { createMessageClient } from '@/messaging/client';

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_start',
  main(ctx) {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const controller = createController({
      window,
      timer: {
        set: (callback, ms) => window.setTimeout(callback, ms),
        clear: (id) => {
          window.clearTimeout(id);
        },
      },
      frames: {
        request: (callback) => window.requestAnimationFrame(callback),
        cancel: (id) => {
          window.cancelAnimationFrame(id);
        },
      },
      now: () => performance.now(),
      isValid: () => ctx.isValid,
      isTrusted: (event) => event.isTrusted,
      // chrome.* can throw once the extension is gone; reading ctx.isValid also fires onInvalidated
      shadowRootOf: (host) =>
        host instanceof HTMLElement && ctx.isValid
          ? chrome.dom.openOrClosedShadowRoot(host)
          : host.shadowRoot,
      prefersReducedMotion: () => reducedMotion.matches,
      page: {
        href: () => location.href,
        navigate: (url) => {
          location.assign(url);
        },
        reload: () => {
          location.reload();
        },
        writeClipboard: (text) => navigator.clipboard.writeText(text),
      },
      // Read inside the client's try/catch, so an invalidated extension can't throw in the page (R10.7)
      client: createMessageClient((message) => chrome.runtime.sendMessage(message)),
    });
    ctx.onInvalidated(() => {
      controller.stop();
    });
  },
});
