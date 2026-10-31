import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { AdText } from "@/components/AdText";
import { CompanyLogo } from "@/components/CompanyLogo";
import { sponsorWhere } from "@/components/SponsoredCard";
import { getOrderByReviewToken, logoUrl, markReviewOpened, reviewFields, videoUrl } from "@/lib/sponsor";
import { adPlainText } from "@/lib/ad-text";
import { payLine } from "@/lib/sponsor-form";
import { adHash, adReview, videoReview } from "@/lib/sponsor-review";
import { getUser } from "@/lib/session";
import { isAdmin } from "@/lib/admin";
import { ReviewClient } from "./ReviewClient";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ token: string }> };

export const metadata: Metadata = {
  title: "Review your post · Braun Board",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function ReviewPage({ params }: Props) {
  const { token } = await params;
  const o = await getOrderByReviewToken(token);
  if (!o) notFound();

  // Josh peeking at his own link shouldn't count as the client opening it.
  if (!isAdmin(await getUser())) await markReviewOpened(o.id);

  const f = reviewFields(o);
  const first = o.contact_name.trim().split(/\s+/)[0];
  const vid = videoReview(f);

  const card = (
    <div className="rounded-xl border-[1.5px] border-amber/40 bg-surface p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="rounded-full bg-amber-soft px-2.5 py-0.5 text-xs font-semibold text-amber">Sponsored</span>
        <span className="text-xs text-ink-3">Hiring now</span>
      </div>
      <div className="flex items-start gap-3">
        <CompanyLogo name={o.company} logoUrl={logoUrl(o.logo_path)} domain={null} size={44} />
        <div className="min-w-0 flex-1">
          <p className="text-[17px] font-bold leading-snug tracking-tight">{o.job_title}</p>
          <p className="mt-0.5 text-sm text-ink-2">
            {o.company} · {sponsorWhere(o)}
          </p>
          <p className="mt-2 text-[15px] font-semibold text-accent">{payLine(o)}</p>
          {o.product_short && (
            <p className="mt-2 text-sm">
              <span className="text-ink-3">What they sell: </span>
              <span className="font-semibold">{o.product_short}</span>
            </p>
          )}
          <p className="mt-2 line-clamp-3 text-[15px] leading-relaxed text-ink-2">{adPlainText(o.description)}</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="mx-auto max-w-2xl">
      <div className="rounded-2xl border border-line bg-surface p-5 sm:p-7">
        <div className="flex items-center gap-3">
          <Image src="/josh-braun.png" alt="Josh Braun" width={56} height={56} className="h-14 w-14 rounded-full" priority />
          <div>
            <p className="text-[17px] font-semibold">Hi {first},</p>
            <p className="text-sm text-ink-2">From Josh Braun</p>
          </div>
        </div>
        <p className="mt-4 text-[16px] leading-relaxed">
          Here&apos;s your {o.company} post. Give each piece a thumbs up if you love it. Thumbs down if it needs work, and tell me why. Takes about 5 minutes.
        </p>
      </div>

      <ReviewClient
        token={token}
        firstName={first}
        video={
          o.video_path && vid
            ? { src: videoUrl(o.video_path)!, path: o.video_path, status: vid.status, note: vid.note }
            : null
        }
        ad={{ hash: adHash(f), ...adReview(f) }}
        adCard={card}
        adBody={<AdText text={o.description} />}
      />
    </div>
  );
}
