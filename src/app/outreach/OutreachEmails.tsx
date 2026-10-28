"use client";

import { useState } from "react";
import { CopyButton } from "@/components/CopyButton";

type Beat = "obs" | "proof" | "bridge" | "ask" | "";
type Part = [Beat, string];

/** Highlight colors for the four beats. */
const BEAT_STYLE: Record<Exclude<Beat, "">, string> = {
  obs: "bg-[#e8f0fb] text-[#1d4f8a]",
  proof: "bg-accent-soft text-accent",
  bridge: "bg-[#f4ebfb] text-[#6a3a8f]",
  ask: "bg-fresh-soft text-fresh",
};
const DOT: Record<Exclude<Beat, "">, string> = {
  obs: "bg-[#1d4f8a]",
  proof: "bg-accent",
  bridge: "bg-[#6a3a8f]",
  ask: "bg-fresh",
};

interface FirstNote {
  tab: string;
  forWho: string;
  subjects: string[];
  email: Part[];
  linkedin: Part[];
  why: [Exclude<Beat, "">, string][];
}

const FIRST: FirstNote[] = [
  {
    tab: "Relevant experience",
    forWho: "For reps who've sold to a market like theirs.",
    subjects: ["Your founder-led sales shift", "Sold to ops leaders at your stage", "Logistics buyers"],
    email: [
      ["", "Hi Sarah,\n\n"],
      ["obs", "Your AE posting mentions expanding beyond founder-led sales."],
      ["", "\n\n"],
      ["proof", "At Acme, I joined at a similar stage. Over two years, I sourced 60% of my pipeline and closed $840K in new business selling to operations leaders."],
      ["", "\n\n"],
      ["bridge", "I noticed your recent customers include several regional logistics companies. That's a market I've spent the past three years selling into."],
      ["", "\n\n"],
      ["ask", "I applied through your site. Would that experience be relevant to what you're building?"],
      ["", "\n\nAlex"],
    ],
    linkedin: [
      ["", "Hi Sarah,\n\n"],
      ["obs", "Saw your AE posting mentions moving beyond founder-led sales."],
      ["", " "],
      ["proof", "I did that at Acme: sourced 60% of my pipeline and closed $840K."],
      ["", " "],
      ["bridge", "I've also sold into logistics, like several of your customers."],
      ["", "\n\n"],
      ["ask", "I applied. Worth a quick chat?"],
      ["", "\n\nAlex"],
    ],
    why: [
      ["obs", "Opens with their words, not yours. Quoting the posting proves you read it. Most applicants clearly didn't."],
      ["proof", "“Similar stage” lowers the risk. The real fear is “can this person do it here?” This answers it before they ask."],
      ["proof", "Specific numbers beat adjectives. “$840K” is believable. “Top performer” isn't."],
      ["ask", "Asks a question they can answer, not for their calendar."],
    ],
  },
  {
    tab: "Your numbers",
    forWho: "For reps with strong results in the same segment.",
    subjects: ["118% selling to finance teams your size", "Same market as your AE role", "Spend reconciliation"],
    email: [
      ["", "Hi Sarah,\n\n"],
      ["obs", "Saw you're hiring an AE to sell to finance teams at companies with 200 to 1,000 employees."],
      ["", "\n\n"],
      ["proof", "That's been my market for the past four years. Last year, I finished at 118% of a $900K quota, with an average deal size of $42K."],
      ["", "\n\n"],
      ["bridge", "I'm interested because your product addresses a problem I regularly heard CFOs describe: reconciling spend across disconnected systems."],
      ["", "\n\n"],
      ["ask", "I applied today. Worth a conversation?"],
      ["", "\n\nAlex"],
    ],
    linkedin: [
      ["", "Hi Sarah,\n\n"],
      ["obs", "Saw you're hiring an AE for finance teams at 200 to 1,000 person companies."],
      ["", " "],
      ["proof", "That's my market. Last year: 118% of a $900K quota, $42K average deal."],
      ["", " "],
      ["bridge", "I know the spend reconciliation problem well."],
      ["", "\n\n"],
      ["ask", "Applied today. Worth a conversation?"],
      ["", "\n\nAlex"],
    ],
    why: [
      ["obs", "Mirrors the job back. Same segment, same buyer. They pattern-match in seconds."],
      ["proof", "Brevity signals confidence. Strong results don't need a long pitch."],
      ["bridge", "“I'm interested because” previews how you'd talk to their customers."],
    ],
  },
  {
    tab: "An idea",
    forWho: "For reps willing to do real work before the interview.",
    subjects: ["5 restaurant groups expanding this quarter", "A prospecting trigger idea", "Your food waste interview"],
    email: [
      ["", "Hi Sarah,\n\n"],
      ["obs", "I listened to your interview about helping restaurant groups reduce food waste."],
      ["", "\n\n"],
      ["bridge", "You mentioned that managers often discover the problem after reviewing month-end numbers. That got me wondering whether a recent location opening could be a useful prospecting trigger."],
      ["", "\n\n"],
      ["proof", "I found five restaurant groups expanding this quarter and drafted an outreach email for one of them."],
      ["", "\n\n"],
      ["ask", "I'm applying for your SDR role. Would you be open to taking a look?"],
      ["", "\n\nAlex"],
    ],
    linkedin: [
      ["", "Hi Sarah,\n\n"],
      ["obs", "Loved your interview on restaurant food waste."],
      ["", " "],
      ["bridge", "It made me wonder if new location openings are a good prospecting trigger."],
      ["", " "],
      ["proof", "I found five groups expanding this quarter and drafted an email for one."],
      ["", "\n\n"],
      ["ask", "Applying for your SDR role. Want to see it?"],
      ["", "\n\nAlex"],
    ],
    why: [
      ["proof", "Effort is the proof. Real work before being hired is hard to fake, so it stands out."],
      ["bridge", "Shows the job instead of describing it. You're not saying you can prospect. You're prospecting."],
      ["ask", "Curiosity. “I drafted an email” makes them want to see it."],
    ],
  },
  {
    tab: "Transferable skills",
    forWho: "For people breaking into sales.",
    subjects: ["Hospitality to sales, with homework", "10 accounts I researched for you", "Your SDR opening"],
    email: [
      ["", "Hi Sarah,\n\n"],
      ["obs", "I applied for your SDR opening. My background is in hospitality."],
      ["", "\n\n"],
      ["proof", "For the past three years, I've managed a busy restaurant shift: handling complaints, training new staff, and asking questions when someone says something's wrong but hasn't explained why."],
      ["", "\n\n"],
      ["bridge", "To get a better feel for prospecting, I researched your product, picked ten potential accounts, and wrote an email explaining why one might care."],
      ["", "\n\n"],
      ["ask", "Here's the account research and sample email."],
      ["", "\n\nAlex"],
    ],
    linkedin: [
      ["", "Hi Sarah,\n\n"],
      ["obs", "Applied for your SDR role. I'm coming from hospitality."],
      ["", " "],
      ["proof", "Three years running restaurant shifts: complaints, training staff, asking why when something's wrong."],
      ["", " "],
      ["bridge", "I researched ten accounts and wrote a sample email."],
      ["", "\n\n"],
      ["ask", "Want me to send it?"],
      ["", "\n\nAlex"],
    ],
    why: [
      ["obs", "Names the gap first, so it's not an objection they get to raise."],
      ["proof", "Translates behaviors, not titles. Asking why something's wrong is discovery in their world."],
      ["bridge", "The work closes the gap. No sales experience, but here's sales work."],
    ],
  },
];

