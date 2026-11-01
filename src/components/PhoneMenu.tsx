"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { signOut } from "@/app/actions";
import { isActive, SECTIONS } from "./Nav";
import { useMe } from "./useMe";

/**
 * Phones: the ☰ button at the top right. Opens the whole menu, for people who look up top
 * (and on job pages, where the bottom bar gives way to Save / Apply).
 */
export function PhoneMenu() {
  const path = usePathname();
  const me = useMe();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const links = [
    { href: "/", label: "Home", also: [] as string[] },
    ...SECTIONS,
    { href: "/ask", label: "Ask Josh", also: [] },
    { href: "/alerts", label: "Alert emails", also: [] },
    { href: "/employers", label: "Employers: sponsor a job", also: [] },
    ...(me?.admin ? [{ href: "/admin", label: "Admin", also: [] }] : []),
  ];
  const on = (l: { href: string; also: string[] }) => (l.href === "/" ? path === "/" : isActive(path, l));

  return (
    <div className="sm:hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={open ? "Close menu" : "Open menu"}
        className="-mr-2 flex h-10 w-10 items-center justify-center rounded-lg text-ink hover:bg-surface"
      >
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden>
          {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
        </svg>
      </button>
      {open && (
        <div className="absolute inset-x-0 top-full z-40 h-[calc(100dvh-100%)] overflow-y-auto border-t border-line bg-bg px-4 pb-10 pt-2">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={on(l) ? "page" : undefined}
              className={`block border-b border-line py-4 text-lg ${on(l) ? "font-semibold text-accent" : "text-ink"}`}
            >
              {l.label}
            </Link>
          ))}
          <div className="pt-4">
            {me ? (
              <form action={signOut}>
                <button className="text-left text-base text-ink-2">
                  Sign out{me.email && <span className="block truncate text-sm text-ink-3">{me.email}</span>}
                </button>
              </form>
            ) : (
              <Link href="/login" className="inline-block rounded-lg bg-ink px-5 py-3 text-base font-semibold text-white">
                Sign in
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
