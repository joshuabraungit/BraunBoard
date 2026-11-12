"use client";
import { startTransition, useActionState, useState } from "react";
import { startCheckout, type SponsorState } from "./actions";
import { CURRENCIES } from "@/lib/sponsor-form";

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
  // OTE stays tucked away until they ask for it. Opens on its own if they'd filled it in or it has an error.
  const [showOte, setShowOte] = useState(
    () => !!(v.ote_min || v.ote_max || v.ote_attainment_pct || e.ote_min || e.ote_max || e.ote_attainment_pct),
  );
  const oteOpen = showOte || !!(e.ote_min || e.ote_max || e.ote_attainment_pct);
  const err = (n: string) => (e[n] ? { "aria-invalid": true, "aria-describedby": `${n}-error` } : {});

  return (
    <form
      // Submit by hand instead of <form action>, so React doesn't wipe the form when it comes back
      // with errors. Everything they typed stays put.
      onSubmit={(ev) => {
        ev.preventDefault();
        const fd = new FormData(ev.currentTarget);
        startTransition(() => action(fd));
      }}
      className="space-y-5"
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

      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="contact_name" label="Your name" error={e.contact_name}>
          <input id="contact_name" name="contact_name" defaultValue={v.contact_name} required autoComplete="name" className={input} {...err("contact_name")} />
        </Field>
        <Field name="email" label="Work email" error={e.email}>
          <input id="email" name="email" type="email" defaultValue={v.email} required autoComplete="email" className={input} {...err("email")} />
        </Field>
        <Field name="company" label="Company" error={e.company}>
          <input id="company" name="company" defaultValue={v.company} required autoComplete="organization" className={input} {...err("company")} />
        </Field>
        <Field name="job_url" label="Link to apply" error={e.job_url}>
          <input id="job_url" name="job_url" type="url" defaultValue={v.job_url} required placeholder="https://" className={input} {...err("job_url")} />
        </Field>
      </div>

      <Field
        name="description"
        label="Paste in your job description"
        hint="Don't polish it. I'll rewrite it in plain English and send it to you for approval."
        error={e.description}
      >
        <textarea id="description" name="description" defaultValue={v.description} required rows={7} maxLength={10000} className={input} {...err("description")} />
      </Field>

      <div>
        <p className="text-sm font-semibold">Base pay</p>
        <p className="mt-0.5 text-xs text-ink-3">Sellers skip jobs that hide pay, and so do I.</p>
        <div className="mt-1.5 grid grid-cols-[1fr_1fr_6rem] gap-2">
          <input aria-label="Base, from" id="salary_min" name="salary_min" inputMode="numeric" defaultValue={v.salary_min} required placeholder="90,000" className={input} {...err("salary_min")} />
          <input aria-label="Base, to" id="salary_max" name="salary_max" inputMode="numeric" defaultValue={v.salary_max} required placeholder="110,000" className={input} {...err("salary_max")} />
          <select aria-label="Currency" id="currency" name="currency" defaultValue={v.currency ?? "USD"} className={input}>
            {CURRENCIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        {(e.salary_min || e.salary_max || e.currency) && (
          <p id={e.salary_min ? "salary_min-error" : "salary_max-error"} className="mt-1 text-sm text-red">
            {e.salary_min ?? e.salary_max ?? e.currency}
          </p>
        )}

        {!oteOpen ? (
          <button type="button" onClick={() => setShowOte(true)} className="mt-2 text-sm font-semibold text-accent hover:underline">
            + Add OTE (optional)
          </button>
        ) : (
          <div className="mt-4 space-y-4 rounded-lg border border-line p-4">
            <div>
              <p className="text-sm font-semibold">OTE (optional)</p>
              <div className="mt-1.5 grid grid-cols-2 gap-2">
                <input aria-label="OTE, from" id="ote_min" name="ote_min" inputMode="numeric" defaultValue={v.ote_min} placeholder="180,000" className={input} {...err("ote_min")} />
                <input aria-label="OTE, to" id="ote_max" name="ote_max" inputMode="numeric" defaultValue={v.ote_max} placeholder="220,000" className={input} {...err("ote_max")} />
              </div>
              {(e.ote_min || e.ote_max) && (
                <p id={e.ote_min ? "ote_min-error" : "ote_max-error"} className="mt-1 text-sm text-red">
                  {e.ote_min ?? e.ote_max}
                </p>
              )}
            </div>
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
        )}
      </div>

      <Field name="notes" label="Anything else I should know? (optional)" hint="Need it to go live on a specific date? Say so here." error={e.notes}>
        <textarea id="notes" name="notes" defaultValue={v.notes} rows={2} maxLength={1000} className={input} />
      </Field>

      <div className="rounded-2xl border border-line bg-surface p-5">
        <p className="text-sm text-ink-2">
          Sales roles only (SDR, BDR, AE, AM, CSM with a number, sales leadership). Not a fit? Full refund.
        </p>
        <div className="mt-4">
          <Submit price={price} pending={pending} />
        </div>
        <p className="mt-3 text-xs text-ink-3">Secure payment through Stripe. You&apos;ll get a receipt by email. Promo code? Add it on the next page.</p>
      </div>
    </form>
  );
}
