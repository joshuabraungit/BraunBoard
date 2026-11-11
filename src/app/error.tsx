"use client";

// What visitors see when a page breaks. No error details: Josh already got an email with those
// (see src/instrumentation.ts).

import Link from "next/link";
import { CallJoshLine } from "@/components/CallJosh";

// The page was loaded before a new deploy, so its form buttons point at code that's gone.
// reset() would just fail again; a full reload picks up the new version.
function isStaleDeploy(error: Error) {
  return error?.name === "UnrecognizedActionError" || /failed-to-find-server-action/.test(error?.message ?? "");
}

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const stale = isStaleDeploy(error);
  return (
    <div className="mx-auto max-w-xl py-16">
      <h1 className="text-2xl font-bold tracking-tight">
        {stale ? "Braun Board just got an update." : "Something went wrong on my end."}
      </h1>
      <p className="mt-3 text-ink-2">
        {stale
          ? "This page was open from before the update. Reload it and try again."
          : <>I&apos;ve been notified and I&apos;ll fix it. Give it another try in a bit.</>}
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <button
          onClick={() => (stale ? window.location.reload() : reset())}
          className="rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white"
        >
          {stale ? "Reload page" : "Try again"}
        </button>
        <Link href="/" className="rounded-lg border border-line px-4 py-2 text-sm font-semibold">
          Back to jobs
        </Link>
      </div>
      <CallJoshLine lead="Stuck? Call or text me:" className="mt-8" />
    </div>
  );
}
