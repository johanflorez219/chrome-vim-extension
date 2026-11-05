import type { BackgroundCommandName } from '@/messaging/protocol';
import type { BackgroundCommandHandlers, HandlerContext } from '@/messaging/router';

export interface TabInfo {
  readonly id?: number | undefined;
  readonly index: number;
}

/** chrome.tabs, narrowed to what M2 uses. No "tabs" permission: only ids and indexes are read (NFR3.2). */
export interface TabsApi {
  query(filter: { readonly windowId: number }): Promise<readonly TabInfo[]>;
  update(tabId: number, props: { readonly active: true }): Promise<unknown>;
  remove(tabId: number): Promise<void>;
  duplicate(tabId: number): Promise<TabInfo | undefined>;
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
