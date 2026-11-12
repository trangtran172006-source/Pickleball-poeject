/**
 * Server-side fetch that honours an outbound HTTP proxy when one is set
 * (HTTPS_PROXY), as in this sandboxed dev/test environment. In production
 * (e.g. Vercel) no proxy env is present, so this is the plain global fetch.
 */
import { ProxyAgent, fetch as undiciFetch } from "undici";

const proxyUrl = process.env.HTTPS_PROXY || process.env.https_proxy || process.env.HTTP_PROXY || process.env.http_proxy;
let dispatcher: ProxyAgent | undefined;
if (proxyUrl) {
  try { dispatcher = new ProxyAgent(proxyUrl); } catch { dispatcher = undefined; }
}

export const serverFetch: typeof fetch = dispatcher
  ? ((input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) =>
      // @ts-expect-error undici fetch is a compatible superset of the global fetch
      undiciFetch(input, { ...(init ?? {}), dispatcher })) as unknown as typeof fetch
  : fetch;
