import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import Link from "next/link";
import { Suspense } from "react";
import { PageView } from "@/components/PageView";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { UserMenu } from "@/components/UserMenu";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.braunboard.com"),
  title: "Braun Board",
  description: "Big OTE on paper. Find out if reps actually earn it.",
  openGraph: { type: "website", siteName: "Braun Board" },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <header className="sticky top-0 z-20 border-b border-line bg-bg/90 backdrop-blur">
          {/* On phones the menu gets its own scrollable row under the logo, so more than one item shows. */}
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2 sm:flex-nowrap sm:gap-4 sm:py-3 xl:gap-6">
            <Link href="/" className="shrink-0 text-[17px] font-bold tracking-tight">
              Braun Board
            </Link>
            <div className="order-last w-full min-w-0 sm:order-none sm:w-auto sm:flex-1">
              <Nav />
            </div>
            <UserMenu />
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 pb-24 pt-6">{children}</main>
        <footer className="border-t border-line py-6 text-center text-xs text-ink-3">
          <Link href="/privacy" className="hover:text-ink">Privacy</Link>
          <span className="mx-2">·</span>
          <Link href="/terms" className="hover:text-ink">Terms</Link>
          <span className="mx-2">·</span>
          <Link href="/employers" className="hover:text-ink">Hiring sellers? Sponsor a job</Link>
        </footer>
        {/* Visitor counts and where they came from. No cookies. */}
        <Analytics />
        <Suspense fallback={null}>
          <PageView />
        </Suspense>
      </body>
    </html>
  );
}
