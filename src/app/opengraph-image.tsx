import { ImageResponse } from "next/og";
import { OG_SIZE, OgCard } from "@/lib/og";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Braun Board: Great OTE. How many reps earn it? B2B sales jobs with the real pay.";

export default function Image() {
  return new ImageResponse(
    <OgCard title="Great OTE. How many reps earn it?" line="Big OTE on paper. Find out if reps earn it." sub="See the pay, what they really sell, and what to ask before you say yes." />,
    size,
  );
}
