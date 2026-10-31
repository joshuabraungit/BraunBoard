"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { signOut } from "@/app/actions";
import { hasAuthCookie } from "@/lib/supabase/auth-cookie";

type Me = { email: string | null; admin: boolean } | null;

const cookieNames = () =>
  document.cookie
    .split(";")
    .map((c) => ({ name: c.split("=")[0].trim() }))
    .filter((c) => c.name);

export function UserMenu() {
  // undefined = still checking. Most visitors aren't signed in, and for them there's nothing to ask.
  const [me, setMe] = useState<Me | undefined>(undefined);
  useEffect(() => {
    if (!hasAuthCookie(cookieNames())) return setMe(null);
    let live = true;
    fetch("/api/me", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((m: Me) => live && setMe(m))
      .catch(() => live && setMe(null));
    return () => {
      live = false;
    };
  }, []);

  // "Employers" and "Ask Josh" sit by Sign in, where there's room on every screen size (the main menu scrolls off on phones).
  const ask = (
    <>
      <Link href="/employers" className="whitespace-nowrap rounded-md px-1.5 py-1.5 text-ink-2 hover:bg-surface hover:text-ink sm:px-2.5">
        Employers
      </Link>
      <Link href="/ask" className="whitespace-nowrap rounded-md px-1.5 py-1.5 font-semibold text-accent hover:bg-surface sm:px-2.5">
        Ask Josh
      </Link>
    </>
  );
  if (!me) {
    return (
      <div className="ml-auto flex shrink-0 items-center gap-0 text-sm sm:gap-1">
        {ask}
        {/* While checking, hold the spot so a signed-in person doesn't see "Sign in" flash. */}
        <Link
          href="/login"
          aria-hidden={me === undefined}
          tabIndex={me === undefined ? -1 : undefined}
          className={`whitespace-nowrap rounded-md px-1.5 py-1.5 font-semibold hover:bg-surface sm:px-2.5 ${me === undefined ? "invisible" : ""}`}
        >
          Sign in
        </Link>
      </div>
    );
  }
  return (
    <form action={signOut} className="ml-auto flex shrink-0 items-center gap-2 text-sm">
      {ask}
      {me.admin && (
        <Link href="/admin" className="rounded-md px-2.5 py-1.5 font-semibold text-ink hover:bg-surface">
          Admin
        </Link>
      )}
      <span className="hidden max-w-40 truncate text-ink-3 md:inline">{me.email}</span>
      <button className="rounded-md px-2.5 py-1.5 text-ink-2 hover:bg-surface hover:text-ink">Sign out</button>
    </form>
  );
}
