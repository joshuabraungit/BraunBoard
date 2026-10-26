import { ImageResponse } from "next/og";
import { OG_SIZE, OgCard } from "@/lib/og";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Braun Board: B2B sales jobs, with the pay and what the posting leaves out";

export default function Image() {
  return new ImageResponse(
    <OgCard title="Find the sales job you'd actually take" line="See the pay and what they really sell." sub="Plus the questions to ask before you say yes." />,
    size,
  );
}
