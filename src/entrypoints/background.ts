import { defineBackground } from 'wxt/utils/define-background';

import { reinjectContentScript } from '@/background/reinject';

export default defineBackground(() => {
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
