import { ImageResponse } from "next/og";
import { getJob } from "@/lib/data";
import { formatComp, formatLocation } from "@/lib/format";
import { OG_SIZE, OgCard } from "@/lib/og";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Braun Board job preview";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const job = await getJob(slug).catch(() => null);
  if (!job) return new ImageResponse(<OgCard title="B2B sales jobs, with the pay up front" />, size);
  const pay = formatComp(job);
  return new ImageResponse(
    <OgCard kicker={job.company_name} title={job.title_raw} line={pay || "Pay not posted. Here's what to ask."} sub={formatLocation(job)} />,
    size,
  );
}
