import { describe, expect, it } from 'vitest';

import { HINT_ALPHABET } from '../../settings/defaults';

import { generateLabels, matchPrefix, type PrefixMatch } from './labels';

function lengthLimit(count: number, alphabet: string): number {
  let max = 1;
  while (alphabet.length ** max < count) {
    max += 1;
  }
  return max;
}

function prefixProblems(labels: readonly string[]): string[] {
  const sorted = [...labels].sort((a, b) => a.localeCompare(b));
  const problems: string[] = [];
  for (let index = 1; index < sorted.length; index += 1) {
    const current = sorted[index - 1] ?? '';
    const next = sorted[index] ?? '';
    if (next.startsWith(current)) {
      problems.push(`prefix: ${current} ${next}`);
    }
  }
  return problems;
}

function lengthProblems(labels: readonly string[], count: number, alphabet: string): string[] {
  const max = lengthLimit(count, alphabet);
  return labels.flatMap((label) => {
    if (label.length > max) {
      return [`too long: ${label}`];
    }
    return count <= alphabet.length && label.length !== 1 ? [`not one letter: ${label}`] : [];
  });
}

function letterProblems(labels: readonly string[], alphabet: string): string[] {
  return labels
    .filter((label) => Array.from(label).some((letter) => !alphabet.includes(letter)))
    .map((label) => `alphabet: ${label}`);
}

/** Returns one message per broken rule; an empty list means the labels are valid. */
function labelProblems(labels: readonly string[], count: number, alphabet: string): string[] {
  return [
    ...(labels.length === count ? [] : ['count']),
    ...(new Set(labels).size === labels.length ? [] : ['duplicate']),
    ...letterProblems(labels, alphabet),
    ...prefixProblems(labels),
    ...lengthProblems(labels, count, alphabet),
  ];
}

describe('HINT_ALPHABET', () => {
  it('uses the M3 hint alphabet', () => {
    expect(HINT_ALPHABET).toBe('sadfjklewcmpgh');
  });
});

describe('generateLabels', () => {
  it('gives no labels for no targets', () => {
    expect(generateLabels(0, HINT_ALPHABET)).toStrictEqual([]);
    expect(generateLabels(-1, HINT_ALPHABET)).toStrictEqual([]);
  });

  it('gives one letter per target up to the alphabet size', () => {
    expect(generateLabels(1, HINT_ALPHABET)).toStrictEqual(['s']);
    expect(generateLabels(14, HINT_ALPHABET)).toStrictEqual(Array.from(HINT_ALPHABET));
  });

  it('expands the first letter when one more label is needed', () => {
    expect(generateLabels(15, HINT_ALPHABET)).toStrictEqual([
      'a',
      'd',
      'f',
      'j',
      'k',
      'l',
      'e',
      'w',
      'c',
      'm',
      'p',
      'g',
      'h',
      'ss',
      'sa',
    ]);
  });

  it('uses only two letters for 196 targets', () => {
    const labels = generateLabels(196, HINT_ALPHABET);
    expect(labels.filter((label) => label.length !== 2)).toStrictEqual([]);
  });

  it('uses three letters only where needed for 197 targets', () => {
    const labels = generateLabels(197, HINT_ALPHABET);
    expect(labels.filter((label) => label.length === 3)).toStrictEqual(['sss', 'ssa']);
  });

  it('uses three letters for 2,744 targets', () => {
    const labels = generateLabels(2744, HINT_ALPHABET);
    expect(labels.filter((label) => label.length !== 3)).toStrictEqual([]);
  });

  it.each([1, 2, 13, 14, 15, 100, 196, 197, 300, 2744])(
    'keeps %i labels short, distinct and prefix-free',
    (count) => {
      const labels = generateLabels(count, HINT_ALPHABET);
      expect(labelProblems(labels, count, HINT_ALPHABET)).toStrictEqual([]);
    },
  );

  it('works with a small alphabet', () => {
    expect(generateLabels(3, 'ab')).toStrictEqual(['b', 'aa', 'ab']);
    expect(generateLabels(5, 'ab')).toStrictEqual(['ab', 'ba', 'bb', 'aaa', 'aab']);
    expect(labelProblems(generateLabels(3, 'ab'), 3, 'ab')).toStrictEqual([]);
    expect(labelProblems(generateLabels(5, 'ab'), 5, 'ab')).toStrictEqual([]);
  });

  it('rejects an alphabet with fewer than two letters', () => {
    expect(() => generateLabels(2, 'a')).toThrow(RangeError);
    expect(() => generateLabels(1, '')).toThrow(RangeError);
  });
});

describe('matchPrefix', () => {
  const labels = ['a', 'd', 'ss', 'sa'];

  it.each<readonly [string, PrefixMatch]>([
    ['', { kind: 'partial', visible: [0, 1, 2, 3] }],
    ['s', { kind: 'partial', visible: [2, 3] }],
    ['S', { kind: 'partial', visible: [2, 3] }],
    ['sa', { kind: 'exact', index: 3 }],
    ['SA', { kind: 'exact', index: 3 }],
    ['a', { kind: 'exact', index: 0 }],
    ['x', { kind: 'none' }],
    ['sx', { kind: 'none' }],
    ['ssa', { kind: 'none' }],
  ])('matches %j', (prefix, expected) => {
    expect(matchPrefix(labels, prefix)).toStrictEqual(expected);
  });
});
