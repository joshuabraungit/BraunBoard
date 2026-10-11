import Link from "next/link";
import { getUser } from "@/lib/session";
import { signOut } from "@/app/actions";

export async function UserMenu() {
  const user = await getUser();
  if (!user) {
    return (
      <Link href="/login" className="ml-auto shrink-0 rounded-md px-2.5 py-1.5 text-sm font-semibold hover:bg-surface">
        Sign in
      </Link>
    );
  }
  return (
    <form action={signOut} className="ml-auto flex shrink-0 items-center gap-2 text-sm">
      <span className="hidden max-w-40 truncate text-ink-3 md:inline">{user.email}</span>
      <button className="rounded-md px-2.5 py-1.5 text-ink-2 hover:bg-surface hover:text-ink">Sign out</button>
    </form>
  );
}
