// Who's signed in, for the menu in the header. The header is the same for every visitor,
// so pages can be prebuilt, and the menu asks this once the page is open.
import { NextResponse } from "next/server";
import { getUser } from "@/lib/session";
import { isAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getUser();
  return NextResponse.json(user ? { email: user.email ?? null, admin: isAdmin(user) } : null, {
    headers: { "cache-control": "private, no-store" },
  });
}
