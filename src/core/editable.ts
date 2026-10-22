/** Reaches open and closed shadow roots: chrome.dom.openOrClosedShadowRoot in the extension. */
export type ShadowRootOf = (host: Element) => ShadowRoot | null;

// `input.type` lower-cases the attribute and maps a missing or unknown type to 'text'
const TEXT_INPUT_TYPES: ReadonlySet<string> = new Set([
  'text',
  'search',
  'email',
  'url',
  'tel',
  'password',
  'number',
  'date',
  'datetime-local',
  'month',
  'week',
  'time',
]);

function isTextField(element: Element): boolean {
  if (element instanceof HTMLInputElement) {
    return TEXT_INPUT_TYPES.has(element.type);
  }
  return element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement;
}

// `isContentEditable` would be simpler, but jsdom doesn't implement it
function inContentEditable(element: Element): boolean {
  const host = element.closest('[contenteditable]');
  return host !== null && host.getAttribute('contenteditable')?.toLowerCase() !== 'false';
}

/** text inputs, textarea, select, contenteditable (not "false"), anything when designMode is "on". */
export function isEditable(element: Element | null): boolean {
  if (element === null) {
    return false;
  }
  if (element.ownerDocument.designMode === 'on') {
    return true;
  }
  if (element.matches(':disabled')) {
    return false;
  }
  return isTextField(element) || inContentEditable(element);
}

/** document.activeElement, followed down through open and closed shadow roots. */
export function deepActiveElement(doc: Document, shadowRootOf: ShadowRootOf): Element | null {
  let current = doc.activeElement;
  while (current !== null) {
    const inner = shadowRootOf(current)?.activeElement ?? null;
    if (inner === null) {
      return current;
    }
    current = inner;
  }
  return null;
}
