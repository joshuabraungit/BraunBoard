// Polite fetch with timeout + retry. All ATS endpoints used here are public.

const UA = "BraunBoardBot/0.1 (+https://joshbraun.com)";

export class HttpError extends Error {
  constructor(
    public status: number,
    public url: string,
  ) {
    super(`HTTP ${status} for ${url}`);
  }
}

export async function getJson<T>(url: string, opts: { retries?: number; timeoutMs?: number } = {}): Promise<T> {
  return requestJson<T>(url, { method: "GET" }, opts);
}

export async function postJson<T>(url: string, body: unknown, opts: { retries?: number; timeoutMs?: number } = {}): Promise<T> {
  return requestJson<T>(url, { method: "POST", body: JSON.stringify(body) }, opts);
}

async function requestJson<T>(
  url: string,
  init: { method: "GET" | "POST"; body?: string },
  { retries = 2, timeoutMs = 20_000 } = {},
): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        method: init.method,
        body: init.body,
        headers: {
          "User-Agent": UA,
          Accept: "application/json",
          "Accept-Language": "en-US",
          ...(init.body ? { "Content-Type": "application/json" } : {}),
        },
        signal: ctrl.signal,
      });
      // Board doesn't exist (or the request is malformed): retrying won't help.
      if (res.status === 404 || res.status === 400 || res.status === 422) throw new HttpError(res.status, url);
      if (!res.ok) throw new HttpError(res.status, url);
      return (await res.json()) as T;
    } catch (err) {
      lastErr = err;
      if (err instanceof HttpError && [400, 404, 422].includes(err.status)) throw err;
      await new Promise((r) => setTimeout(r, 500 * 2 ** attempt));
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastErr;
}
