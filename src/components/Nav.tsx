"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

/** One entry per section. Views inside a section (For You, New today, Alerts) are tabs on its pages. */
export const SECTIONS: { href: string; label: string; also: string[] }[] = [
  { href: "/jobs", label: "Jobs", also: ["/for-you", "/new", "/company", "/companies"] },
  { href: "/products", label: "What You'd Sell", also: [] },
  { href: "/salaries", label: "Salaries", also: [] },
  { href: "/outreach", label: "Toolkit", also: ["/kit", "/cold-call", "/proof-page"] },
  { href: "/watchlist", label: "Saved", also: ["/alerts"] },
];

export const isActive = (path: string, s: { href: string; also: string[] }) =>
  [s.href, ...s.also].some((h) => path === h || path.startsWith(h + "/"));

/** The top menu on tablets and up. Phones get the bottom tab bar instead. */
export function Nav() {
  const path = usePathname();
  return (
    <nav className="hidden gap-0.5 text-sm sm:flex xl:gap-1">
      {SECTIONS.map((s) => (
        <Link
          key={s.href}
          href={s.href}
          className={`whitespace-nowrap rounded-md px-2 py-1.5 xl:px-2.5 ${isActive(path, s) ? "bg-surface font-semibold text-ink shadow-[0_0_0_1px_var(--line)]" : "text-ink-2 hover:text-ink"}`}
        >
          {s.label}
        </Link>
      ))}
    </nav>
  );
}
