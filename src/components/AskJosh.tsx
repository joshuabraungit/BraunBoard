"use client";

// The "Ask Josh" form. Used on /ask and on job pages (where the job rides along with the message).

import { useActionState, useId } from "react";
import { askJosh } from "@/app/ask/actions";
import type { AskStatus } from "@/lib/ask";

const ERRORS: Partial<Record<AskStatus, string>> = {
  invalid: "That email doesn't look right. Check it and try again?",
  short: "Tell me a little more so I can actually help.",
  slow: "You've sent a few already. Give it a bit and try again.",
  error: "Something broke on our end and it didn't send. Try again in a minute, or email josh@joshbraun.com.",
};

const field = "w-full rounded-lg border border-line-strong bg-bg px-3 py-2.5 text-[15px] focus:border-ink focus:outline-none";

export function AskJoshForm({
  source,
  job,
  defaultEmail = "",
}: {
  source: string;
  job?: { slug: string; company: string };
  defaultEmail?: string;
}) {
  const [status, action, pending] = useActionState<AskStatus | null, FormData>(askJosh, null);
  const id = useId();

  if (status === "ok") {
    return (
      <div role="status" className="rounded-lg bg-accent-soft px-4 py-3 text-[15px] text-accent">
        <p className="font-semibold">Got it. It&apos;s in my inbox.</p>
        <p className="mt-1">I read every one. If I reply, it&apos;ll come from my own email, so keep an eye out.</p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="source" value={source} />
      {job && <input type="hidden" name="job" value={job.slug} />}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />

      <div>
        <label htmlFor={`${id}-message`} className="mb-1 block text-sm font-semibold">
          Your question
        </label>
        <textarea
          id={`${id}-message`}
          name="message"
          required
          minLength={10}
          maxLength={3000}
          rows={4}
          className={field}
          placeholder={
            job
              ? `e.g. ${job.company} offered me the job. Is the OTE realistic? What should I push on?`
              : "e.g. I got an offer and I'm not sure about the comp plan. What should I ask before I sign?"
          }
        />
      </div>

      <details className="group">
        <summary className="cursor-pointer text-sm font-semibold text-ink-2 hover:text-ink">+ Add offer details (optional)</summary>
        <label htmlFor={`${id}-offer`} className="sr-only">
          Offer details
        </label>
        <textarea
          id={`${id}-offer`}
          name="offer"
          maxLength={2000}
          rows={3}
          className={`${field} mt-2`}
          placeholder="Base, OTE, quota, ramp, territory, anything they told you."
        />
      </details>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor={`${id}-name`} className="mb-1 block text-sm font-semibold">
            First name <span className="font-normal text-ink-3">(optional)</span>
          </label>
          <input id={`${id}-name`} name="name" autoComplete="given-name" maxLength={100} className={field} />
        </div>
        <div>
          <label htmlFor={`${id}-email`} className="mb-1 block text-sm font-semibold">
            Your email
          </label>
          <input id={`${id}-email`} name="email" type="email" required autoComplete="email" defaultValue={defaultEmail} className={field} placeholder="you@email.com" />
        </div>
      </div>

      {status && ERRORS[status] && (
        <p role="alert" className="text-sm text-red">
          {ERRORS[status]}
        </p>
      )}

      <button disabled={pending} className="inline-flex min-h-11 items-center rounded-lg bg-ink px-4 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60">
        {pending ? "Sending…" : "Send to Josh →"}
      </button>
      <p className="text-xs text-ink-3">Goes straight to my inbox. I never share it with employers or recruiters.</p>
    </form>
  );
}
