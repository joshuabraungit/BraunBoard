import { adminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin";
import { deleteUser } from "../actions";
import { AdminNotice } from "@/components/AdminNotice";

interface UserRow {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  provider: string | null;
  alert_frequency: string | null;
  watches: number;
  company_watches: number;
  saved: number;
  alerts_sent: number;
  alerts_clicked: number;
  watch_names: string[];
}

const day = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "never");

export default async function AdminUsers({ searchParams }: { searchParams: Promise<{ q?: string; msg?: string; err?: string }> }) {
  const me = await requireAdmin();
  const sp = await searchParams;
  const { data, error } = await adminClient().rpc("admin_users");
  if (error) return <p className="text-red">Couldn&apos;t load users: {error.message}</p>;
  const q = (sp.q ?? "").trim().toLowerCase();
  const users = ((data ?? []) as UserRow[]).filter((u) => !q || u.email?.toLowerCase().includes(q));
  const total = (data ?? []).length;

  return (
    <>
      <h1 className="mb-1 text-2xl font-bold tracking-tight">Users</h1>
      <p className="mb-4 text-sm text-ink-2">{total} people have signed up.</p>
      <AdminNotice msg={sp.msg} err={sp.err} />

      <form className="mb-4 flex gap-2">
        <input name="q" defaultValue={sp.q} placeholder="Search by email" className="min-w-0 flex-1 rounded-md border border-line bg-surface px-3 py-1.5 text-sm" />
        <button className="rounded-md border border-line-strong bg-surface px-3 py-1.5 text-sm font-semibold">Search</button>
      </form>

      <ul className="space-y-2">
        {users.map((u) => (
          <li key={u.id} className="rounded-xl border border-line bg-surface">
            <details>
              <summary className="flex cursor-pointer flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-sm">
                <span className="min-w-0 flex-1 truncate font-semibold">{u.email}</span>
                <span className="text-ink-3">Joined {day(u.created_at)}</span>
                <span className="text-ink-2">{u.watches} watch{u.watches === 1 ? "" : "es"}</span>
                <span className="text-ink-2">
                  {u.alerts_sent} alerts · {u.alerts_clicked} clicked
                </span>
              </summary>
              <div className="grid gap-4 border-t border-line px-4 py-3 text-sm sm:grid-cols-2">
                <dl className="space-y-1">
                  <div><dt className="inline text-ink-3">Signed in with: </dt><dd className="inline">{u.provider === "google" ? "Google" : "Email link"}</dd></div>
                  <div><dt className="inline text-ink-3">Last sign-in: </dt><dd className="inline">{day(u.last_sign_in_at)}</dd></div>
                  <div><dt className="inline text-ink-3">Alert frequency: </dt><dd className="inline">{u.alert_frequency ?? "not set"}</dd></div>
                  <div><dt className="inline text-ink-3">Companies watched: </dt><dd className="inline">{u.company_watches}</dd></div>
                  <div><dt className="inline text-ink-3">Saved jobs: </dt><dd className="inline">{u.saved}</dd></div>
                  {u.watch_names.length > 0 && (
                    <div><dt className="inline text-ink-3">Watches: </dt><dd className="inline">{u.watch_names.join(", ")}</dd></div>
                  )}
                </dl>
                {u.id !== me.id && (
                  <form action={deleteUser} className="space-y-2 rounded-lg border border-red/25 bg-red-soft/50 p-3">
                    <p className="font-semibold text-red">Delete this user</p>
                    <p className="text-xs text-ink-2">Removes their account, watches, saved jobs and alert history for good. Type their email to confirm.</p>
                    <input type="hidden" name="id" value={u.id} />
                    <input type="hidden" name="email" value={u.email} />
                    <input name="confirm" placeholder={u.email} className="w-full rounded-md border border-line bg-surface px-2.5 py-1.5 text-sm" />
                    <button className="rounded-md bg-red px-3 py-1.5 text-xs font-semibold text-white">Delete permanently</button>
                  </form>
                )}
              </div>
            </details>
          </li>
        ))}
      </ul>
    </>
  );
}
