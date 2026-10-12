import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { UserMenu } from "@/components/UserMenu";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.braunboard.com"),
  title: "Braun Board",
  description: "Tell us the sales job you would take. We will tell you when it shows up.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <header className="sticky top-0 z-20 border-b border-line bg-bg/90 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3 sm:gap-6">
            <Link href="/" className="shrink-0 text-[17px] font-bold tracking-tight">
              Braun Board
            </Link>
            <Nav />
            <UserMenu />
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 pb-24 pt-6">{children}</main>
        <footer className="border-t border-line py-6 text-center text-xs text-ink-3">
          <Link href="/privacy" className="hover:text-ink">Privacy</Link>
          <span className="mx-2">·</span>
          <Link href="/terms" className="hover:text-ink">Terms</Link>
        </footer>
      </body>
    </html>
  );
}
