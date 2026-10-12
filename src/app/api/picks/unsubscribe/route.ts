// One-click unsubscribe (RFC 8058): mail apps POST here from the List-Unsubscribe header.
import { NextResponse } from "next/server";
import { unsubscribe } from "@/lib/picks-subscribe";

export async function POST(req: Request) {
  const s = new URL(req.url).searchParams.get("s") ?? "";
  await unsubscribe(s);
  return new NextResponse(null, { status: 200 });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  return NextResponse.redirect(`${url.origin}/picks/unsubscribe?s=${encodeURIComponent(url.searchParams.get("s") ?? "")}`);
}
