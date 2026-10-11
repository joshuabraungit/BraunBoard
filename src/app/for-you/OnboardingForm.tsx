"use client";
// "What sales job would you actually take?" One question at a time, one form underneath.
import { useState } from "react";
import { saveOnboarding } from "@/app/actions";
import { DEALBREAKER_LABELS, DEALBREAKERS } from "@/lib/match";
import { MOTION_CHOICES, ROLE_CHOICES, WORK_CHOICES, type OnboardingAnswers, type RoleChoice } from "@/lib/watch-prefs";

const BASE_PRESETS = [100, 125, 150, 175, 200];
const OTE_PRESETS = [150, 200, 250, 300, 400];

function Chip({ name, value, type, checked, onChange, children }: { name: string; value: string; type: "checkbox" | "radio"; checked: boolean; onChange: (v: boolean) => void; children: React.ReactNode }) {
  return (
    <label className={`cursor-pointer select-none rounded-full border px-3.5 py-2 text-sm transition ${checked ? "border-ink bg-ink text-white" : "border-line-strong bg-surface hover:border-ink-3"}`}>
      <input type={type} name={name} value={value} checked={checked} onChange={(e) => onChange(e.target.checked)} className="sr-only" />
      {children}
    </label>
  );
}

function Money({ name, label, presets, value, setValue }: { name: string; label: string; presets: number[]; value: string; setValue: (v: string) => void }) {
  return (
    <div>
      <p className="mb-2 text-sm font-semibold">{label}</p>
      <div className="flex flex-wrap items-center gap-2">
        {presets.map((k) => (
          <Chip key={k} name={`${name}_preset`} value={String(k)} type="radio" checked={value === String(k)} onChange={() => setValue(String(k))}>
            ${k}K+
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
  const [roles, setRoles] = useState<RoleChoice[]>(initial?.roles ?? []);
  const [base, setBase] = useState(initial?.min_base ? String(initial.min_base / 1000) : "");
  const [ote, setOte] = useState(initial?.min_ote ? String(initial.min_ote / 1000) : "");
  const [work, setWork] = useState<OnboardingAnswers["work"]>(initial?.work ?? "any");
  const [location, setLocation] = useState(initial?.location ?? "");
  const [motion, setMotion] = useState<OnboardingAnswers["motion"]>(initial?.motion ?? "either");
  const [breakers, setBreakers] = useState<string[]>(initial?.dealbreakers ?? []);
  const [pending, setPending] = useState(false);

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
    },
    {
      q: "What would it have to pay?",
      hint: "Only counts jobs that publish pay. Jobs that don't say aren't held against them.",
      body: (
        <div className="space-y-5">
          <Money name="min_base" label="Minimum base" presets={BASE_PRESETS} value={base} setValue={setBase} />
          <Money name="min_ote" label="Minimum OTE" presets={OTE_PRESETS} value={ote} setValue={setOte} />
        </div>
      ),
      ok: true,
    },
    {
      q: "Where do you want to work?",
      hint: "Location is optional. Try a state or city, like NY or Austin.",
      body: (
        <div className="space-y-4">
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
    },
  ];
  const last = step === steps.length - 1;

  return (
    <form action={saveOnboarding} onSubmit={() => setPending(true)} className="mx-auto max-w-2xl">
      <p className="text-sm font-medium text-ink-3">
        {step + 1} of {steps.length}
      </p>
      <div className="mt-2 h-1 rounded-full bg-line">
        <div className="h-1 rounded-full bg-ink transition-all" style={{ width: `${((step + 1) / steps.length) * 100}%` }} />
      </div>

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
