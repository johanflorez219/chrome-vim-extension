import { TEXT_INPUT_TYPES } from '../editable';

const HTML_NS = 'http://www.w3.org/1999/xhtml';
const SVG_NS = 'http://www.w3.org/2000/svg';

// The design's a[href], label, [tabindex] and [contenteditable] entries need code,
// so they are checked by isLink, the label rule, hasTabStop and isEditorHost.
const CLICKABLE_SELECTOR =
  'button, input, textarea, select, summary, [role=button], [role=link], [role=checkbox], [role=radio], [role=tab], [role=menuitem], [role=option], [role=switch], [onclick]';

const COPYABLE_PROTOCOLS: ReadonlySet<string> = new Set(['http:', 'https:', 'mailto:', 'file:']);
const OPENABLE_PROTOCOLS: ReadonlySet<string> = new Set(['http:', 'https:']);

function isLink(element: Element): boolean {
  return (
    element.localName === 'a' &&
    (element.namespaceURI === HTML_NS || element.namespaceURI === SVG_NS) &&
    element.hasAttribute('href')
  );
}

function isEditableValue(value: string | null): boolean {
  return value !== null && value.toLowerCase() !== 'false';
}

// isContentEditable is not in jsdom, so read the attribute as editable.ts does.
// An element is an editor host when its nearest editable ancestor is missing or
// not editable, so an editable island inside a non-editable block is its own host.
function isEditorHost(element: Element): boolean {
  if (!isEditableValue(element.getAttribute('contenteditable'))) {
    return false;
  }
  const outer = element.parentElement?.closest('[contenteditable]') ?? null;
  return outer === null || !isEditableValue(outer.getAttribute('contenteditable'));
}

function hasTabStop(element: Element): boolean {
  const value = element.getAttribute('tabindex');
  return value !== null && Number.parseInt(value, 10) >= 0;
}

/**
 * `:disabled`, `aria-disabled="true"`, or inside `[inert]` (R1.2, R4.6). The one
 * disabled check, shared by hint targets and hint actions. `closest` does not
 * cross shadow roots, which is accepted for M3.
 */
export function isDisabled(element: Element): boolean {
  return (
    element.matches(':disabled') ||
    element.getAttribute('aria-disabled') === 'true' ||
    element.closest('[inert]') !== null
  );
}

/**
 * Whether the user could click or focus this element on purpose (the glossary's
 * clickable list). A label is clickable through its control when the control is
 * not disabled (R1.4); otherwise the general rules decide.
 */
export function isClickable(element: Element): boolean {
  if (element.localName === 'iframe') {
    return false;
  }
  if (isDisabled(element)) {
    return false;
  }
  if (element instanceof HTMLInputElement && element.type === 'hidden') {
    return false;
  }
  if (element instanceof HTMLLabelElement && element.control !== null) {
    return !isDisabled(element.control);
  }
  return (
    isLink(element) ||
    element.matches(CLICKABLE_SELECTOR) ||
    hasTabStop(element) ||
    isEditorHost(element)
  );
}

/**
 * A text-like input, a textarea, or a contenteditable host. Links and paragraphs
 * inside an editor are not text inputs (R4.3, R6.1).
 */
export function isTextInput(element: Element): boolean {
  if (isDisabled(element)) {
    return false;
  }
  if (element instanceof HTMLInputElement) {
    return TEXT_INPUT_TYPES.has(element.type);
  }
  if (element instanceof HTMLTextAreaElement) {
    return true;
  }
  return isEditorHost(element);
}

/**
 * The absolute URL of an `a` link, resolved against the page's base URL. Returns
 * undefined for other elements and for an href that does not parse (R5.3).
 */
export function linkUrl(element: Element): URL | undefined {
  if (!isLink(element)) {
    return undefined;
  }
  const href = element.getAttribute('href') ?? '';
  try {
    return new URL(href, element.baseURI);
  } catch {
    // A page's bad href is not an error: there is just no URL to copy or open
    return undefined;
  }
}

/** Schemes `yf` may copy (R5.3). */
export function isCopyableUrl(url: URL): boolean {
  return COPYABLE_PROTOCOLS.has(url.protocol);
}

/** Schemes `F` may open in a new tab (R5.2, NFR3.2). */
export function isOpenableUrl(url: URL): boolean {
  return OPENABLE_PROTOCOLS.has(url.protocol);
}
