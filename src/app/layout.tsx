import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { UserMenu } from "@/components/UserMenu";

export const metadata: Metadata = {
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
      </body>
    </html>
  );
}
