import { listJobs } from "@/lib/data";
import { JobGrid } from "@/components/JobCard";

export const dynamic = "force-dynamic";

export default async function NewToday() {
  const jobs = await listJobs({ postedWithinDays: 1 }, 120);
  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight">New Today</h1>
      <p className="mb-6 mt-1 text-sm text-ink-2">Sales jobs Braun Board discovered in the last 24 hours.</p>
      <JobGrid jobs={jobs} empty="Nothing new in the last 24 hours. Check back after the next refresh." />
    </>
  );
}
