// Browser security headers for every page. Used by next.config.ts.
//
// Two Content-Security-Policy headers on purpose:
//  - ENFORCED: the parts that can't break the site (no framing, no <base> hijack, no plugins,
//    forms only post to us or Stripe Checkout). This one actually protects.
//  - REPORT-ONLY: the full allowlist of where scripts, images, video and requests may come from.
//    It blocks nothing; it only reports. Once it's quiet in production it can be promoted.
// HSTS is left to Vercel, which already sends it on braunboard.com.

type Env = { supabaseUrl?: string; dev?: boolean; preview?: boolean };

function supabaseOrigins(url?: string): { https: string[]; wss: string[] } {
  try {
    const u = new URL(url ?? "");
    return { https: [u.origin], wss: [`wss://${u.host}`] };
  } catch {
    return { https: [], wss: [] };
  }
}

const join = (d: Record<string, string[]>) =>
  Object.entries(d)
    .map(([k, v]) => [k, ...v].join(" "))
    .join("; ");

export function enforcedCsp(): string {
  return join({
    "frame-ancestors": ["'none'"],
    "base-uri": ["'self'"],
    "object-src": ["'none'"],
    // The renewal page posts a plain form whose answer is a redirect to Stripe Checkout.
    "form-action": ["'self'", "https://checkout.stripe.com"],
  });
}

export function reportOnlyCsp({ supabaseUrl, dev, preview }: Env = {}): string {
  const sb = supabaseOrigins(supabaseUrl);
  // Vercel's preview toolbar (preview deployments only) and the Analytics debug script (local dev only).
  const vercelLive = preview ? ["https://vercel.live"] : [];
  const devScripts = dev ? ["'unsafe-eval'", "https://va.vercel-scripts.com"] : [];
  return join({
    "default-src": ["'self'"],
    // Next.js streams pages with inline <script> tags. Without per-request nonces (which would
    // turn every cached page into a server render) inline has to be allowed. Outside scripts are not.
    "script-src": ["'self'", "'unsafe-inline'", ...devScripts, ...vercelLive],
    "style-src": ["'self'", "'unsafe-inline'", ...vercelLive],
    "img-src": [
      "'self'",
      "data:",
      "blob:",
      "https://img.logo.dev",
      "https://www.google.com",
      "https://*.gstatic.com",
      ...sb.https,
      ...vercelLive,
    ],
    "media-src": ["'self'", "blob:", ...sb.https],
    "font-src": ["'self'", "data:", ...vercelLive],
    "connect-src": ["'self'", ...sb.https, ...sb.wss, ...(dev ? ["ws:", "https://va.vercel-scripts.com"] : []), ...vercelLive],
    "frame-src": ["'self'", ...vercelLive],
    "worker-src": ["'self'", "blob:"],
    "manifest-src": ["'self'"],
    "frame-ancestors": ["'none'"],
    "base-uri": ["'self'"],
    "object-src": ["'none'"],
    "form-action": ["'self'", "https://checkout.stripe.com"],
    "report-uri": ["/api/csp-report"],
  });
}

// Only what the site uses: clipboard (copy buttons) and fullscreen (video player), both for us only.
// Payment stays off because Stripe Checkout runs on Stripe's own page, not inside ours.
export const PERMISSIONS_POLICY = [
  "camera=()",
  "microphone=()",
  "geolocation=()",
  "payment=()",
  "usb=()",
  "serial=()",
  "bluetooth=()",
  "hid=()",
  "midi=()",
  "magnetometer=()",
  "gyroscope=()",
  "accelerometer=()",
  "display-capture=()",
  "browsing-topics=()",
  "fullscreen=(self)",
  "clipboard-write=(self)",
].join(", ");

export function securityHeaders(env: Env = {}): { key: string; value: string }[] {
  return [
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Content-Security-Policy", value: enforcedCsp() },
    { key: "Content-Security-Policy-Report-Only", value: reportOnlyCsp(env) },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Permissions-Policy", value: PERMISSIONS_POLICY },
  ];
}
