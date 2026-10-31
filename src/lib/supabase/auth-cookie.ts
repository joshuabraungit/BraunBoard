// Supabase keeps a signed-in session in a cookie named sb-<project>-auth-token
// (sometimes split into .0, .1 chunks). No such cookie means nobody is signed in,
// so we can skip asking Supabase, which is a network round trip.
export const hasAuthCookie = (cookies: { name: string }[]) =>
  cookies.some((c) => c.name.startsWith("sb-") && c.name.includes("-auth-token"));
