"use client";
import { startTransition, useActionState, useState } from "react";
import { startCheckout, type SponsorState } from "./actions";
import { CURRENCIES, REMOTE_TYPES } from "@/lib/sponsor-form";

const input = "w-full rounded-lg border border-line bg-bg px-3 py-2.5 text-[15px] focus:border-line-strong focus:outline-none";

function Field({
  name,
  label,
  hint,
  error,
  children,
}: {
  name: string;
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-semibold">
        {label}
      </label>
      {hint && <p className="mt-0.5 text-xs text-ink-3">{hint}</p>}
      <div className="mt-1.5">{children}</div>
      {error && (
        <p id={`${name}-error`} className="mt-1 text-sm text-red">
          {error}
        </p>
      )}
    </div>
  );
}

function Submit({ price, pending }: { price: string; pending: boolean }) {
  return (
    <button
      disabled={pending}
      className="inline-flex min-h-12 w-full items-center justify-center rounded-lg bg-ink px-5 text-[15px] font-semibold text-white hover:opacity-90 disabled:opacity-60 sm:w-auto"
    >
      {pending ? "Taking you to checkout..." : `Continue to payment · ${price}`}
    </button>
  );
}

export function SponsorForm({ price, canceled }: { price: string; canceled: boolean }) {
  const [state, action, pending] = useActionState<SponsorState, FormData>(startCheckout, { errors: {}, values: {} });
  const e = state.errors;
  const v = state.values;
  const [remote, setRemote] = useState(v.remote_type ?? "");
  const [logoName, setLogoName] = useState("");
  const [goLive, setGoLive] = useState(v.start_date ?? "");
  const daysOut = goLive ? Math.round((new Date(`${goLive}T12:00:00Z`).getTime() - Date.now()) / 86_400_000) : 0;
  const today = new Date().toISOString().slice(0, 10);
  const err = (n: string) => (e[n] ? { "aria-invalid": true, "aria-describedby": `${n}-error` } : {});

  return (
    <form
      // Submit by hand instead of <form action>, so React doesn't wipe the form when it comes back
      // with errors. Everything they typed (dropdowns and logo included) stays put.
      onSubmit={(ev) => {
        ev.preventDefault();
        const fd = new FormData(ev.currentTarget);
        startTransition(() => action(fd));
      }}
      className="space-y-8"
      noValidate
    >
      {canceled && !e.form && (
        <p className="rounded-lg bg-amber-soft px-4 py-3 text-sm text-amber">
          Checkout was canceled, so nothing was charged. Fill it in again whenever you&apos;re ready.
        </p>
      )}
      {e.form && <p className="rounded-lg bg-red-soft px-4 py-3 text-sm font-semibold text-red">{e.form}</p>}
      {Object.keys(e).some((k) => k !== "form") && (
        <p className="rounded-lg bg-red-soft px-4 py-3 text-sm text-red">A few fields need a look. They&apos;re marked below.</p>
      )}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />

      <fieldset className="space-y-4">
        <legend className="mb-3 text-lg font-bold tracking-tight">About you</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field name="contact_name" label="Your name" error={e.contact_name}>
            <input id="contact_name" name="contact_name" defaultValue={v.contact_name} required autoComplete="name" className={input} {...err("contact_name")} />
          </Field>
          <Field name="email" label="Work email" hint="Receipt and updates go here." error={e.email}>
            <input id="email" name="email" type="email" defaultValue={v.email} required autoComplete="email" className={input} {...err("email")} />
          </Field>
        </div>
        <Field name="company" label="Company" error={e.company}>
          <input id="company" name="company" defaultValue={v.company} required autoComplete="organization" className={input} {...err("company")} />
        </Field>
        <Field name="logo" label="Company logo" hint="Optional. Square, 400 × 400 px or larger (200 × 200 minimum). A PNG or SVG with a transparent background looks best. JPG and WebP work too. Up to 2MB." error={e.logo}>
          <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-line-strong bg-bg px-3 py-3 text-sm hover:bg-surface">
            <span className="rounded-md bg-surface px-2.5 py-1 font-semibold ring-1 ring-line">Choose file</span>
            <span className="truncate text-ink-2">{logoName || "No file chosen"}</span>
            <input
              id="logo"
              name="logo"
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="sr-only"
              onChange={(ev) => setLogoName(ev.target.files?.[0]?.name ?? "")}
            />
          </label>
        </Field>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="mb-3 text-lg font-bold tracking-tight">The job</legend>
        <Field name="job_title" label="Job title" error={e.job_title}>
          <input id="job_title" name="job_title" defaultValue={v.job_title} required placeholder="Mid-Market Account Executive" className={input} {...err("job_title")} />
        </Field>
        <Field name="job_url" label="Link to apply" hint="Your careers page or ATS posting." error={e.job_url}>
          <input id="job_url" name="job_url" type="url" defaultValue={v.job_url} required placeholder="https://" className={input} {...err("job_url")} />
        </Field>
        <Field
          name="description"
          label="Paste in your job description"
          hint="Don't polish it. I'll rewrite it in plain English, plus a line about what you sell, and send it to you for approval."
          error={e.description}
        >
          <textarea id="description" name="description" defaultValue={v.description} required rows={8} maxLength={10000} className={input} {...err("description")} />
        </Field>

        <div>
          <p className="text-sm font-semibold">Pay</p>
          <p className="mt-0.5 text-xs text-ink-3">Base salary is required. Sellers skip jobs that hide pay, and so do I.</p>
          <div className="mt-2 grid gap-4 sm:grid-cols-[1fr_1fr_7rem]">
            <Field name="salary_min" label="Base, from" error={e.salary_min}>
              <input id="salary_min" name="salary_min" inputMode="numeric" defaultValue={v.salary_min} required placeholder="90,000" className={input} {...err("salary_min")} />
            </Field>
            <Field name="salary_max" label="Base, to" error={e.salary_max}>
              <input id="salary_max" name="salary_max" inputMode="numeric" defaultValue={v.salary_max} required placeholder="110,000" className={input} {...err("salary_max")} />
            </Field>
            <Field name="currency" label="Currency" error={e.currency}>
              <select id="currency" name="currency" defaultValue={v.currency ?? "USD"} className={input}>
                {CURRENCIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </Field>
            <Field name="ote_min" label="OTE, from (optional)" error={e.ote_min}>
              <input id="ote_min" name="ote_min" inputMode="numeric" defaultValue={v.ote_min} placeholder="180,000" className={input} {...err("ote_min")} />
            </Field>
            <Field name="ote_max" label="OTE, to (optional)" error={e.ote_max}>
              <input id="ote_max" name="ote_max" inputMode="numeric" defaultValue={v.ote_max} placeholder="220,000" className={input} {...err("ote_max")} />
            </Field>
          </div>
          <div className="mt-4">
            <Field
              name="ote_attainment_pct"
              label="What percentage of fully ramped reps earned their full OTE last year? (optional)"
              hint="Sellers trust jobs that share this. Skip it if you don't track it or the role is new."
              error={e.ote_attainment_pct}
            >
              <div className="flex items-center gap-2">
                <input
                  id="ote_attainment_pct"
                  name="ote_attainment_pct"
                  inputMode="numeric"
                  defaultValue={v.ote_attainment_pct}
                  placeholder="70"
                  className={`${input} max-w-24`}
                  {...err("ote_attainment_pct")}
                />
                <span className="text-ink-2">%</span>
              </div>
            </Field>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field name="remote_type" label="Remote or in office?" error={e.remote_type}>
            <select id="remote_type" name="remote_type" value={remote} onChange={(ev) => setRemote(ev.target.value)} required className={input} {...err("remote_type")}>
              <option value="" disabled>
                Pick one
              </option>
              {REMOTE_TYPES.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </Field>
          <Field name="location" label={remote === "Remote" ? "Location (optional)" : "Location"} error={e.location}>
            <input
              id="location"
              name="location"
              defaultValue={v.location}
              placeholder={remote === "Remote" ? "e.g. US only, or EST time zone" : "Austin, TX"}
              className={input}
              {...err("location")}
            />
          </Field>
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="mb-3 text-lg font-bold tracking-tight">Timing</legend>
        <Field name="start_date" label="When should your listing go live?" hint="Optional. This is when your ad appears on Braun Board, not the new hire's start date. Leave blank and it goes live as soon as you approve the rewrite." error={e.start_date}>
          <input
            id="start_date"
            name="start_date"
            type="date"
            min={today}
            defaultValue={v.start_date}
            onChange={(ev) => setGoLive(ev.target.value)}
            className={`${input} sm:max-w-56`}
            {...err("start_date")}
          />
          {daysOut > 14 && (
            <p className="mt-2 rounded-lg bg-amber-soft px-3 py-2 text-sm text-amber">
              Heads up: your ad won&apos;t show up anywhere for about {Math.round(daysOut / 7)} weeks. If you meant the new hire&apos;s start date, clear this
              and your ad goes live as soon as you approve it.
            </p>
          )}
        </Field>
        <Field name="notes" label="Anything else I should know?" hint="Optional." error={e.notes}>
          <textarea id="notes" name="notes" defaultValue={v.notes} rows={3} maxLength={1000} className={input} />
        </Field>
      </fieldset>

      <div className="rounded-2xl border border-line bg-surface p-5">
        <label className="flex items-start gap-3 text-[15px]">
          <input type="checkbox" name="sales_role" value="yes" defaultChecked={v.sales_role === "yes"} className="mt-1 size-4 accent-[var(--accent)]" {...err("sales_role")} />
          <span>This is a sales role (SDR, BDR, AE, AM, CSM with a number, sales leadership).</span>
        </label>
        {e.sales_role && (
          <p id="sales_role-error" className="mt-1 text-sm text-red">
            {e.sales_role}
          </p>
        )}
        <div className="mt-5">
          <Submit price={price} pending={pending} />
        </div>
        <p className="mt-3 text-xs text-ink-3">Secure payment through Stripe. You&apos;ll get a receipt by email. Promo code? Add it on the next page.</p>
      </div>
    </form>
  );
}
