"use client";

// What visitors see when a page breaks. No error details: Josh already got an email with those
// (see src/instrumentation.ts).

import Link from "next/link";
import { CallJoshLine } from "@/components/CallJosh";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-xl py-16">
      <h1 className="text-2xl font-bold tracking-tight">Something went wrong on my end.</h1>
      <p className="mt-3 text-ink-2">I&apos;ve been notified and I&apos;ll fix it. Give it another try in a bit.</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <button onClick={() => reset()} className="rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white">
          Try again
        </button>
        <Link href="/" className="rounded-lg border border-line px-4 py-2 text-sm font-semibold">
          Back to jobs
        </Link>
      </div>
      <CallJoshLine lead="Stuck? Call or text me:" className="mt-8" />
    </div>
  );
}
