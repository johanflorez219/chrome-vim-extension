import { defineBackground } from 'wxt/utils/define-background';

import { createBackgroundRouter } from '@/background/handlers';
import { createHistoryApi } from '@/background/history-api';
import { reinjectContentScript } from '@/background/reinject';

export default defineBackground(() => {
  // Built and registered synchronously at the top level so the browser can wake
  // a stopped worker for a message (R1.7).
  const router = createBackgroundRouter({
    tabs: {
      query: (filter) => chrome.tabs.query(filter),
      update: (id, props) => chrome.tabs.update(id, props),
      remove: (id) => chrome.tabs.remove(id),
      duplicate: (id) => chrome.tabs.duplicate(id),
    },
    sessions: {
      getRecentlyClosed: (filter) => chrome.sessions.getRecentlyClosed(filter),
      restore: (id) => chrome.sessions.restore(id),
    },
    history: createHistoryApi({
      goBack: (id) => chrome.tabs.goBack(id),
      goForward: (id) => chrome.tabs.goForward(id),
      onCommitted: chrome.webNavigation.onCommitted,
    }),
    extensionId: chrome.runtime.id,
  });
  // One-way protocol: returns nothing, so no response channel stays open (R1.7).
  chrome.runtime.onMessage.addListener((message: unknown, sender) => {
    void router.handle(message, sender);
  });

  // chrome.* rather than WXT's browser.*: WXT types executeScript's files as
  // ScriptPublicPath[], which the manifest's string[] doesn't satisfy
  chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install' || details.reason === 'update') {
      void reinjectContentScript({
        queryTabs: () => chrome.tabs.query({}),
        executeScript: (tabId, files) =>
          chrome.scripting.executeScript({ target: { tabId }, files: [...files] }),
        files: (chrome.runtime.getManifest().content_scripts ?? []).flatMap(
          (script) => script.js ?? [],
        ),
      });
    }
  });
});
