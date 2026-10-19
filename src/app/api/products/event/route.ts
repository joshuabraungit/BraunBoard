// Counts Products page actions (See jobs, Watch company, Something wrong) for Admin. Never blocks the page.
import { NextResponse, type NextRequest } from "next/server";
import { adminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/server";

const EVENTS = new Set(["see_jobs", "watch", "report", "see_all"]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: NextRequest) {
  try {
    const b = (await req.json()) as { event?: string; company?: string; source?: string };
    if (!b.event || !EVENTS.has(b.event)) return new NextResponse(null, { status: 204 });
    if (isSupabaseConfigured()) {
      await adminClient().from("product_events").insert({
        event: b.event,
        company_id: b.company && UUID.test(b.company) ? b.company : null,
        source: (b.source ?? "products").slice(0, 40),
      });
    }
  } catch {
    // Bad body or a hiccup: counting is best-effort.
  }
  return new NextResponse(null, { status: 204 });
}
