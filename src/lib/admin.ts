// Admin access. Server-only. Anyone not on the list gets a plain 404, so the
// admin area doesn't advertise itself.
import { notFound } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { getUser } from "./session";

export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "josh@joshbraun.com")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export const isAdmin = (user: Pick<User, "email"> | null) => !!user?.email && adminEmails().includes(user.email.toLowerCase());

/** Call at the top of every admin page and server action. */
export async function requireAdmin(): Promise<User> {
  const user = await getUser();
  if (!user || !isAdmin(user)) notFound();
  return user;
}
