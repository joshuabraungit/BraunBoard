// Alert email click -> job detail. Records clicked_at so we can measure the
// primary V1 metric: % of alerts that result in a job-detail click.
import { NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const site = new URL(req.url).origin;
  try {
    const db = adminClient();
    const { data } = await db.from("alert_matches").select("id, jobs(slug)").eq("id", id).maybeSingle();
    const slug = (data?.jobs as unknown as { slug: string } | null)?.slug;
    if (!slug) return NextResponse.redirect(`${site}/jobs`);
    await db.from("alert_matches").update({ clicked_at: new Date().toISOString() }).eq("id", id).is("clicked_at", null);
    return NextResponse.redirect(`${site}/jobs/${slug}?ref=alert`);
  } catch {
    return NextResponse.redirect(`${site}/jobs`);
  }
}
