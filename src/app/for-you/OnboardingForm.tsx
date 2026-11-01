"use client";
// "What sales job would you actually take?" One question at a time, one form underneath.
import { useState } from "react";
import { saveOnboarding } from "@/app/actions";
import { prefillFromResume } from "./resume-action";
import type { ResumePrefill } from "@/lib/resume-read";
import { DEALBREAKER_LABELS, DEALBREAKERS } from "@/lib/match";
import { SIZE_BUCKETS, SIZE_LABELS, type SizeBucket } from "@/lib/ingest/size";
import { COUNTRY_CHOICES, MOTION_CHOICES, payCurrencyFor, ROLE_CHOICES, WORK_CHOICES, type OnboardingAnswers, type RoleChoice } from "@/lib/watch-prefs";

const PRESETS = {
  usd: { base: [100, 125, 150, 175, 200], ote: [150, 200, 250, 300, 400] },
  gbp: { base: [50, 60, 75, 90, 110], ote: [80, 100, 125, 150, 200] },
  eur: { base: [60, 75, 90, 110, 130], ote: [100, 130, 160, 200, 250] },
};
const SYMBOL = { usd: "$", gbp: "£", eur: "€" } as const;

function Chip({ name, value, type, checked, onChange, children }: { name: string; value: string; type: "checkbox" | "radio"; checked: boolean; onChange: (v: boolean) => void; children: React.ReactNode }) {
  return (
    <label className={`cursor-pointer select-none rounded-full border px-3.5 py-2 text-sm transition ${checked ? "border-ink bg-ink text-white" : "border-line-strong bg-surface hover:border-ink-3"}`}>
      <input type={type} name={name} value={value} checked={checked} onChange={(e) => onChange(e.target.checked)} className="sr-only" />
      {children}
    </label>
  );
}

function Money({ name, label, presets, value, setValue, sym }: { name: string; label: string; presets: number[]; value: string; setValue: (v: string) => void; sym: string }) {
  return (
    <div>
      <p className="mb-2 text-sm font-semibold">{label}</p>
      <div className="flex flex-wrap items-center gap-2">
        {presets.map((k) => (
          <Chip key={k} name={`${name}_preset`} value={String(k)} type="radio" checked={value === String(k)} onChange={() => setValue(String(k))}>
            {sym}
            {k}K+
          </Chip>
        ))}
        <Chip name={`${name}_preset`} value="" type="radio" checked={value === ""} onChange={() => setValue("")}>
          No minimum
        </Chip>
        <input name={name} type="hidden" value={value} />
      </div>
    </div>
  );
}

