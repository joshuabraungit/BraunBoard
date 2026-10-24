// Diagnostic: prints the pay text Ashby shows on specific postings, to check base vs OTE labels.
const jobs: [string, string][] = [
  ["ambiencehealthcare", "54a833ea-83a0-4ac1-9b73-ace9c07ec5a5"],
  ["rasa", "37a06471-7636-4cdb-b952-80924b43b1ea"],
  ["taktile", "0862c6a1-cf8f-41c3-a88c-eafaec03bc15"],
  ["uipath", "153746e3-5302-4163-8f53-8550d9a15fc9"],
  ["vanta", "0ab177a8-3ea8-4b91-9a55-bfef435b0cfc"],
  ["creatoriq", "ce50a415-ad32-46fa-af6c-d8fffa4e9a8a"],
];
async function main() {
  for (const [org, id] of jobs) {
    const r = await fetch(`https://api.ashbyhq.com/posting-api/job-board/${org}?includeCompensation=true`);
    const d = (await r.json()) as { jobs: { id: string; title: string; compensation?: { compensationTierSummary?: string; scrapeableCompensationSalarySummary?: string; summaryComponents?: unknown } }[] };
    const j = d.jobs.find((x) => x.id === id);
    console.log(`::notice::${org} | ${j?.title} | tier: ${j?.compensation?.compensationTierSummary} | salary: ${j?.compensation?.scrapeableCompensationSalarySummary} | parts: ${JSON.stringify(j?.compensation?.summaryComponents)?.slice(0, 400)}`);
  }
}
main();
