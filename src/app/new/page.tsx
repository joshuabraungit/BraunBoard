import type { Metadata } from "next";
import { listJobs } from "@/lib/data";
import { JOB_TABS, PageTabs } from "@/components/PageTabs";
import { JobGrid } from "@/components/JobCard";
import { getUserState } from "@/lib/session";
import { MARKET_CHOICES, marketsFor, visitorMarket } from "@/lib/market";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "New sales jobs posted today · Braun Board",
  description: "B2B sales jobs posted in the last day, with the pay and what the company sells in plain English.",
  alternates: { canonical: "/new" },
};

export default async function NewToday() {
  const market = await visitorMarket();
  const [jobs, state] = await Promise.all([listJobs({ postedWithinDays: 1, markets: marketsFor(market) }, 120), getUserState()]);
  return (
    <>
      <PageTabs tabs={JOB_TABS} active="/new" />
      <h1 className="text-2xl font-bold tracking-tight">New Today</h1>
      <p className="mb-6 mt-1 text-sm text-ink-2">
        Sales jobs posted in the last 24 hours{market !== "all" && ` in ${MARKET_CHOICES[market].label}`}.{" "}
        <a href={`/jobs?posted=1&country=${market === "UK" ? "NA" : "UK"}`} className="underline">
          {market === "UK" ? "See US + Canada" : "See the UK"}
        </a>
      </p>
      <JobGrid jobs={jobs} ctx={{ savedJobIds: state.savedJobIds, back: "/new" }} empty="Nothing new in the last 24 hours. Check back after the next refresh." />
    </>
  );
}
