import Link from "next/link";

// Josh's letter on why he built Braun Board. Bottom of the home page.
export function FounderLetter() {
  return (
    <section aria-labelledby="letter-title" className="mx-auto mt-16 max-w-2xl">
      <h2 id="letter-title" className="sr-only">Why I built Braun Board</h2>
      <div className="rotate-[-0.4deg] rounded-sm border border-line bg-surface px-6 py-10 shadow-[0_10px_30px_-12px_rgba(22,20,15,0.25)] sm:px-14 sm:py-14">
        <div className="rotate-[0.4deg] space-y-5 text-[17px] leading-relaxed text-ink">
          <p>Hi there.</p>
          <p>Sales can be a great job. You get paid to be curious. You help people fix real problems. When it goes well, you earn a good living.</p>
          <p>But finding a good sales job is hard.</p>
          <p>
            The postings all sound the same. &ldquo;Competitive compensation.&rdquo; &ldquo;Uncapped commission.&rdquo; What you actually need to know is missing.
            What&apos;s the quota? How many reps hit it?
          </p>
          <p>
            This October I had AI read 1,473 rep postings.{" "}
            <Link href="/report/october-2026" className="underline decoration-line-strong underline-offset-2 hover:decoration-ink">One said how many reps hit quota.</Link>{" "}
            One.
          </p>
          <p>And then there&apos;s the product.</p>
          <p>
            Most job searches start with the title. But the product is the job. It&apos;s what you&apos;ll talk about on every call, in every email, to every person who
            says &ldquo;we&apos;re fine with what we have.&rdquo;
          </p>
          <p>If you don&apos;t understand it, you can&apos;t explain it. If you can&apos;t explain it, you can&apos;t sell it. And if you don&apos;t believe in it, buyers can tell.</p>
          <p>Yet half the time you can&apos;t figure out what a company sells, even after reading the posting twice.</p>
          <p>That&apos;s why I built Braun Board.</p>
          <p>
            It&apos;s a job board just for B2B salespeople. You can{" "}
            <Link href="/products" className="underline decoration-line-strong underline-offset-2 hover:decoration-ink">shop by product</Link>, not just title. Every
            company gets a short note on what it sells, in plain English. So you can ask the most important question first: would I be excited to sell this?
          </p>
          <p>Then you get the pay when it&apos;s posted, what the posting leaves out, and the questions to ask before you say yes.</p>
          <p>It&apos;s free. Hope it helps.</p>
        </div>
        <div className="mt-10 rotate-[0.4deg]">
          <p className="font-serif text-3xl italic tracking-tight text-ink">Josh Braun</p>
          <p className="mt-1 text-sm text-ink-2">Founder, Braun Board</p>
        </div>
      </div>
    </section>
  );
}
