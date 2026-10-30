// Apply click on a sponsored job: count it, then send the reader to the company's posting.
import { NextResponse } from "next/server";
import { bump, getOrder } from "@/lib/sponsor";
import { isRunning } from "@/lib/sponsor-form";
import { isUuid } from "@/lib/picks-subscribe";
import { isBot } from "@/lib/visits";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const site = new URL(req.url).origin;
  if (!isUuid(id)) return NextResponse.redirect(`${site}/`);
  try {
    const s = await getOrder(id);
    if (!s || !["live", "done"].includes(s.status) || !/^https?:\/\//i.test(s.job_url)) return NextResponse.redirect(`${site}/`);
    if (isRunning(s) && !isBot(req.headers.get("user-agent") ?? "")) await bump(s.id, "apply");
    return NextResponse.redirect(s.job_url);
  } catch {
    return NextResponse.redirect(`${site}/`);
  }
}