export function OnboardingForm({ initial }: { initial?: OnboardingAnswers | null }) {
  const [step, setStep] = useState(0);
  // Review mode: every answer on one page, each with its own Change. Used when editing a saved watch
  // and right after a résumé fills things in. First-timers without a résumé get one question at a time.
  const [mode, setMode] = useState<"steps" | "review">(initial?.roles?.length ? "review" : "steps");
  const [open, setOpen] = useState<number | null>(null);
  const [roles, setRoles] = useState<RoleChoice[]>(initial?.roles ?? []);
  const [base, setBase] = useState(initial?.min_base ? String(initial.min_base / 1000) : "");
  const [ote, setOte] = useState(initial?.min_ote ? String(initial.min_ote / 1000) : "");
  const [work, setWork] = useState<OnboardingAnswers["work"]>(initial?.work ?? "any");
  const [location, setLocation] = useState(initial?.location ?? "");
  const [country, setCountry] = useState<OnboardingAnswers["country"]>(initial?.country ?? "US");
  const [motion, setMotion] = useState<OnboardingAnswers["motion"]>(initial?.motion ?? "either");
  const [breakers, setBreakers] = useState<string[]>(initial?.dealbreakers ?? []);
  const [sizes, setSizes] = useState<SizeBucket[]>(initial?.sizes ?? []);
  const [soldTo, setSoldTo] = useState(initial?.sold_to ?? "");
  const [pending, setPending] = useState(false);
  const [reading, setReading] = useState(false);
  const [resumeError, setResumeError] = useState("");
  const [saw, setSaw] = useState<ResumePrefill["saw"] | null>(null);

  async function readResumeFile(file: File | undefined) {
    if (!file) return;
    setResumeError("");
    setReading(true);
    const fd = new FormData();
    fd.append("resume", file);
    try {
      const r = await prefillFromResume(fd);
      if (!r.ok) return setResumeError(r.error);
      const a = r.prefill.answers;
      if (a.roles) setRoles(a.roles);
      if (a.country) {
        if (payCurrencyFor(a.country) !== cur) {
          setBase("");
          setOte("");
        }
        setCountry(a.country);
      }
      if (a.location) setLocation(a.location);
      if (a.work) setWork(a.work);
      if (a.motion) setMotion(a.motion);
      if (a.sizes) setSizes(a.sizes);
      const s = r.prefill.saw;
      const exp = [s.sold_to, s.industries].filter(Boolean).join("; ");
      if (exp) setSoldTo(exp.slice(0, 160));
      setSaw(s);
      setMode("review");
      setOpen(null);
    } catch {
      setResumeError("Something went wrong reading that. You can fill it in below.");
    } finally {
      setReading(false);
    }
  }
  const cur = payCurrencyFor(country);
  const sym = SYMBOL[cur];

  const steps = [
    {
      q: "What role?",
      hint: "Pick any you'd take.",
      body: (
        <div className="flex flex-wrap gap-2">
          {(Object.keys(ROLE_CHOICES) as RoleChoice[]).map((r) => (
            <Chip key={r} name="roles" value={r} type="checkbox" checked={roles.includes(r)} onChange={(on) => setRoles(on ? [...roles, r] : roles.filter((x) => x !== r))}>
              {ROLE_CHOICES[r].label}
            </Chip>
          ))}
        </div>
      ),
      ok: roles.length > 0,
      summary: roles.length ? roles.map((r) => ROLE_CHOICES[r].label).join(", ") : "",
    },
    {
      q: "Where do you want to work?",
      hint: "Location is optional. Try a state, province or city, like NY, Austin, Toronto, London or Berlin.",
      body: (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {(Object.keys(COUNTRY_CHOICES) as (keyof typeof COUNTRY_CHOICES)[]).map((c) => (
              <Chip
                key={c}
                name="country"
                value={c}
                type="radio"
                checked={country === c}
                onChange={() => {
                  // Pay answers are in the country's currency, so switching between $, £ and € clears them.
                  if (payCurrencyFor(c) !== cur) {
                    setBase("");
                    setOte("");
                  }
                  setCountry(c);
                }}
              >
                {COUNTRY_CHOICES[c]}
              </Chip>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(WORK_CHOICES) as (keyof typeof WORK_CHOICES)[]).map((w) => (
              <Chip key={w} name="work" value={w} type="radio" checked={work === w} onChange={() => setWork(w)}>
                {WORK_CHOICES[w]}
              </Chip>
            ))}
          </div>
          <input name="location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Location (optional)" className="w-full max-w-xs rounded-lg border border-line bg-surface px-3 py-2 text-sm" />
        </div>
      ),
      ok: true,
      summary: [COUNTRY_CHOICES[country], WORK_CHOICES[work], location.trim()].filter(Boolean).join(" · "),
    },
    {
      q: "What would it have to pay?",
      hint: "Only counts jobs that publish pay. Jobs that don't say aren't held against them.",
      body: (
        <div className="space-y-5">
          <Money name="min_base" label="Minimum base" presets={PRESETS[cur].base} value={base} setValue={setBase} sym={sym} />
          <Money name="min_ote" label="Minimum OTE" presets={PRESETS[cur].ote} value={ote} setValue={setOte} sym={sym} />
        </div>
      ),
      ok: true,
      summary: [base && `${sym}${base}K+ base`, ote && `${sym}${ote}K+ OTE`].filter(Boolean).join(" · "),
    },
    {
      q: "New business or expansion?",
      hint: "Hunting new logos, growing existing accounts, or either.",
      body: (
        <div className="flex flex-wrap gap-2">
          {(Object.keys(MOTION_CHOICES) as (keyof typeof MOTION_CHOICES)[]).map((m) => (
            <Chip key={m} name="motion" value={m} type="radio" checked={motion === m} onChange={() => setMotion(m)}>
              {MOTION_CHOICES[m]}
            </Chip>
          ))}
        </div>
      ),
      ok: true,
      summary: MOTION_CHOICES[motion],
    },
    {
      q: "Who have you sold to?",
      hint: "Optional. Jobs selling to the same buyers or industries rank higher. Nothing gets hidden.",
      body: (
        <input
          name="sold_to"
          value={soldTo}
          maxLength={160}
          onChange={(e) => setSoldTo(e.target.value)}
          placeholder="Restaurant owners; logistics; finance teams"
          className="w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm"
        />
      ),
      ok: true,
      summary: soldTo.trim(),
    },
    {
      q: "What size company?",
      hint: "Pick any you'd join, or skip it for any size. Companies I can't size still show up, so you don't miss anything.",
      body: (
        <div className="flex flex-wrap gap-2">
          {SIZE_BUCKETS.map((b) => (
            <Chip key={b} name="sizes" value={b} type="checkbox" checked={sizes.includes(b)} onChange={(on) => setSizes(on ? [...sizes, b] : sizes.filter((x) => x !== b))}>
              {SIZE_LABELS[b].label} <span className="opacity-70">· {SIZE_LABELS[b].range}</span>
            </Chip>
          ))}
        </div>
      ),
      ok: true,
      summary: sizes.length ? sizes.map((b) => SIZE_LABELS[b].label).join(", ") : "Any size",
    },
    {
      q: "Any dealbreakers?",
      hint: "Jobs that hit one of these never show up as a match.",
      body: (
        <div className="flex flex-wrap gap-2">
          {DEALBREAKERS.map((d) => (
            <Chip key={d} name="dealbreakers" value={d} type="checkbox" checked={breakers.includes(d)} onChange={(on) => setBreakers(on ? [...breakers, d] : breakers.filter((x) => x !== d))}>
              {DEALBREAKER_LABELS[d]}
            </Chip>
          ))}
        </div>
      ),
      ok: true,
      summary: breakers.length ? breakers.map((d) => DEALBREAKER_LABELS[d as keyof typeof DEALBREAKER_LABELS]).join(", ") : "None",
    },
  ];
  const last = step === steps.length - 1;

  const resumeCard = (
    <div className="mt-8 rounded-2xl border border-line bg-surface p-5">
          {saw ? (
            <>
              <p className="font-semibold">Here&apos;s what I picked up from your résumé</p>
              <ul className="mt-2 space-y-1 text-[15px] text-ink-2">
                {saw.current_role && <li>Most recent: {saw.current_role}</li>}
                {saw.years_selling !== null && <li>Years in sales: {saw.years_selling}</li>}
                {saw.sold_to && <li>Sold to: {saw.sold_to}</li>}
                {saw.industries && <li>Industries: {saw.industries}</li>}
              </ul>
              <p className="mt-3 text-sm text-ink-2">
                I filled in what I could. Check each answer below and change anything that&apos;s off. Pay and dealbreakers are up to you.
              </p>
            </>
          ) : (
            <>
              <p className="font-semibold">Have a résumé handy? I&apos;ll fill this in for you.</p>
              <p className="mt-1 text-sm text-ink-2">I read it once to fill in your answers, then it&apos;s gone. It&apos;s never saved.</p>
              <label className={`mt-4 inline-flex min-h-11 cursor-pointer items-center rounded-lg border border-line-strong bg-bg px-4 text-sm font-semibold hover:border-ink ${reading ? "pointer-events-none opacity-60" : ""}`}>
                <input
                  type="file"
                  accept=".pdf,.txt,application/pdf,text/plain"
                  className="sr-only"
                  disabled={reading}
                  onChange={(e) => {
                    readResumeFile(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
                {reading ? "Reading your résumé…" : "Upload résumé (PDF)"}
              </label>
              <p className="mt-2 text-xs text-ink-3">Using Word? Save it as a PDF first. Or skip this and answer below.</p>
            </>
          )}
          {resumeError && <p className="mt-3 text-sm text-red">{resumeError}</p>}
        </div>
  );
  // Blank answers a résumé can't fill in, called out so people see what's left for them.
  const empty = (i: number) => (i === 0 && !roles.length) || (i === 2 && !base && !ote);
  const EMPTY_TEXT: Record<number, string> = { 0: "Pick at least one", 2: "Not set yet. Up to you.", 4: "Not set (optional)" };

  if (mode === "review") {
    return (
      <form action={saveOnboarding} onSubmit={() => setPending(true)} className="mx-auto max-w-2xl">
        <h2 className="text-xl font-bold tracking-tight">{saw ? "Here's your watch" : "Your watch"}</h2>
        <p className="mt-1 text-sm text-ink-2">
          {saw ? "Filled in from your résumé. Change anything that's off." : "Change any answer. Everything else stays as it is."}
        </p>
        {resumeCard}
        <ul className="mt-6 divide-y divide-line rounded-2xl border border-line bg-surface">
          {steps.map((s, i) => {
            const isOpen = open === i;
            return (
              <li key={s.q} className="px-4 py-3.5 sm:px-5">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{s.q}</p>
                    {!isOpen && (
                      <p className={`mt-0.5 text-[15px] ${empty(i) ? "font-medium text-amber" : s.summary ? "text-ink-2" : "text-ink-3"}`}>
                        {s.summary || EMPTY_TEXT[i] || "Not set"}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpen(isOpen ? null : i)}
                    aria-expanded={isOpen}
                    className="shrink-0 rounded-md px-2.5 py-1 text-sm font-semibold text-ink underline-offset-2 hover:underline"
                  >
                    {isOpen ? "Done" : "Change"}
                  </button>
                </div>
                {/* Mounted even when closed, so every answer submits. */}
                <div hidden={!isOpen} className="mt-3">
                  <p className="mb-3 text-sm text-ink-2">{s.hint}</p>
                  {s.body}
                </div>
              </li>
            );
          })}
        </ul>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={pending || !steps[0].ok}
            className="rounded-lg bg-ink px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
          >
            {pending ? "Finding matches…" : "Show my matches →"}
          </button>
          {!steps[0].ok && <p className="text-sm text-amber">Pick at least one role first.</p>}
        </div>
      </form>
    );
  }

  return (
    <form action={saveOnboarding} onSubmit={() => setPending(true)} className="mx-auto max-w-2xl">
      <p className="text-sm font-medium text-ink-3">
        {step + 1} of {steps.length}
      </p>
      <div className="mt-2 h-1 rounded-full bg-line">
        <div className="h-1 rounded-full bg-ink transition-all" style={{ width: `${((step + 1) / steps.length) * 100}%` }} />
      </div>

      {step === 0 && resumeCard}

      {steps.map((s, i) => (
        // Every step stays mounted so the whole form submits at once; only the current one shows.
        <section key={s.q} hidden={i !== step} className="mt-8">
          <h2 className="text-xl font-bold tracking-tight">{s.q}</h2>
          <p className="mb-5 mt-1 text-sm text-ink-2">{s.hint}</p>
          {s.body}
        </section>
      ))}

      <div className="mt-10 flex items-center gap-3">
        {step > 0 && (
          <button type="button" onClick={() => setStep(step - 1)} className="rounded-lg px-3 py-2.5 text-sm text-ink-2 hover:text-ink">
            ← Back
          </button>
        )}
        {last ? (
          // Distinct keys: otherwise React reuses the "Next" button, flips its type to
          // submit mid-click, and the form submits a step early.
          <button key="submit" type="submit" disabled={pending} className="rounded-lg bg-ink px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
            {pending ? "Finding matches…" : "Show my matches →"}
          </button>
        ) : (
          <button key={`next-${step}`} type="button" disabled={!steps[step].ok} onClick={() => setStep(step + 1)} className="rounded-lg bg-ink px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40">
            Next →
          </button>
        )}
      </div>
    </form>
  );
}