const FOLLOW_UPS = [
  {
    day: "Day 5",
    title: "Give something",
    email:
      "Hi Sarah,\n\nAfter my last note, I kept thinking about your move beyond founder-led sales. One thing that helped us at Acme was having the founder record short calls explaining why early customers bought. New reps learned the story in a week instead of a quarter.\n\nHappy to share how we set that up if it's useful.\n\nAlex",
    linkedin:
      "Hi Sarah,\n\nOne idea on moving past founder-led sales: have the founder record short calls on why early customers bought. New reps learn the story in a week. Happy to share more.\n\nAlex",
    why: "Reciprocity. You gave something useful with no strings, and it never mentions the job. That's what makes it feel generous instead of needy.",
  },
  {
    day: "Day 12",
    title: "New observation",
    email:
      "Hi Sarah,\n\nSaw you announced a Denver office. I sold into logistics companies across the Mountain West for three years and still know a lot of those buyers.\n\nWould that be useful for the team you're building?\n\nAlex",
    linkedin:
      "Hi Sarah,\n\nSaw the Denver office news. I sold to logistics companies across the Mountain West for three years and know a lot of those buyers. Useful for your team?\n\nAlex",
    why: "A fresh trigger, not “following up on my last email.” Proves you're still paying attention, the same way a good rep watches an account.",
  },
  {
    day: "Day 12, alternative",
    title: "Show the work",
    email:
      "Hi Sarah,\n\nI took one of the five restaurant groups from my last note and mapped out who I'd reach out to and why. Took about an hour.\n\nWant me to send it over?\n\nAlex",
    linkedin: "Hi Sarah,\n\nI mapped out who I'd contact at one of those five restaurant groups, and why. Want me to send it?\n\nAlex",
    why: "Escalating effort. Each touch adds value instead of repeating the ask. Asking before sending makes the yes easy.",
  },
  {
    day: "Day 20",
    title: "Close the loop",
    email:
      "Hi Sarah,\n\nI haven't heard back, so I'm guessing the timing isn't right or the role's moving in a different direction. Either is fine.\n\nIf anything changes, I'd still enjoy a conversation.\n\nAlex",
    linkedin: "Hi Sarah,\n\nGuessing the timing isn't right, and that's fine. If anything changes, I'd enjoy a conversation.\n\nAlex",
    why: "Detachment. Pushing creates resistance. Letting go removes it, which is why this one so often gets the reply the first three didn't.",
  },
];

