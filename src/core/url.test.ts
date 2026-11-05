import { describe, expect, it } from 'vitest';
import { parentUrl, rootUrl } from './url';

const NOT_HTTP: readonly string[] = [
  'file:///a/b',
  'about:blank',
  'blob:https://x.test/uuid',
  'data:text/plain,hi',
  'view-source:https://x.test/a',
  'chrome://extensions',
  'not a url',
  '',
];

describe('parentUrl', () => {
  const rows: readonly (readonly [string, number, string | undefined])[] = [
    ['https://x.test/a/b/c', 1, 'https://x.test/a/b'],
    ['https://x.test/a/b/c', 2, 'https://x.test/a'],
    ['https://x.test/a/b/c', 3, 'https://x.test/'],
    ['https://x.test/a/b/c', 9, 'https://x.test/'],
    ['https://x.test/a/b/', 1, 'https://x.test/a/'],
    ['https://x.test/a/b/', 2, 'https://x.test/'],
    ['https://x.test/a//b', 1, 'https://x.test/a/'],
    ['https://x.test/a/b?q=1#h', 1, 'https://x.test/a'],
    ['https://x.test/a', 1, 'https://x.test/'],
    ['https://x.test/?a=1', 1, 'https://x.test/'],
    ['https://x.test/#h', 1, 'https://x.test/'],
    ['https://x.test/', 1, undefined],
    ['https://x.test', 1, undefined],
    ['https://x.test/a/b', 0, undefined],
    ['http://x.test:8080/a/b', 1, 'http://x.test:8080/a'],
    ['https://u:p@x.test/a/b', 1, 'https://x.test/a'],
    ['https://x.test/a%20b/c', 1, 'https://x.test/a%20b'],
    ...NOT_HTTP.map((href): readonly [string, number, undefined] => [href, 1, undefined]),
  ];

  it.each(rows)('parentUrl(%j, %i) is %j', (href, levels, expected) => {
    expect(parentUrl(href, levels)).toBe(expected);
  });
});

describe('rootUrl', () => {
  const rows: readonly (readonly [string, string | undefined])[] = [
    ['https://x.test/a/b?q#h', 'https://x.test/'],
    ['https://x.test:8080/a', 'https://x.test:8080/'],
    ['https://u:p@x.test/a', 'https://x.test/'],
    ['https://x.test/?a=1', 'https://x.test/'],
    ['https://x.test/#h', 'https://x.test/'],
    ['https://x.test/', undefined],
    ['https://x.test', undefined],
    ...NOT_HTTP.map((href): readonly [string, undefined] => [href, undefined]),
  ];

  it.each(rows)('rootUrl(%j) is %j', (href, expected) => {
    expect(rootUrl(href)).toBe(expected);
  });
});
