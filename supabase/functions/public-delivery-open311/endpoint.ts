const PRIVATE_HOST = /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|0\.|\[?::1\]?$|\[?f[cd])/i;

/**
 * The service-request endpoint as a URL, or null when it may not be called: only https on public hosts, unless plain
 * http and private hosts are allowed for local testing.
 */
export function allowedEndpoint(raw: string, allowPrivateHttp: boolean): URL | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (allowPrivateHttp) return url.protocol === 'https:' || url.protocol === 'http:' ? url : null;
  if (url.protocol !== 'https:' || PRIVATE_HOST.test(url.hostname)) return null;
  return url;
}
