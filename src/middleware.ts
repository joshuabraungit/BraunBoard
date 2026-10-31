// Keeps the Supabase session cookie fresh on every request (per @supabase/ssr docs).
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { hasAuthCookie } from "@/lib/supabase/auth-cookie";

export async function middleware(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return NextResponse.next();

  // If Supabase didn't accept our callback address it sends people to the Site URL
  // with ?code=... instead. Route that through the callback so the sign-in still sticks.
  const { pathname, searchParams } = request.nextUrl;
  if (pathname !== "/auth/callback" && (searchParams.has("code") || searchParams.has("token_hash"))) {
    const to = request.nextUrl.clone();
    to.pathname = "/auth/callback";
    if (!to.searchParams.has("next")) to.searchParams.set("next", pathname === "/" ? "/for-you" : pathname);
    return NextResponse.redirect(to);
  }

  // Not signed in? Nothing to refresh. Skips a trip to Supabase on most page loads.
  if (!hasAuthCookie(request.cookies.getAll())) return NextResponse.next();

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (toSet) => {
        toSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  await supabase.auth.getUser();
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|r/|p/|.*\\.(?:png|jpg|svg|ico)$).*)"],
};
