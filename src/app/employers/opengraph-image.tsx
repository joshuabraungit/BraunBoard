import { ImageResponse } from "next/og";
import { OG_SIZE, OgCard } from "@/lib/og";
import { formatPrice, sponsorPriceCents } from "@/lib/sponsor-form";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Braun Board for employers: your sales job, in front of sellers who already have one";

export default function Image() {
  const cents = sponsorPriceCents();
  return new ImageResponse(
    <OgCard
      kicker="For employers"
      title="Your sales job, in front of sellers who already have one."
      line={cents ? `${formatPrice(cents)}. One payment.` : "One payment."}
      sub="Plain-English rewrite. 30 days pinned. Shared on LinkedIn."
      footer="braunboard.com/employers · Sponsor a sales job"
    />,
    size,
  );
}
