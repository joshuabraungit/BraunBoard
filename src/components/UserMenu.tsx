"use client";
import Link from "next/link";
import { signOut } from "@/app/actions";
import { useMe } from "./useMe";

/** Top right on tablets and up: Ask Josh, a small Employers link, and your account. Phones use the bottom tab bar. */
export function UserMenu() {
  const me = useMe();
  const ask = (
    <>
      <Link href="/ask" className="whitespace-nowrap rounded-md px-2 py-1.5 font-semibold text-accent hover:bg-surface xl:px-2.5">
        Ask Josh
      </Link>
      <Link href="/employers" className="whitespace-nowrap rounded-md px-2 py-1.5 text-xs text-ink-3 hover:bg-surface hover:text-ink">
        Employers
      </Link>
    </>
  );
  if (!me) {
    return (
      <div className="ml-auto hidden shrink-0 items-center gap-1 text-sm sm:flex">
        {ask}
        {/* While checking, hold the spot so a signed-in person doesn't see "Sign in" flash. */}
        <Link
          href="/login"
          aria-hidden={me === undefined}
          tabIndex={me === undefined ? -1 : undefined}
          className={`whitespace-nowrap rounded-md px-2.5 py-1.5 font-semibold hover:bg-surface ${me === undefined ? "invisible" : ""}`}
        >
          Sign in
        </Link>
      </div>
    );
  }
  return (
    <form action={signOut} className="ml-auto hidden shrink-0 items-center gap-2 text-sm sm:flex">
      {ask}
      {me.admin && (
        <Link href="/admin" className="rounded-md px-2.5 py-1.5 font-semibold text-ink hover:bg-surface">
          Admin
        </Link>
      )}
      <span className="hidden max-w-40 truncate text-ink-3 lg:inline">{me.email}</span>
      <button className="rounded-md px-2.5 py-1.5 text-ink-2 hover:bg-surface hover:text-ink">Sign out</button>
    </form>
  );
}
