import Image from "next/image";
import Link from "next/link";

// Josh's letter on why he built Braun Board. Bottom of the home page.
export function FounderLetter() {
  return (
    <section aria-labelledby="letter-title" className="mx-auto mt-20 max-w-2xl px-2 sm:px-0">
      <h2 id="letter-title" className="sr-only">Why I built Braun Board</h2>
      {/* A small stack of paper: two sheets peeking out behind the letter, each at its own angle. */}
      <div className="relative">
        <div aria-hidden className="absolute inset-0 translate-x-[-6px] translate-y-[10px] rotate-[-2.2deg] rounded-[3px] bg-surface shadow-[0_2px_10px_rgba(22,20,15,0.10)]" />
        <div aria-hidden className="absolute inset-0 translate-x-[5px] translate-y-[4px] rotate-[1.4deg] rounded-[3px] bg-surface shadow-[0_2px_12px_rgba(22,20,15,0.10)]" />
      <div className="relative rotate-[-0.6deg] rounded-[3px] bg-surface px-6 py-10 shadow-[0_18px_40px_-18px_rgba(22,20,15,0.35),0_2px_6px_rgba(22,20,15,0.06)] sm:px-14 sm:py-16">
        <div className="rotate-[0.6deg] space-y-5 text-[17px] leading-relaxed text-ink sm:text-[18px]">
          <p>Hi there.</p>
          <p>Sales can be a great job. You get paid to be curious. You help people fix real problems. When it goes well, you earn a good living.</p>
          <p>But finding a good sales job is hard.</p>
          <p>
            The postings all sound the same. &ldquo;Competitive compensation.&rdquo; &ldquo;Uncapped commission.&rdquo; What you need to know is missing. What&apos;s the
            quota? How many reps hit it?
          </p>
          <p>
            In October I had AI read 1,473 rep postings.{" "}
            <Link href="/report/october-2026" className="underline decoration-line-strong underline-offset-2 hover:decoration-ink">One said how many reps hit quota.</Link>{" "}
            One.
          </p>
          <p>
            And then there&apos;s the product. The product is the job. It&apos;s what you&apos;ll talk about on every call, to every person who says &ldquo;we&apos;re
            fine with what we have.&rdquo; If you can&apos;t explain it, you can&apos;t sell it.
          </p>
          <p>Yet half the time you can&apos;t figure out what a company sells, even after reading the posting twice.</p>
          <p>That&apos;s why I built Braun Board.</p>
          <p>
            You can <Link href="/products" className="underline decoration-line-strong underline-offset-2 hover:decoration-ink">see what you&apos;d sell</Link>, not just the title. Every company gets a short note on what it sells, in plain English. So you ask
            the most important question first: would I be excited to sell this?
          </p>
          <p>
            Then every job gets the Braun Read. It&apos;s what I&apos;d look for if you sent me the posting. A verdict, from &ldquo;strong posting&rdquo; to &ldquo;proceed
            with caution.&rdquo; The pay, when it&apos;s posted. The red lights and the green ones. What the posting leaves out. And the questions to ask on the first
            call.
          </p>
          <p>
            The job you take shapes your next few years. You should know what you&apos;re walking into before the first interview, not after the first quarter.
          </p>
          <p>It&apos;s free. Hope it helps.</p>
        </div>
        <div className="mt-8 rotate-[0.6deg]">
          {/* Josh's own signature. */}
          <Image src="/josh-signature.png" alt="" aria-hidden width={640} height={320} priority className="-ml-2 h-auto w-[170px] sm:w-[200px]" />
          <div className="mt-4 flex items-center gap-3">
            <Image src="/josh-braun.png" alt="Josh Braun" width={52} height={52} className="h-[52px] w-[52px] rounded-full" priority />
            <div>
              <p className="font-semibold leading-tight">Josh Braun</p>
              <p className="text-sm italic text-ink-2">Founder, Braun Board</p>
              <p className="text-sm text-ink-2">
                <a href="tel:+19546950844" className="underline decoration-line-strong underline-offset-2 hover:decoration-ink">954-695-0844</a>
              </p>
            </div>
          </div>
        </div>
      </div>
      </div>
    </section>
  );
}
