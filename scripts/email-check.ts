// Diagnostic: is Ask Josh mail actually reaching the inbox? Sends one test and reports
// what the email service says happened to it and to recent Ask Josh emails.
// Prints no addresses other than the Ask Josh inbox.

const key = process.env.RESEND_API_KEY;
const to = process.env.ASK_TO || "josh@joshbraun.com";
const addr = /<([^>]+)>/.exec(process.env.ALERTS_FROM ?? "")?.[1] ?? "alerts@braunboard.com";
const H = { Authorization: `Bearer ${key}`, "content-type": "application/json" };
const note = (s: string) => console.log(`::notice::${s}`);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  if (!key) return note("No RESEND_API_KEY");
  note(`Sending from ${addr} to ${to}`);
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: H,
    body: JSON.stringify({
      from: `Ask Josh via Braun Board <${addr}>`,
      to: [to],
      subject: `Ask Josh: delivery test ${new Date().toISOString().slice(0, 16)}`,
      text: "This is a test from Claude to check that Ask Josh emails reach your inbox. No one wrote in.",
    }),
  });
  const sent = (await r.json()) as { id?: string; message?: string };
  note(`Send: HTTP ${r.status} ${sent.id ?? sent.message ?? ""}`);

  const dom = await fetch("https://api.resend.com/domains", { headers: H }).then((x) => x.json()).catch(() => null) as { data?: { name: string; status: string }[] } | null;
  for (const d of dom?.data ?? []) note(`Domain ${d.name}: ${d.status}`);

  await sleep(45_000);
  if (sent.id) {
    const e = (await fetch(`https://api.resend.com/emails/${sent.id}`, { headers: H }).then((x) => x.json())) as { last_event?: string };
    note(`Test email status: ${e.last_event}`);
  }
  const list = (await fetch("https://api.resend.com/emails?limit=100", { headers: H }).then((x) => x.json()).catch(() => null)) as
    | { data?: { subject: string; to: string[]; last_event: string; created_at: string }[]; message?: string }
    | null;
  if (!list?.data) return note(`Couldn't list emails: ${list?.message ?? "no data"}`);
  for (const e of list.data.filter((e) => e.subject?.startsWith("Ask Josh"))) {
    note(`${e.created_at.slice(0, 16)} | to ${e.to.includes(to) ? to : "someone else"} | ${e.last_event} | ${e.subject.slice(0, 60)}`);
  }
}
main();
