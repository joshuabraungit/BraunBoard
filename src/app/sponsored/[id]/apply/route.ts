// Apply click on a sponsored job: count it, then send the reader to the company's posting.
import { NextResponse } from "next/server";
import { bump, getOrder } from "@/lib/sponsor";
import { isRunning } from "@/lib/sponsor-form";
import { isUuid } from "@/lib/picks-subscribe";
import { isBot, visitorCode } from "@/lib/visits";
import { adminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const site = new URL(req.url).origin;
  if (!isUuid(id)) return NextResponse.redirect(`${site}/`);
  try {
    const s = await getOrder(id);
    if (!s || !["live", "done"].includes(s.status) || !/^https?:\/\//i.test(s.job_url)) return NextResponse.redirect(`${site}/`);
    const ua = req.headers.get("user-agent") ?? "";
    if (isRunning(s) && !isBot(ua)) {
      await bump(s.id, "apply");
      // Same daily code as page views, so the results page can credit the click to where they came from.
      const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0]!.trim() || req.headers.get("x-real-ip") || "";
      const secret = process.env.ALERTS_LINK_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "visits";
      await adminClient()
        .from("sponsor_apply_clicks")
        .insert({ sponsor_id: s.id, visitor: visitorCode(ip, ua, secret) })
        .then(({ error }) => error && console.error("[sponsor] apply click log failed", error.message));
    }
    return NextResponse.redirect(s.job_url);
  } catch {
    return NextResponse.redirect(`${site}/`);
  }
}
