// Sends the kit PDF to people who gave an email on /kit, and counts the download.
// No email yet? Back to the form. Counting never blocks the download.
import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse, type NextRequest } from "next/server";
import { adminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { KIT_COOKIE, KIT_FROM } from "@/lib/kit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("from") ?? "";
  const from = KIT_FROM.has(raw) ? raw : "other";

  if (req.cookies.get(KIT_COOKIE)?.value !== "1") {
    const to = new URL("/kit", req.url);
    if (from !== "other" && from !== "kit-page") to.searchParams.set("from", from);
    to.hash = "get-kit";
    return NextResponse.redirect(to, 302);
  }

  // The daily health check downloads the kit too. Don't count those.
  const isHealthCheck = req.headers.get("user-agent") === "BraunBoard-HealthCheck";
  if (isSupabaseConfigured() && !isHealthCheck) {
    try {
      await adminClient().from("kit_downloads").insert({ source: from });
    } catch (e) {
      console.error("kit download count failed", (e as Error).message);
    }
  }

  const pdf = await readFile(path.join(process.cwd(), "private", "before-you-say-yes.pdf"));
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": 'inline; filename="before-you-say-yes.pdf"',
      "cache-control": "private, no-store",
      "x-robots-tag": "noindex",
    },
  });
}
