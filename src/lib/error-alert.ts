// Error alerts: when something breaks on Braun Board, it is logged to error_events (and, only if
// ERROR_ALERT_EMAIL=on, emailed to Josh) with what broke, where,
// and the stack trace, so he can forward it to Claude and say "fix this". Visitors only ever see
// the plain error page (src/app/error.tsx), never the details.
//
// Repeats are bundled: the same error in the same place sends at most one email per hour
// (Resend's idempotency key drops the duplicates across every server instance).
// Customer details are scrubbed: no request bodies or query strings, and email addresses,
// tokens and keys are blanked.
//
// Runs in both the Node and Edge runtimes (middleware), so it only uses fetch and Web Crypto.
//
// Env vars (optional): ERROR_ALERT_TO (default josh@braunboard.com), ERROR_ALERT_FROM
// (default "Braun Board alerts <alerts@braunboard.com>"). Sends with RESEND_API_KEY.

const TO = () => process.env.ERROR_ALERT_TO ?? "josh@braunboard.com";
const FROM = () => process.env.ERROR_ALERT_FROM ?? "Braun Board alerts <alerts@braunboard.com>";

/** Blank out anything that could be a person's data or a secret. */
export function scrub(s: unknown): string {
  return String(s ?? "")
    .replace(/[^\s@<>()"',;:]+@[^\s@<>()"',;:]+\.[a-z]{2,}/gi, "[email]")
    .replace(/eyJ[\w-]+\.[\w-]+\.[\w-]+/g, "[token]") // JWTs
    .replace(/\b(sk|pk|rk|whsec|re|sb)_[A-Za-z0-9_]{8,}/g, "[key]") // Stripe/Resend/Supabase style keys
    .replace(/\b[A-Za-z0-9_-]{32,}\b/g, "[redacted]"); // other long tokens
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

async function fingerprint(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf).slice(0, 8), (b) => b.toString(16).padStart(2, "0")).join("");
}

export type ErrorWhere = { where: string; method?: string; path?: string; requestId?: string; digest?: string };

/** Email Josh about an error. Never throws. */
export async function reportError(err: unknown, info: ErrorWhere): Promise<void> {
  try {
    console.error("[error-alert]", info.where, err);
    const key = process.env.RESEND_API_KEY;
    const e = err as { message?: string; stack?: string; digest?: string } | null;
    const message = scrub(e?.message ?? err ?? "Unknown error").slice(0, 300);
    const stack = scrub(String(e?.stack ?? "").split("\n").slice(1, 16).join("\n"));
    const path = String(info.path ?? "").split("?")[0].slice(0, 200); // query strings can hold login tokens
    const when = new Date().toLocaleString("en-US", { timeZone: "America/New_York" }) + " ET";
    const fp = await fingerprint(info.where + "|" + message.replace(/\d+/g, "#"));
    const hour = Math.floor(Date.now() / 3_600_000);

    const rows: [string, string][] = [
      ["Where", info.where],
      ["Request", `${info.method ?? ""} ${path}`.trim() || "n/a"],
      ["When", when],
      ["Error", message],
      ["Error ID", info.digest ?? e?.digest ?? "n/a"],
      ["Vercel request ID", info.requestId || "n/a"],
    ];
    const text = [
      "Something broke on Braun Board. Visitors saw a plain error page, no details.",
      ...rows.map(([k, v]) => `${k}: ${v}`),
      `Stack trace:\n${stack || "n/a"}`,
      "Repeats of this same error are bundled: at most one of these per hour. Check Vercel logs for how many times it happened.",
      'To fix it: forward this to Claude and say "fix this".',
    ].join("\n\n");
    const html = `<div style="font:15px/1.5 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#1C1C1A;max-width:640px">
<p>Something broke on Braun Board. Visitors saw a plain error page, no details.</p>
<table style="border-collapse:collapse;margin:0 0 16px">${rows.map(([k, v]) => `<tr><td style="padding:4px 12px 4px 0;color:#5C5C57;vertical-align:top">${esc(k)}</td><td style="padding:4px 0"><strong>${esc(v)}</strong></td></tr>`).join("")}</table>
<p style="margin:0 0 6px;color:#5C5C57">Stack trace</p>
<pre style="background:#F4F4F2;padding:12px;border-radius:6px;font-size:12px;white-space:pre-wrap">${esc(stack || "n/a")}</pre>
<p style="color:#5C5C57">Repeats of this same error are bundled: at most one of these per hour. Check Vercel logs for how many times it happened.</p>
<p>To fix it: forward this to Claude and say "fix this".</p></div>`;

    // Logged for the hourly auto-fix run, which fixes it and tells Josh what it did.
    const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (sbUrl && sbKey) {
      await fetch(`${sbUrl}/rest/v1/rpc/log_error_event`, {
        method: "POST",
        headers: { apikey: sbKey, Authorization: `Bearer ${sbKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          p_fingerprint: fp, p_hour: hour, p_where: info.where, p_method: info.method ?? null, p_path: path,
          p_message: message, p_stack: stack, p_digest: info.digest ?? e?.digest ?? null, p_request_id: info.requestId || null,
        }),
        signal: AbortSignal.timeout(4000),
      }).catch((err) => console.error("[error-alert] could not log error", err));
    }
    // Josh asked not to get these by email anymore (Nov 10, 2026). Set ERROR_ALERT_EMAIL=on to bring them back.
    if (process.env.ERROR_ALERT_EMAIL !== "on" || !key) return;

    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "Idempotency-Key": `bb-error-${fp}-${hour}` },
      body: JSON.stringify({ from: FROM(), to: [TO()], subject: `[Braun Board error] ${info.where}: ${message.slice(0, 80)}`, text, html }),
      signal: AbortSignal.timeout(4000),
    });
  } catch (e) {
    console.error("[error-alert] could not send alert", e);
  }
}
