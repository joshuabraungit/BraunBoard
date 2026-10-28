import Link from "next/link";

const TABS = [
  { href: "/outreach", label: "Outreach emails" },
  { href: "/kit", label: "Before You Say Yes" },
] as const;

/** Switches between the pages under "Toolkit" in the menu. */
export function PlaybookTabs({ active }: { active: (typeof TABS)[number]["href"] }) {
  return (
    <div className="mb-6 flex gap-2 overflow-x-auto [scrollbar-width:none]">
      {TABS.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          className={`shrink-0 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-sm ${t.href === active ? "border-ink bg-ink font-semibold text-white" : "border-line bg-surface text-ink-2 hover:text-ink"}`}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}
