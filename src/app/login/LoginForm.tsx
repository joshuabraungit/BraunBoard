"use client";
import { useState } from "react";
import { browserClient } from "@/lib/supabase/browser";

export function LoginForm({ next }: { next: string }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const callback = () => `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    const { error } = await browserClient().auth.signInWithOtp({ email, options: { emailRedirectTo: callback() } });
    setState(error ? "error" : "sent");
  }

  async function google() {
    await browserClient().auth.signInWithOAuth({ provider: "google", options: { redirectTo: callback() } });
  }

  if (state === "sent") {
    return (
      <div className="mt-6 rounded-xl border border-line bg-surface p-5">
        <p className="font-semibold">Check your email.</p>
        <p className="mt-1 text-sm text-ink-2">We sent a sign-in link to {email}. It works once.</p>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-4">
      <button onClick={google} className="w-full rounded-lg border border-line-strong bg-surface py-2.5 text-sm font-semibold hover:border-ink-3">
        Continue with Google
      </button>
      <div className="flex items-center gap-3 text-xs text-ink-3">
        <span className="h-px flex-1 bg-line" />or<span className="h-px flex-1 bg-line" />
      </div>
      <form onSubmit={sendLink} className="space-y-2">
        <label htmlFor="login-email" className="sr-only">
          Email address
        </label>
        <input
          id="login-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
          className="w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm"
        />
        <button disabled={state === "sending"} className="w-full rounded-lg bg-ink py-2.5 text-sm font-semibold text-white disabled:opacity-60">
          {state === "sending" ? "Sending…" : "Email me a sign-in link"}
        </button>
        {state === "error" && <p className="text-sm text-fresh">Couldn&apos;t send the link. Double-check the address.</p>}
      </form>
    </div>
  );
}
