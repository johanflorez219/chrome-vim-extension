/** What the typed letters mean for a set of labels (R3.1, R3.2). */
export type PrefixMatch =
  | { readonly kind: 'none' }
  | { readonly kind: 'partial'; readonly visible: readonly number[] }
  | { readonly kind: 'exact'; readonly index: number };

/**
 * Makes `count` labels from `alphabet`, shortest first. Labels are distinct and
 * prefix-free, because only unexpanded labels are returned (R2.2, R2.4). The
 * letters of `alphabet` must be distinct; it needs at least two letters, or the
 * expansion would never grow.
 */
export function generateLabels(count: number, alphabet: string): readonly string[] {
  if (count <= 0) {
    return [];
  }
  if (alphabet.length < 2) {
    throw new RangeError('The hint alphabet needs at least two letters');
  }
  // Array iteration sees the labels pushed while looping: each one is expanded in turn
  const queue: string[] = Array.from(alphabet);
  let expanded = 0;
  for (const head of queue) {
    if (queue.length - expanded >= count) {
      break;
    }
    expanded += 1;
    for (const letter of alphabet) {
      queue.push(head + letter);
    }
  }
  return queue.slice(expanded, expanded + count);
}

/**
 * Matches the typed letters against the labels, ignoring case (R2.5). An exact
 * label wins over labels it starts; an empty prefix matches every label.
 */
export function matchPrefix(labels: readonly string[], prefix: string): PrefixMatch {
  const typed = prefix.toLowerCase();
  const exact = labels.indexOf(typed);
  if (exact !== -1) {
    return { kind: 'exact', index: exact };
  }
  const visible = labels.flatMap((label, index) => (label.startsWith(typed) ? [index] : []));
  return visible.length === 0 ? { kind: 'none' } : { kind: 'partial', visible };
}
