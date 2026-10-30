import Link from "next/link";
import { CompanyLogo } from "./CompanyLogo";
import { logoUrl, type SponsoredJobRow } from "@/lib/sponsor";
import { payLine } from "@/lib/sponsor-form";

export const sponsorWhere = (s: Pick<SponsoredJobRow, "remote_type" | "location">) =>
  s.remote_type === "Remote" ? ["Remote", s.location].filter(Boolean).join(", ") : [s.location, s.remote_type === "Hybrid" ? "Hybrid" : null].filter(Boolean).join(" · ");

/** Paid placement at the top of the home page. Always labeled. No Braun Read: Josh doesn't grade jobs he's paid to show. */
export function SponsoredCard({ s }: { s: SponsoredJobRow }) {
  return (
    <article className="group relative rounded-2xl border-[1.5px] border-amber/40 bg-surface p-5 transition hover:border-amber/70 hover:shadow-[0_2px_12px_rgba(22,20,15,0.05)] sm:p-6">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="rounded-full bg-amber-soft px-2.5 py-0.5 text-xs font-semibold text-amber">Sponsored</span>
        <span className="text-xs text-ink-3">Hiring now</span>
      </div>
      <div className="flex items-start gap-4">
        <CompanyLogo name={s.company} logoUrl={logoUrl(s.logo_path)} domain={null} size={44} />
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-bold leading-snug tracking-tight">
            <Link href={`/sponsored/${s.id}`} className="after:absolute after:inset-0">
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
          <p className="mt-2.5 line-clamp-3 text-[15px] leading-relaxed text-ink-2">{s.description}</p>
        </div>
      </div>
      <div className="mt-4 flex justify-end">
        <span className="inline-flex min-h-10 items-center rounded-lg bg-ink px-4 text-sm font-semibold text-white group-hover:opacity-90">
          See the job →
        </span>
      </div>
    </article>
  );
}
