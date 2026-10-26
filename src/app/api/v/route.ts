// Counts one page view. The page sends its address and where the visitor came from; nothing else.
import { NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";
import { deviceOf, isBot, sourceOf, visitorCode } from "@/lib/visits";

export async function POST(req: Request) {
  try {
    const ua = req.headers.get("user-agent") ?? "";
    if (isBot(ua)) return new NextResponse(null, { status: 204 });
    const body = (await req.json().catch(() => ({}))) as { p?: unknown; r?: unknown };
    const path = typeof body.p === "string" ? body.p.slice(0, 300) : "";
    // Only our own public pages.
    if (!path.startsWith("/") || /^\/(admin|api|auth|_next)\b/.test(path)) return new NextResponse(null, { status: 204 });
    const referrer = typeof body.r === "string" ? body.r.slice(0, 500) : "";
    const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0]!.trim() || req.headers.get("x-real-ip") || "";
    const secret = process.env.ALERTS_LINK_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "visits";
    await adminClient().from("page_views").insert({
      path,
      source: sourceOf(path, referrer),
      visitor: visitorCode(ip, ua, secret),
      country: req.headers.get("x-vercel-ip-country") || null,
      device: deviceOf(ua),
    });
  } catch {
    // Counting must never break anything for the visitor.
  }
  return new NextResponse(null, { status: 204 });
}
