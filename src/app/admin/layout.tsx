import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin";

export const metadata: Metadata = { title: "Admin | Braun Board", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const TABS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/companies", label: "Companies" },
  { href: "/admin/users", label: "Users" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-2 border-b border-line pb-3">
        <span className="mr-2 rounded bg-ink px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-white">Admin</span>
        {TABS.map((t) => (
          <Link key={t.href} href={t.href} className="rounded-md px-2.5 py-1.5 text-sm text-ink-2 hover:bg-surface hover:text-ink">
            {t.label}
          </Link>
        ))}
      </div>
      {children}
    </div>
  );
}
