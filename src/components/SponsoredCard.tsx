import Link from "next/link";
import { CompanyLogo } from "./CompanyLogo";
import { logoUrl, reviewFields, videoUrl, type SponsoredJobRow } from "@/lib/sponsor";
import { videoApproved } from "@/lib/sponsor-review";
import { attainmentBadge, payLine } from "@/lib/sponsor-form";
import { adPlainText } from "@/lib/ad-text";

export const sponsorWhere = (s: Pick<SponsoredJobRow, "remote_type" | "location">) =>
  s.remote_type === "Remote" ? ["Remote", s.location].filter(Boolean).join(", ") : [s.location, s.remote_type === "Hybrid" ? "Hybrid" : null].filter(Boolean).join(" · ");

/** Same look as the attainment badge on regular job cards. Nothing when the buyer didn't share it. */
export function AttainmentBadge({ pct }: { pct: number | null | undefined }) {
  const b = attainmentBadge(pct);
  if (!b) return null;
  return (
    <span
      className={`inline-block rounded border px-1.5 py-0.5 text-xs font-semibold ${b.good ? "border-accent/25 bg-accent-soft text-accent" : "border-line-strong bg-surface text-ink-2"}`}
    >
      {b.good ? "✓ " : ""}
      {b.text}
    </span>
  );
}

/** For a sponsor's first dedicated sales hire: no team yet, so no hit-OTE number. Green, framed as the upside. */
export function FirstHireBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded border border-accent/25 bg-accent-soft px-1.5 py-0.5 text-xs font-semibold text-accent">
      <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 21h18" />
        <path d="M5 21V10l7-6 7 6v11" />
      </svg>
      Ground floor: first sales hire
    </span>
  );
}

/** The line under pay: the shared hit-OTE number, else the first-hire badge, else nothing. */
export function OteBadge({ s }: { s: Pick<SponsoredJobRow, "ote_attainment_pct" | "first_sales_hire"> }) {
  if (s.ote_attainment_pct != null) return <AttainmentBadge pct={s.ote_attainment_pct} />;
  if (s.first_sales_hire) return <FirstHireBadge />;
  return null;
}

/** "What you'd sell" and "Who you'd sell to", worded like the regular job cards. */
export function SellLines({ s }: { s: Pick<SponsoredJobRow, "product_short" | "buyer_short"> }) {
  if (!s.product_short && !s.buyer_short) return null;
  return (
    <div className="mt-2.5 space-y-0.5 text-sm">
      {s.product_short && (
        <p>
          <span className="text-ink-3">What you&apos;d sell: </span>
          <span className="font-semibold">{s.product_short}</span>
        </p>
      )}
      {s.buyer_short && (
        <p>
          <span className="text-ink-3">Who you&apos;d sell to: </span>
          <span className="font-semibold">{s.buyer_short}</span>
        </p>
      )}
    </div>
  );
}

/**
 * The sponsored owl: the editorial owl's cousin, hanging on to the top edge of the card. Gold-framed
 * sunglasses instead of green reading glasses, so a paid card never looks like the editor vouching for it.
 * Taps his claws (globals.css .owl-claws-*).
 */
function PeekingOwl() {
  return (
    <svg
      viewBox="70 55 260 180"
      aria-hidden="true"
      className="pointer-events-none absolute -top-[54px] left-[128px] z-10 h-[58px] w-[84px] sm:-top-[66px] sm:left-44 sm:h-[70px] sm:w-[101px]"
    >
      <defs>
        <clipPath id="sponsor-owl-clip">
          <rect x="0" y="0" width="400" height="226" />
        </clipPath>
      </defs>
      <g clipPath="url(#sponsor-owl-clip)">
        <path d="M110 120 L100 62 L156 96 Z" fill="#16140f" />
        <path d="M290 120 L300 62 L244 96 Z" fill="#16140f" />
        <ellipse cx="200" cy="215" rx="125" ry="128" fill="#16140f" />
        <circle cx="158" cy="172" r="44" fill="#faf8f4" />
        <circle cx="242" cy="172" r="44" fill="#faf8f4" />
        <g stroke="#c98a1a" strokeWidth="6" strokeLinejoin="round">
          <path d="M110 152 H196 V174 Q196 206 164 206 H142 Q110 206 110 174 Z" fill="#1d1a14" />
          <path d="M204 152 H290 V174 Q290 206 258 206 H236 Q204 206 204 174 Z" fill="#1d1a14" />
          <path d="M196 160 Q200 154 204 160" fill="none" strokeLinecap="round" />
        </g>
        <g stroke="#ffffff" strokeLinecap="round" opacity="0.75">
          <path d="M124 163 L140 179" strokeWidth="5" />
          <path d="M138 162 L146 170" strokeWidth="3" />
          <path d="M218 163 L234 179" strokeWidth="5" />
          <path d="M232 162 L240 170" strokeWidth="3" />
        </g>
        <path d="M186 210 L214 210 L200 226 Z" fill="#c98a1a" />
      </g>
      <g className="owl-claws-l" fill="#c98a1a">
        <ellipse cx="108" cy="224" rx="9" ry="12" />
        <ellipse cx="128" cy="226" rx="9" ry="12" />
        <ellipse cx="148" cy="224" rx="9" ry="12" />
      </g>
      <g className="owl-claws-r" fill="#c98a1a">
        <ellipse cx="252" cy="224" rx="9" ry="12" />
        <ellipse cx="272" cy="226" rx="9" ry="12" />
        <ellipse cx="292" cy="224" rx="9" ry="12" />
      </g>
    </svg>
  );
}

