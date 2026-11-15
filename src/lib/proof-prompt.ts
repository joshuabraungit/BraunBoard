// The Proof page prompt. The Toolkit page shows the blank version; the job page's
// Reach out box fills in what Braun Board already knows about that job.

export interface ProofJob {
  title: string;
  company: string;
  url: string;
  sells?: string | null;
  buyer?: string | null;
}

const JOB_LINE = "- The job posting: [paste]";

export const PROOF_PROMPT = `I'm applying for a sales role and want a one-page website to send the hiring manager. Build it as an artifact so I can publish it and share the link.

Rules
- Use only the facts I give you. Never invent numbers, results, companies or experience.
- Only use testimonials I paste, word for word. Never write, edit or shorten a quote.
- If something's missing, ask me before you build. One question at a time.
- Anyone with the link can see this page. Include the contact info I give you, but never my home address or anything else private.

Here's what I have
${JOB_LINE}
- The hiring manager's name: [name]
- My résumé: [paste]
- My best numbers (attainment, deal size, pipeline): [paste]
- Two or three testimonials, with each person's name and title: [paste]
- What I noticed about the company: [paste]
- How to reach me (email, phone, LinkedIn): [paste]
- A link to my headshot, if I have one online: [paste link]

Build the page in this order
1. A headline written to the hiring manager about their problem, not my job search.
2. Why this company, in two sentences, starting from what I noticed.
3. My proof: up to four numbers, no adjectives.
4. What others say: my testimonials, word for word, with name and title.
5. The work: five companies I'd target, each with a reason to reach out now. If you can search the web, research them. If not, ask me for them. Tell me where each reason came from so I can check it. Then write one sample email to one of them: short, curious, no pitch, ending with a question.
6. My first 90 days, in three steps.
7. A close with one ask, "Book 15 minutes," and an easy out, like "If it's not a fit, no hard feelings."

Put my contact info near the top and again at the bottom, so it's easy to reach me.

If I gave you a link to my headshot, show it at the top in a circle next to my name. If not, show my initials in a circle instead.

Make it clean, simple and mobile-friendly. Short enough to read in 60 seconds.`;

/** The same prompt with the job already filled in. */
export function proofPromptFor(job: ProofJob): string {
  const lines = [`- The job: ${job.title} at ${job.company}. Posting: ${job.url} (if you can't open links, ask me to paste it)`];
  if (job.sells) lines.push(`- What they sell, in plain English: ${job.sells}`);
  if (job.buyer) lines.push(`- Who I'd sell to: ${job.buyer}`);
  return PROOF_PROMPT.replace(JOB_LINE, lines.join("\n"));
}
