// What the tools know about a job: the same facts the job page shows, in one block of text.
import type { JobView } from "../data";
import type { ProductCompany } from "../products";

export type ToolJob = Pick<
  JobView,
  "slug" | "title_raw" | "company_id" | "company_name" | "company_domain" | "description_raw" | "buyer" | "summary" | "role_family" | "seniority" | "sales_motion" | "self_sourcing_level"
> & { role_plain?: string | null };

export function jobContext(job: ToolJob, product: Pick<ProductCompany, "short" | "story"> | null): string {
  return [
    `Job title: ${job.title_raw}`,
    `Company: ${job.company_name}${job.company_domain ? ` (${job.company_domain})` : ""}`,
    `Role type: ${job.role_family}, ${job.seniority}, ${job.sales_motion}`,
    product?.short || product?.story ? `What you'd sell: ${[product.short, product.story].filter(Boolean).join(". ")}` : "",
    job.buyer ? `Who you'd sell to: ${job.buyer}` : "",
    job.role_plain || job.summary ? `What you'd do: ${job.role_plain ?? job.summary}` : "",
    `The posting:\n${(job.description_raw ?? "").slice(0, 12000)}`,
  ]
    .filter(Boolean)
    .join("\n");
}
