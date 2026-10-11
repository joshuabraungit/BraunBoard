import { isSupabaseConfigured } from "@/lib/supabase/server";
import { LoginForm } from "./LoginForm";

const REASONS: Record<string, string> = {
  watch: "Sign in to watch companies and searches.",
  save: "Sign in to save jobs.",
  alerts: "Sign in to get email alerts when matching jobs show up.",
};

export default async function Login({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const next = sp.next ?? "/for-you";
  const reason = REASONS[sp.why ?? ""] ?? (next.startsWith("/for-you") ? REASONS.alerts : "Browsing is free. An account lets you save, watch and get alerts.");
  return (
    <div className="mx-auto max-w-sm py-10">
      <h1 className="text-2xl font-bold tracking-tight">Sign in</h1>
      <p className="mt-2 text-ink-2">{reason}</p>
      {sp.error && <p className="mt-4 rounded-md bg-fresh-soft px-3 py-2 text-sm text-fresh">That link didn&apos;t work or expired. Try again.</p>}
      {isSupabaseConfigured() ? (
        <LoginForm next={next} />
      ) : (
        <p className="mt-6 rounded-lg border border-dashed border-line p-4 text-sm text-ink-3">
          Sign-in turns on once Supabase keys are in <code>.env.local</code>.
        </p>
      )}
    </div>
  );
}
