// Receives Content-Security-Policy-Report-Only violation reports and writes a one-line summary
// to the Vercel logs, so the report-only policy can be checked against real traffic before it's enforced.
// Logs only the rule and the blocked site. Never the page address, which can carry tokens.
import { NextResponse } from "next/server";
import { cleanPath, cleanReferrer } from "@/lib/visit-clean";

type Report = Record<string, unknown>;

function originOf(v: unknown): string {
  if (typeof v !== "string") return "";
  if (["inline", "eval", "data", "blob", "self"].includes(v)) return v;
  return cleanReferrer(v) || v.split(":")[0]!.slice(0, 20);
}

function pathOf(v: unknown): string {
  if (typeof v !== "string") return "";
  try {
    return cleanPath(new URL(v).pathname).split("?")[0]!;
  } catch {
    return "";
  }
}

export async function POST(req: Request) {
  try {
    const text = (await req.text()).slice(0, 20_000);
    const json = JSON.parse(text) as Report | Report[];
    // Old format: { "csp-report": {...} }. New Reporting API: [{ type, body: {...} }].
    const items: Report[] = Array.isArray(json)
      ? json.map((r) => (r.body ?? {}) as Report)
      : [((json as Report)["csp-report"] ?? json) as Report];
    for (const r of items.slice(0, 20)) {
      const directive = String(r["effective-directive"] ?? r.effectiveDirective ?? r["violated-directive"] ?? "?").slice(0, 40);
      const blocked = originOf(r["blocked-uri"] ?? r.blockedURL);
      const page = pathOf(r["document-uri"] ?? r.documentURL);
      console.warn(`[csp-report-only] ${directive} blocked=${blocked || "?"} page=${page || "?"}`);
    }
  } catch {
    // Bad reports are just ignored.
  }
  return new NextResponse(null, { status: 204 });
}
