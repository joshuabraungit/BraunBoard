import Link from "next/link";
import { PageTabs, SAVED_TABS } from "@/components/PageTabs";
import { getUser, listWatches } from "@/lib/session";
import { setAlertFrequency } from "@/app/actions";

export const dynamic = "force-dynamic";

const OPTIONS = [
  { value: "instant", label: "Instant", hint: "Within a few hours of the job appearing" },
  { value: "daily", label: "Daily Digest", hint: "One email each morning" },
  { value: "off", label: "Off", hint: "No email" },
] as const;

export default async function Alerts() {
  const user = await getUser();
  if (!user) {
    return (
      <div className="mx-auto max-w-xl py-10">
        <PageTabs tabs={SAVED_TABS} active="/alerts" />
        <h1 className="text-2xl font-bold tracking-tight">Alert emails</h1>
        <p className="mt-2 text-ink-2">Get an email when a job matching your watch shows up. Instant, daily, or off.</p>
        <Link href="/login?next=/alerts" className="mt-6 inline-block rounded-lg bg-ink px-4 py-2.5 text-sm font-semibold text-white">Sign in →</Link>
      </div>
    );
  }
  const watches = await listWatches();
  return (
    <div className="mx-auto max-w-2xl">
      <PageTabs tabs={SAVED_TABS} active="/alerts" />
      <h1 className="text-2xl font-bold tracking-tight">Alert emails</h1>
      <p className="mt-1 text-sm text-ink-2">Emails go to {user.email}. Watched companies are included in your daily digest.</p>
      {watches.length === 0 && (
        <p className="mt-8 rounded-xl border border-dashed border-line p-6 text-center text-sm text-ink-3">
          No watches yet. <Link href="/for-you" className="underline">Set one up</Link>.
        </p>
      )}
      <ul className="mt-6 space-y-3">
        {watches.map((w) => (
          <li key={w.id} className="rounded-xl border border-line bg-surface p-4">
            <p className="font-semibold">{w.name}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {OPTIONS.map((o) => (
                <form key={o.value} action={setAlertFrequency}>
                  <input type="hidden" name="id" value={w.id} />
                  <input type="hidden" name="frequency" value={o.value} />
                  <button
                    title={o.hint}
                    aria-pressed={w.alert_frequency === o.value}
                    className="rounded-full border border-line-strong px-3.5 py-1.5 text-sm aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-white"
                  >
                    {o.label}
                  </button>
                </form>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
