"use client";

// Top-of-home intro card with the owl. Closing it sets a cookie so it stays closed.

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PeekerOwl } from "./PeekerOwl";

export const INTRO_COOKIE = "bb_intro";
const REDDIT = "https://www.reddit.com/r/BraunBoard/";

export function IntroBanner({ hasWatch }: { hasWatch: boolean }) {
  const [open, setOpen] = useState(true);
  const router = useRouter();
  if (!open) return null;

  const close = () => {
    document.cookie = `${INTRO_COOKIE}=hidden; max-age=31536000; path=/; samesite=lax`;
    setOpen(false);
    router.refresh();
  };

  return (
    <section className="relative mb-10 overflow-hidden rounded-2xl border border-line bg-surface p-6 sm:p-8">
      <button
        type="button"
        onClick={close}
        aria-label="Close"
        className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full text-ink-3 hover:bg-bg hover:text-ink"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
          <path d="M3 3 L15 15 M15 3 L3 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>

      {/* Phone: the owl peeks over the headline. Wider: owl sits beside everything. */}
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 sm:gap-x-8">
        <h1 className="col-span-2 row-start-2 text-2xl font-bold tracking-tight sm:col-span-1 sm:col-start-1 sm:row-start-1 sm:self-end sm:pr-8 sm:text-3xl">
          See who&apos;s hiring, what they pay, and what they&apos;re hiding.
        </h1>
        <PeekerOwl className="col-span-2 row-start-1 mb-4 w-28 sm:col-span-1 sm:col-start-2 sm:row-span-2 sm:row-start-1 sm:mb-0 sm:w-44" />
        <div className="col-span-2 row-start-3 sm:col-span-1 sm:col-start-1 sm:row-start-2 sm:self-start">
          <p className="mt-3 max-w-xl text-ink-2">
            Every job comes straight from the company&apos;s own careers page. We read the fine print for you: the pay, the
            quota, who you&apos;d be selling to, and the red flags. Then we hand you the questions to ask on the first call.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/for-you"
              className="inline-flex min-h-11 items-center rounded-lg bg-ink px-4 text-sm font-semibold text-white hover:opacity-90"
            >
              {hasWatch ? "See my matches →" : "Set up my watch →"}
            </Link>
            <a
              href={REDDIT}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center rounded-lg border border-line-strong px-4 text-sm font-semibold hover:bg-bg"
            >
              Join our community on Reddit
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
