// One-click unsubscribe for alert emails (RFC 8058). Mail apps POST here from the List-Unsubscribe header
// when someone taps their built-in "Unsubscribe" button. It turns off just the alert that email was for.
// Link scanners only ever GET, so a GET goes to the normal confirm page instead of changing anything.
import { NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";
import { readOffToken } from "@/lib/alerts/off";

export async function POST(req: Request) {
  const who = readOffToken(new URL(req.url).searchParams.get("t"));
  if (!who) return new NextResponse(null, { status: 400 });
  const db = adminClient();
  if (who.watchId) {
    await db.from("watches").update({ alert_frequency: "off" }).eq("id", who.watchId).eq("user_id", who.userId);
  } else {
    // Watched-companies email: those follow the person's own setting.
    await db.from("profiles").update({ alert_frequency: "off" }).eq("id", who.userId);
  }
  return new NextResponse(null, { status: 200 });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  return NextResponse.redirect(`${url.origin}/alerts/off?t=${encodeURIComponent(url.searchParams.get("t") ?? "")}`);
}
