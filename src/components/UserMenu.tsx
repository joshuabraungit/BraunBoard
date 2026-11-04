"use client";
import Link from "next/link";
import { signOut } from "@/app/actions";
import { useMe } from "./useMe";

/**
 * Top right on tablets and up: Ask Josh, a "Post a job" button for employers, and your account. Phones use the bottom tab bar.
 * Portrait iPads don't have room for all of it next to the menu, so the account links (and "Post a job", under 800px) move into the ☰ menu (PhoneMenu).
 */
export function UserMenu() {
  const me = useMe();
  const ask = (
    <>
      <Link href="/ask" className="hidden whitespace-nowrap rounded-md px-2 py-1.5 font-semibold text-accent hover:bg-surface min-[720px]:block xl:px-2.5">
        Ask Josh
      </Link>
      <Link
        href="/employers"
        className="mx-1 hidden items-center gap-1.5 whitespace-nowrap min-[800px]:inline-flex rounded-full border-[1.5px] border-ink px-3.5 py-1.5 font-semibold text-ink hover:bg-ink hover:text-white"
      >
        <span className="hidden lg:inline">Hiring?</span> Post a job
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
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
          className={`hidden whitespace-nowrap rounded-md px-2.5 py-1.5 font-semibold hover:bg-surface lg:block ${me === undefined ? "invisible" : ""}`}
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
        <Link href="/admin" className="hidden rounded-md px-2.5 py-1.5 font-semibold text-ink hover:bg-surface lg:block">
          Admin
        </Link>
      )}
      <span className="hidden max-w-40 truncate text-ink-3 lg:inline">{me.email}</span>
      <button className="hidden rounded-md px-2.5 py-1.5 text-ink-2 hover:bg-surface hover:text-ink lg:block">Sign out</button>
    </form>
  );
}
