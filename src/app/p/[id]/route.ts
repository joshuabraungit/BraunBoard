// Picks email click -> job page. Logs the click so we know which picks land.
import { NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";
import { isUuid } from "@/lib/picks-subscribe";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = new URL(req.url);
  const site = url.origin;
  const sub = url.searchParams.get("s") ?? "";
  if (!isUuid(id)) return NextResponse.redirect(`${site}/jobs`);
  try {
    const db = adminClient();
    const { data } = await db.from("picks_items").select("job_slug").eq("id", id).maybeSingle();
    if (!data) return NextResponse.redirect(`${site}/jobs`);
    if (sub !== "preview") await db.from("picks_clicks").insert({ item_id: id, subscriber_id: isUuid(sub) ? sub : null });
    return NextResponse.redirect(data.job_slug ? `${site}/jobs/${data.job_slug}?ref=picks` : `${site}/jobs`);
  } catch {
    return NextResponse.redirect(`${site}/jobs`);
  }
}