const BEATS: [Exclude<Beat, "">, string, string][] = [
  ["obs", "Observation", "Something from their world"],
  ["proof", "Proof", "Your evidence, in numbers"],
  ["bridge", "Bridge", "Why it matters to them"],
  ["ask", "Ask", "A question easy to answer"],
];

/** The four beats, color-matched to the highlights in the emails. */
export function BeatsLegend() {
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
      {BEATS.map(([b, name, desc]) => (
        <div key={b} className={`rounded-xl p-3.5 ${BEAT_STYLE[b]}`}>
          <p className="font-bold">{name}</p>
          <p className="text-sm opacity-90">{desc}</p>
        </div>
      ))}
    </div>
  );
}

type Channel = "email" | "linkedin";

function ChannelToggle({ value, onChange }: { value: Channel; onChange: (c: Channel) => void }) {
  return (
    <div role="tablist" aria-label="Channel" className="inline-flex rounded-full border border-line bg-surface p-1">
      {(["email", "linkedin"] as const).map((c) => (
        <button
          key={c}
          type="button"
          role="tab"
          aria-selected={value === c}
          onClick={() => onChange(c)}
          className={`rounded-full px-4 py-1.5 text-sm ${value === c ? "bg-ink font-semibold text-white" : "text-ink-2 hover:text-ink"}`}
        >
          {c === "email" ? "Email" : "LinkedIn"}
        </button>
      ))}
    </div>
  );
}

const copyBtn = "rounded-lg border border-line bg-surface px-3 py-2 text-sm font-semibold hover:border-line-strong";
const copyPrimary = "rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white hover:opacity-90";

function CharCount({ n }: { n: number }) {
  return <span className={`text-sm ${n > 300 ? "text-red" : "text-ink-3"}`}>{n} / 300 characters</span>;
}

