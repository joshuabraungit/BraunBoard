// Josh's phone number. A thin strip on top of every page, plus an inline line for
// the Ask Josh spots. Tapping the number on a phone opens the dialer.

import { PHONE_DISPLAY, PHONE_SMS, PHONE_TEL } from "@/lib/contact";

/** The strip above the header. */
export function CallJoshBar() {
  return (
    <div className="bg-ink text-white">
      <p className="mx-auto max-w-6xl px-4 py-1.5 text-center text-[13px] leading-snug">
        <span className="hidden sm:inline">Job boards don&apos;t pick up the phone. I do. </span>
        Call or text me:{" "}
        <a href={PHONE_TEL} className="whitespace-nowrap font-bold underline underline-offset-2 hover:no-underline">
          {PHONE_DISPLAY}
        </a>
        <span className="hidden sm:inline"> · Josh</span>
      </p>
    </div>
  );
}

/** One line for under the Ask Josh form and other "talk to me" spots. */
export function CallJoshLine({ lead = "Rather talk it through? Call or text me:", className = "" }: { lead?: string; className?: string }) {
  return (
    <p className={`text-sm text-ink-2 ${className}`}>
      {lead}{" "}
      <a href={PHONE_TEL} className="whitespace-nowrap font-semibold text-ink underline underline-offset-2">
        {PHONE_DISPLAY}
      </a>{" "}
      <a href={PHONE_SMS} className="text-ink-3 underline underline-offset-2 sm:hidden">
        (text)
      </a>
    </p>
  );
}
