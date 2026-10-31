"use client";

// Top-of-home intro card with the owl. Closing it sets a cookie so it stays closed.

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PeekerOwl } from "./PeekerOwl";

export const INTRO_COOKIE = "bb_intro";

export function IntroBanner() {
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
          Great OTE.
          <br />
          How many reps earn it?
        </h1>
        <PeekerOwl className="col-span-2 row-start-1 mb-4 w-28 sm:col-span-1 sm:col-start-2 sm:row-span-2 sm:row-start-1 sm:mb-0 sm:w-44" />
        <div className="col-span-2 row-start-3 sm:col-span-1 sm:col-start-1 sm:row-start-2 sm:self-start">
          <p className="mt-3 max-w-xl text-ink-2">
            Most sales job posts don&rsquo;t say. I show you what&rsquo;s missing. Tell me the role, pay, where and your dealbreakers.
            I&rsquo;ll email you when a match shows up, with the red lights and the questions to ask before you say yes.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/for-you"
              className="inline-flex min-h-11 items-center rounded-lg bg-ink px-4 text-sm font-semibold text-white hover:opacity-90"
            >
              Find my next sales job →
            </Link>
          </div>
          <p className="mt-4 text-sm text-ink-2">
            Got an offer and not sure about it?{" "}
            <Link href="/ask" className="font-semibold text-ink underline underline-offset-2 hover:no-underline">
              Ask me →
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}
