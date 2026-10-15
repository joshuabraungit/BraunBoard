import Link from "next/link";
import { getUser } from "@/lib/session";
import { signOut } from "@/app/actions";
import { isAdmin } from "@/lib/admin";

export async function UserMenu() {
  const user = await getUser();
  // "Ask Josh" sits by Sign in, where there's room on every screen size (the main menu scrolls off on phones).
  const ask = (
    <Link href="/ask" className="whitespace-nowrap rounded-md px-2.5 py-1.5 font-semibold text-accent hover:bg-surface">
      Ask Josh
    </Link>
  );
  if (!user) {
    return (
      <div className="ml-auto flex shrink-0 items-center gap-1 text-sm">
        {ask}
        <Link href="/login" className="rounded-md px-2.5 py-1.5 font-semibold hover:bg-surface">
          Sign in
        </Link>
      </div>
    );
  }
  return (
    <form action={signOut} className="ml-auto flex shrink-0 items-center gap-2 text-sm">
      {ask}
      {isAdmin(user) && (
        <Link href="/admin" className="rounded-md px-2.5 py-1.5 font-semibold text-ink hover:bg-surface">
          Admin
        </Link>
      )}
      <span className="hidden max-w-40 truncate text-ink-3 md:inline">{user.email}</span>
      <button className="rounded-md px-2.5 py-1.5 text-ink-2 hover:bg-surface hover:text-ink">Sign out</button>
    </form>
  );
}