export function FirstNotes() {
  const [i, setI] = useState(0);
  const [channel, setChannel] = useState<Channel>("email");
  const [beats, setBeats] = useState(true);
  const note = FIRST[i];
  const parts = channel === "linkedin" ? note.linkedin : note.email;
  const plain = parts.map((p) => p[1]).join("");

  return (
    <div>
      <ChannelToggle value={channel} onChange={setChannel} />
      <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
        {FIRST.map((f, k) => (
          <button
            key={f.tab}
            type="button"
            onClick={() => setI(k)}
            className={`shrink-0 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-sm ${k === i ? "border-ink bg-ink font-semibold text-white" : "border-line bg-surface text-ink-2 hover:text-ink"}`}
          >
            {f.tab}
          </button>
        ))}
      </div>

      <div className="mt-4 rounded-2xl border border-line bg-surface p-5 sm:p-6">
        <p className="text-sm text-ink-2">
          {note.forWho}
          {channel === "linkedin" && " LinkedIn connection notes cap at 300 characters, so this version is tighter."}
        </p>

        {channel === "email" && (
          <div className="mt-4 rounded-xl border border-line bg-bg p-4">
            <p className="font-semibold">Subject line options</p>
            <p className="text-sm text-ink-3">Pick one. Tap to copy.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {note.subjects.map((s) => (
                <CopyButton key={s} text={s} label={s} className="rounded-lg border border-dashed border-line-strong bg-surface px-3 py-1.5 text-sm hover:border-ink" />
              ))}
            </div>
          </div>
        )}

        {channel === "email" && <p className="mt-5 font-semibold">Email</p>}
        <div className="mt-2 whitespace-pre-wrap text-[15px] leading-7 sm:text-base">
          {parts.map(([b, t], k) =>
            b && beats ? (
              <span key={k} className={`rounded px-0.5 ${BEAT_STYLE[b]}`}>
                {t}
              </span>
            ) : (
              <span key={k}>{t}</span>
            ),
          )}
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-2">
            <input type="checkbox" checked={beats} onChange={(e) => setBeats(e.target.checked)} className="h-4 w-4 accent-[var(--ink)]" />
            Show the beats
          </label>
          <div className="flex items-center gap-3">
            {channel === "linkedin" && <CharCount n={plain.length} />}
            <CopyButton text={plain} label={channel === "linkedin" ? "Copy note" : "Copy email"} className={copyPrimary} />
          </div>
        </div>

        <div className="mt-5">
          <p className="text-xs font-bold uppercase tracking-wide text-ink-3">Why it works</p>
          <ul className="mt-3 space-y-2.5">
            {note.why.map(([b, t]) => (
              <li key={t} className="flex gap-3 text-[15px] leading-relaxed">
                <span aria-hidden="true" className={`mt-2 h-2.5 w-2.5 shrink-0 rounded-full ${DOT[b]}`} />
                <span>{t}</span>
              </li>
            ))}
            {channel === "email" && (
              <li className="flex gap-3 text-[15px] leading-relaxed">
                <span aria-hidden="true" className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-ink-3" />
                <span>Subject lines name something specific to them. Short, and nothing that sounds like a job application.</span>
              </li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}

export function FollowUps() {
  const [channel, setChannel] = useState<Channel>("email");
  return (
    <div>
      <ChannelToggle value={channel} onChange={setChannel} />
      <ol className="relative mt-5 space-y-5 border-l-2 border-line pl-6">
        {FOLLOW_UPS.map((f) => {
          const text = channel === "linkedin" ? f.linkedin : f.email;
          return (
            <li key={f.day + f.title} className="relative">
              <span aria-hidden="true" className="absolute -left-[33px] top-1.5 h-3.5 w-3.5 rounded-full border-[3px] border-bg bg-fresh" />
              <p className="text-sm font-bold text-fresh">{f.day}</p>
              <div className="mt-1 rounded-2xl border border-line bg-surface p-4 sm:p-5">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-lg font-bold tracking-tight">{f.title}</h3>
                  <CopyButton text={text} label="Copy" className={copyBtn} />
                </div>
                {channel === "email" ? (
                  <p className="mt-2 text-sm">
                    <span className="font-semibold">Subject line:</span>{" "}
                    <span className="text-ink-2">none. Reply in the same thread so they see your first note.</span>
                  </p>
                ) : (
                  <p className="mt-2">
                    <CharCount n={text.length} />
                  </p>
                )}
                <div className="mt-3 whitespace-pre-wrap rounded-xl bg-bg p-4 text-[15px] leading-7">{text}</div>
                <p className="mt-3 text-[15px] leading-relaxed text-ink-2">
                  <span className="font-semibold text-ink">Why it works:</span> {f.why}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
