// One-click unsubscribe (RFC 8058) for one-off emails. Mail apps POST here; a GET goes to the confirm page.
import { NextResponse } from "next/server";
import { optOut } from "@/lib/email-optout";

export async function POST(req: Request) {
  const ok = await optOut(new URL(req.url).searchParams.get("t"));
  return new NextResponse(null, { status: ok ? 200 : 400 });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  return NextResponse.redirect(`${url.origin}/email/unsubscribe?t=${encodeURIComponent(url.searchParams.get("t") ?? "")}`);
}
