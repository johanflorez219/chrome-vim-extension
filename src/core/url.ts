function parseHttp(href: string): URL | undefined {
  try {
    const url = new URL(href);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url : undefined;
  } catch {
    // An invalid URL is not an error here: there is just nothing to go up to.
    return undefined;
  }
}

/**
 * The root of the site: `origin + '/'`. Returns undefined when the URL is not
 * http(s) (R9.5) or the result equals the input (R9.4). Drops user, password,
 * path, query and hash (R9.3).
 */
export function rootUrl(href: string): string | undefined {
  const url = parseHttp(href);
  if (url === undefined) {
    return undefined;
  }
  const root = `${url.protocol}//${url.host}/`;
  return root === url.href ? undefined : root;
}

/**
 * The URL with `levels` path levels removed. Returns undefined when the URL is
 * not http(s) (R9.5) or the result equals the input (R9.4). Drops query and
 * hash (R9.1), stops at the root (R9.2) and keeps a trailing slash, which is
 * not a level (R9.7).
 */
export function parentUrl(href: string, levels: number): string | undefined {
  const url = parseHttp(href);
  if (url === undefined) {
    return undefined;
  }
  const segments = url.pathname.slice(1).split('/');
  if (segments[segments.length - 1] === '') {
    segments.pop();
  }
  const trailing = url.pathname.length > 1 && url.pathname.endsWith('/');
  const remaining = segments.slice(0, Math.max(0, segments.length - levels));
  const suffix = trailing ? '/' : '';
  const path = remaining.length === 0 ? '/' : `/${remaining.join('/')}${suffix}`;
  const target = `${url.protocol}//${url.host}${path}`;
  return target === url.href ? undefined : target;
}