/** The owl's line, in a speech bubble beside his head. Two lines on phones so it stays on screen (globals.css .owl-say). */
function OwlSays() {
  return (
    <p className="owl-say pointer-events-none absolute -top-[58px] left-[222px] z-10 m-0 rounded-[14px] bg-surface px-2.5 py-1.5 text-xs font-bold leading-[1.3] whitespace-nowrap text-ink sm:-top-[58px] sm:left-[286px] sm:px-[13px] sm:py-[7px] sm:text-sm">
      I&rsquo;d apply, but
      <br className="sm:hidden" /> I don&rsquo;t have thumbs.
    </p>
  );
}

/** A still from the approved explainer video. The whole card links to the job page, where it plays. */
function VideoTeaser({ src }: { src: string }) {
  return (
    <div className="relative mt-4 overflow-hidden rounded-xl bg-ink sm:mt-0 sm:w-52 sm:shrink-0">
      <video src={`${src}#t=1`} muted playsInline preload="metadata" aria-hidden="true" className="pointer-events-none aspect-video w-full object-cover opacity-90 sm:aspect-square" />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-ink/20 transition group-hover:bg-ink/10">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-[0_4px_18px_rgba(0,0,0,0.3)] transition group-hover:scale-105">
          <svg viewBox="0 0 24 24" className="ml-1 h-5 w-5 fill-ink" aria-hidden="true">
            <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z" />
          </svg>
        </span>
        <span className="rounded-full bg-ink/70 px-2.5 py-0.5 text-xs font-semibold text-white">Watch: what you&apos;d sell</span>
      </div>
    </div>
  );
}

/**
 * Paid placement at the top of the home page. Always labeled. No Braun Read: Josh doesn't grade jobs he's paid to show.
 * `peek` puts the owl on the card's top edge; the home page gives it to the first sponsor only.
 */
export function SponsoredCard({ s, peek = false }: { s: SponsoredJobRow; peek?: boolean }) {
  const video = s.video_path && videoApproved(reviewFields(s)) ? videoUrl(s.video_path) : null;
  return (
    <article
      className={`group relative rounded-2xl border-[1.5px] border-amber/40 bg-surface transition hover:border-amber/70 hover:shadow-[0_2px_12px_rgba(22,20,15,0.05)] ${peek ? "mt-14 sm:mt-16" : ""}`}
    >
      {peek && <PeekingOwl />}
      {peek && <OwlSays />}
      <div className="flex items-center justify-between gap-3 rounded-t-[14px] bg-amber-soft px-5 py-2.5 sm:px-6">
        <span className="text-xs font-semibold uppercase tracking-wide text-amber">Sponsored</span>
        <span className="flex items-center gap-2 text-xs font-semibold text-amber">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-[#4cae73] opacity-70 motion-safe:animate-ping" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[#2f8f57]" />
          </span>
          Hiring now
        </span>
      </div>
      <div className="p-5 sm:flex sm:gap-6 sm:p-6">
        <div className="flex min-w-0 flex-1 items-start gap-4">
          <CompanyLogo name={s.company} logoUrl={logoUrl(s.logo_path)} domain={null} size={44} />
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-bold leading-snug tracking-tight">
              <Link href={`/sponsored/${s.id}`} className="after:absolute after:inset-0 after:z-20">
                {s.job_title}
              </Link>
            </h3>
            <p className="mt-0.5 text-sm text-ink-2">
              {s.company} · {sponsorWhere(s)}
            </p>
            <p className="mt-2.5 text-[15px] font-semibold text-accent">
              {payLine(s)
                .split(" · ")
                .map((part, i) => (
                  <span key={part} className="whitespace-nowrap">
                    {i > 0 && " · "}
                    {part}
                  </span>
                ))}
            </p>
            {(s.ote_attainment_pct != null || s.first_sales_hire) && (
              <p className="mt-2">
                <OteBadge s={s} />
              </p>
            )}
            <SellLines s={s} />
            <p className="mt-2 line-clamp-3 text-[15px] leading-relaxed text-ink-2">{adPlainText(s.description)}</p>
          </div>
        </div>
        {video && <VideoTeaser src={video} />}
      </div>
      <div className="flex justify-end px-5 pb-5 sm:px-6 sm:pb-6">
        <span className="inline-flex min-h-10 items-center rounded-lg bg-ink px-4 text-sm font-semibold text-white group-hover:opacity-90">
          See the job →
        </span>
      </div>
    </article>
  );
}
