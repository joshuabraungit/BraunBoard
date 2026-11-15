// One-off email: the Reach out box on every job (Nov 2026).
export const campaign = "reach-out-2026-11";
export const subject = "Don't just apply";

// Sends on its own from the hourly runner: Monday Nov 16, 9am ET (a day apart from Tuesday's Picks).
// Only within 24 hours of this time, so later signups don't get it.
export const sendAt = "2026-11-16T14:00:00Z";

export const button = "Pick a job";
export const jobUrl = "https://www.braunboard.com/jobs";

// Each block is a paragraph. "## " starts a bold mini-heading. [text](url) makes a link.
export const blocks: string[] = [
  "Hey,",
  "Quick one.",
  "When you apply for a job, so does everyone else. The hiring manager ends up with a stack of résumés that all start to look the same.",
  "So I added something to every job on Braun Board. It's called Reach out.",
  "It helps you prospect the job the way you'd prospect a buyer:",
  "## 1. Find the right person.",
  "See who likely owns the hire, with a one-tap LinkedIn search.",
  "## 2. Send a cold email.",
  "A short note written for that job, ready to copy.",
  "## 3. Show proof you can do the work.",
  "You get a prompt with the job already filled in. Paste it into Claude, add your résumé and numbers, and it builds a one-page website for that company: the companies you'd go after, why now, the email you'd send them, and your first 90 days.",
  "You still apply. You just don't stop there.",
  "## How to find it",
  "Open any job on Braun Board and scroll to \"Reach out to the hiring manager.\" If you're not signed in, it'll ask for your email first.",
  "[[LINK]]",
  "If you try it, hit reply and tell me how it went.",
  "Josh",
  "P.S. Want to see what a finished page looks like? [Here's an example](https://www.braunboard.com/examples/proof-page.html).",
];
