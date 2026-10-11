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

export async function getJson<T>(url: string, { retries = 2, timeoutMs = 20_000 } = {}): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" }, signal: ctrl.signal });
      if (res.status === 404) throw new HttpError(404, url); // board doesn't exist, don't retry
      if (!res.ok) throw new HttpError(res.status, url);
      return (await res.json()) as T;
    } catch (err) {
      lastErr = err;
      if (err instanceof HttpError && err.status === 404) throw err;
      await new Promise((r) => setTimeout(r, 500 * 2 ** attempt));
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastErr;
}
