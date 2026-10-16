// Counts a kit download, then sends the PDF. Counting never blocks the download.
import { NextResponse, type NextRequest } from "next/server";
import { adminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
const SOURCES = new Set(["kit-page", "job-page", "ask", "picks-email", "alert-email"]);

export async function GET(req: NextRequest) {
  const from = req.nextUrl.searchParams.get("from") ?? "";
  if (isSupabaseConfigured()) {
    try {
      await adminClient().from("kit_downloads").insert({ source: SOURCES.has(from) ? from : "other" });
    } catch (e) {
      console.error("kit download count failed", (e as Error).message);
    }
  }
  return NextResponse.redirect(new URL("/kit/before-you-say-yes.pdf", req.url), 302);
}
