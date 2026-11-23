import type { BackgroundCommandName } from '@/messaging/protocol';
import type {
  BackgroundCommandHandlers,
  HandlerContext,
  MessageHandlers,
} from '@/messaging/router';

export interface TabInfo {
  readonly id?: number | undefined;
  readonly index: number;
  readonly openerTabId?: number | undefined;
}

/**
 * chrome.tabs, narrowed to what M2 and M3 use. No "tabs" permission: only ids,
 * indexes and opener ids are read, and create needs none (NFR3.1, NFR3.2).
 */
export interface TabsApi {
  query(filter: { readonly windowId: number }): Promise<readonly TabInfo[]>;
  update(tabId: number, props: { readonly active: true }): Promise<unknown>;
  remove(tabId: number): Promise<void>;
  duplicate(tabId: number): Promise<TabInfo | undefined>;
  create(props: {
    readonly url: string;
    readonly active: false;
    /** Absent when the current tab is not in the window's list (R5.2). */
    readonly index?: number;
    readonly windowId: number;
    readonly openerTabId: number;
  }): Promise<unknown>;
}

export interface ClosedEntry {
  readonly tab?: { readonly sessionId?: string | undefined } | undefined;
}

/** chrome.sessions, narrowed. */
export interface SessionsApi {
  getRecentlyClosed(filter: { readonly maxResults: number }): Promise<readonly ClosedEntry[]>;
  restore(sessionId: string): Promise<unknown>;
}

type TabCommandName = Exclude<BackgroundCommandName, 'historyBack' | 'historyForward'>;

interface Deps {
  readonly tabs: TabsApi;
  readonly sessions: SessionsApi;
}

const RECENTLY_CLOSED_LIMIT = 25;

async function sortedTabs(tabs: TabsApi, ctx: HandlerContext): Promise<TabInfo[]> {
  const list = await tabs.query({ windowId: ctx.windowId });
  return [...list].sort((a, b) => a.index - b.index);
}

function positionOf(list: readonly TabInfo[], tabId: number): number {
  return list.findIndex((tab) => tab.id === tabId);
}

/** Activates `target` unless it is the current tab or has no id. */
async function activate(
  tabs: TabsApi,
  list: readonly TabInfo[],
  target: number,
  current: number,
): Promise<void> {
  const id = list[target]?.id;
  if (target !== current && id !== undefined) {
    await tabs.update(id, { active: true });
  }
}

/** Moves `delta` tabs from the current one, wrapping around (R2.1-R2.4). */
async function move(deps: Deps, ctx: HandlerContext, delta: number): Promise<void> {
  const list = await sortedTabs(deps.tabs, ctx);
  const current = positionOf(list, ctx.tabId);
  if (list.length < 2 || current === -1) {
    return;
  }
  const n = list.length;
  await activate(deps.tabs, list, (((current + delta) % n) + n) % n, current);
}

/** Activates the tab at `pick(list.length)`; used for the first and last tab. */
async function jump(
  deps: Deps,
  ctx: HandlerContext,
  pick: (length: number) => number,
): Promise<void> {
  const list = await sortedTabs(deps.tabs, ctx);
  const current = positionOf(list, ctx.tabId);
  if (list.length < 2 || current === -1) {
    return;
  }
  await activate(deps.tabs, list, pick(list.length), current);
}

async function goTo(deps: Deps, ctx: HandlerContext, count: number | undefined): Promise<void> {
  if (count === undefined) {
    await move(deps, ctx, 1);
    return;
  }
  await jump(deps, ctx, (length) => Math.min(count, length) - 1);
}

async function restoreClosed(sessions: SessionsApi, count: number | undefined): Promise<void> {
  const entries = await sessions.getRecentlyClosed({ maxResults: RECENTLY_CLOSED_LIMIT });
  const ids: string[] = [];
  for (const entry of entries) {
    const sessionId = entry.tab?.sessionId;
    if (sessionId !== undefined) {
      ids.push(sessionId);
    }
  }
  // Sequential on purpose: each restore must finish so the order is kept.
  for (const id of ids.slice(0, count ?? 1)) {
    await sessions.restore(id);
  }
}

async function duplicate(tabs: TabsApi, ctx: HandlerContext): Promise<void> {
  const copy = await tabs.duplicate(ctx.tabId);
  if (copy?.id !== undefined) {
    await tabs.update(copy.id, { active: true });
  }
}

/** Failures are not caught here: the router swallows them (R1.6). */
export function createTabHandlers(deps: Deps): Pick<BackgroundCommandHandlers, TabCommandName> {
  return {
    tabNext: (count, ctx) => move(deps, ctx, count ?? 1),
    tabPrevious: (count, ctx) => move(deps, ctx, -(count ?? 1)),
    tabGoTo: (count, ctx) => goTo(deps, ctx, count),
    tabFirst: (_count, ctx) => jump(deps, ctx, () => 0),
    tabLast: (_count, ctx) => jump(deps, ctx, (length) => length - 1),
    tabClose: (_count, ctx) => deps.tabs.remove(ctx.tabId),
    tabRestore: (count) => restoreClosed(deps.sessions, count),
    tabDuplicate: (_count, ctx) => duplicate(deps.tabs, ctx),
  };
}

/**
 * The index after the current tab and every tab opened from it that directly
 * follows it, so several opens keep their order (R5.2). Undefined when the current
 * tab is not in the list.
 */
function insertionIndex(list: readonly TabInfo[], tabId: number): number | undefined {
  const position = positionOf(list, tabId);
  const current = list[position];
  if (current === undefined) {
    return undefined;
  }
  let last = current.index;
  for (const tab of list.slice(position + 1)) {
    if (tab.openerTabId !== tabId) {
      break;
    }
    last = tab.index;
  }
  return last + 1;
}

/**
 * Opens the URL in a background tab after the current tab (R5.2). Failures reach the
 * router, which swallows them (R5.6). The message was checked by isMessage already.
 */
export function createOpenTabHandler(deps: { readonly tabs: TabsApi }): MessageHandlers['openTab'] {
  const open: MessageHandlers['openTab'] = async (message, ctx) => {
    const index = insertionIndex(await sortedTabs(deps.tabs, ctx), ctx.tabId);
    const props = {
      url: message.url,
      active: false,
      windowId: ctx.windowId,
      openerTabId: ctx.tabId,
    } as const;
    await deps.tabs.create(index === undefined ? props : { ...props, index });
  };
  return open;
}
