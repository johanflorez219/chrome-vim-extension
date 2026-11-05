import { parentUrl, rootUrl } from '../url';

import { onceOnly, type Command, type CommandContext, type CommandName } from './registry';

export interface PageActions {
  readonly href: () => string;
  /** location.assign */
  readonly navigate: (url: string) => void;
  /** location.reload */
  readonly reload: () => void;
  /** navigator.clipboard.writeText; may reject */
  readonly writeClipboard: (text: string) => Promise<void>;
}

function pageCommand(
  name: CommandName,
  description: string,
  acceptsCount: boolean,
  run: (ctx: CommandContext) => void,
): Command {
  return { name, description, acceptsCount, context: 'page', run: onceOnly(run) };
}

async function copy(actions: PageActions): Promise<void> {
  try {
    await actions.writeClipboard(actions.href());
  } catch {
    // Clipboard refused or missing: the key is still consumed (R8.2); not logged (NFR4.1).
  }
}

function goTo(actions: PageActions, target: string | undefined): void {
  if (target !== undefined) {
    actions.navigate(target);
  }
}

/** The page commands: reload, copy the URL and walk up the URL path (R7, R8, R9). */
export function createNavigationCommands(actions: PageActions): readonly Command[] {
  return [
    pageCommand('reload', 'Reload the page', false, () => {
      actions.reload();
    }),
    pageCommand('copyUrl', 'Copy the page URL', false, () => {
      void copy(actions);
    }),
    pageCommand('urlUp', 'Go up in the URL (count: that many levels)', true, (ctx) => {
      goTo(actions, parentUrl(actions.href(), ctx.count ?? 1));
    }),
    pageCommand('urlRoot', 'Go to the root of the site', false, () => {
      goTo(actions, rootUrl(actions.href()));
    }),
  ];
}
