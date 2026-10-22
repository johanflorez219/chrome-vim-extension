export interface ReinjectDeps {
  /** chrome.tabs.query({}): only ids and discarded flags are read, so no "tabs" permission. */
  readonly queryTabs: () => Promise<
    readonly { readonly id?: number | undefined; readonly discarded?: boolean | undefined }[]
  >;
  /** chrome.scripting.executeScript({ target: { tabId }, files }) */
  readonly executeScript: (tabId: number, files: readonly string[]) => Promise<unknown>;
  /** The built content script, from the manifest. */
  readonly files: readonly string[];
}

/**
 * Starts the content script in every open tab, so tabs keep working after
 * an install or update without a refresh (R1.5). Tabs that can't take it
 * (chrome:// pages, the Web Store, discarded or closed tabs) are skipped.
 * Resolves when every tab was tried; never rejects (R1.7).
 */
export async function reinjectContentScript(deps: ReinjectDeps): Promise<void> {
  const tabs = await deps.queryTabs().catch(() => []);
  const tabIds = tabs.flatMap((tab) =>
    tab.id === undefined || tab.discarded === true ? [] : [tab.id],
  );
  await Promise.allSettled(tabIds.map((tabId) => deps.executeScript(tabId, deps.files)));
}
