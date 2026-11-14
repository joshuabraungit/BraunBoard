// Fast Track: a limited set of guaranteed screening calls a sponsor offers Braun Board readers.
// Each claim hands out its own code (BB-FT1, BB-FT2...) that goes on the sponsor's application.
import "server-only";
import { adminClient } from "./supabase/admin";
import { sendEmail } from "./alerts/email";
import { adminEmails } from "./admin-emails";
import type { SponsoredJobRow } from "./sponsor";

export interface FastTrackConfig {
  fast_track_total?: number | null;
  fast_track_url?: string | null;
  fast_track_minutes?: number | null;
  fast_track_where?: string | null;
}

export interface FastTrackState {
  total: number;
  left: number;
  lastClaimedAt: string | null;
}

const isOpen = (r: { available_at?: string | null }) => !r.available_at || new Date(r.available_at).getTime() <= Date.now();

export const fastTrackOn = (s: FastTrackConfig) => !!s.fast_track_total && s.fast_track_total > 0;

/** How many codes are left. Null when this sponsor has no Fast Track. */
export async function fastTrackState(s: SponsoredJobRow & FastTrackConfig): Promise<FastTrackState | null> {
  if (!fastTrackOn(s)) return null;
  const { data, error } = await adminClient()
    .from("fast_track_codes")
    .select("claimed_at, available_at")
    .eq("sponsor_id", s.id);
  if (error) {
    console.error("[fast-track] load failed", error.message);
    return null;
  }
  // Codes scheduled for later don't count until their time comes.
  const rows = (data ?? []).filter(isOpen);
  const claimed = rows.filter((r) => r.claimed_at).map((r) => r.claimed_at as string).sort();
  return { total: rows.length, left: rows.length - claimed.length, lastClaimedAt: claimed.at(-1) ?? null };
}

/** Makes sure codes BB-FT1..BB-FTn exist for this sponsor. Never removes a claimed code. */
export async function loadCodes(sponsorId: string, total: number) {
  const rows = Array.from({ length: total }, (_, i) => ({ sponsor_id: sponsorId, code: `BB-FT${i + 1}` }));
  const { error } = await adminClient().from("fast_track_codes").upsert(rows, { onConflict: "sponsor_id,code", ignoreDuplicates: true });
  if (error) throw error;
  // Shrinking the total drops only unclaimed codes past the new number.
  const { data } = await adminClient().from("fast_track_codes").select("id, code, claimed_at").eq("sponsor_id", sponsorId);
  const extra = (data ?? []).filter((r) => !r.claimed_at && Number(String(r.code).replace("BB-FT", "")) > total).map((r) => r.id);
  if (extra.length) await adminClient().from("fast_track_codes").delete().in("id", extra);
}

/** Claims the next free code. Same email gets the same code back. Null = all gone. */
export async function claimCode(sponsorId: string, name: string, email: string): Promise<string | null> {
  const { data, error } = await adminClient().rpc("claim_fast_track", { sid: sponsorId, p_name: name, p_email: email });
  if (error) throw error;
  return (data as string | null) ?? null;
}

export async function claimedCodes(sponsorId: string) {
  const { data } = await adminClient()
    .from("fast_track_codes")
    .select("code, name, email, claimed_at")
    .eq("sponsor_id", sponsorId)
    .order("id");
  return (data ?? []) as { code: string; name: string | null; email: string | null; claimed_at: string | null }[];
}

export const fastTrackWhere = (s: FastTrackConfig) =>
  s.fast_track_where?.trim() || "Put your code somewhere on your application where they'll see it.";

const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Sends the claimer their code and the steps, so they have it if they close the tab. */
export async function sendCodeEmail(s: SponsoredJobRow & FastTrackConfig, to: string, name: string, code: string, applyLink: string) {
  const mins = s.fast_track_minutes ?? 25;
  const first = name.split(/\s+/)[0] || "there";
  const where = fastTrackWhere(s);
  const text = [
    `Hi ${first},`,
    ``,
    `Your Fast Track code for ${s.job_title} at ${s.company}: ${code}`,
    ``,
    `1. Apply here: ${applyLink}`,
    `2. ${where}`,
    `3. ${s.company}'s team will reach out to set up a ${mins}-minute screening call.`,
    ``,
    `This code is yours. Please don't share it. There are only a few.`,
    ``,
    `Good luck,`,
    `Josh`,
  ].join("\n");
  const html = `<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;color:#111">
<p>Hi ${esc(first)},</p>
<p>Your Fast Track code for <b>${esc(s.job_title)}</b> at ${esc(s.company)}:</p>
<p style="font-size:24px;font-weight:700;letter-spacing:1px">${esc(code)}</p>
<ol>
<li><a href="${esc(applyLink)}">Apply here</a></li>
<li>${esc(where)}</li>
<li>${esc(s.company)}'s team will reach out to set up a ${mins}-minute screening call.</li>
</ol>
<p>This code is yours. Please don't share it. There are only a few.</p>
<p>Good luck,<br>Josh</p>
</div>`;
  await sendEmail(to, { subject: `Your Fast Track code: ${code}`, html, text }, { replyTo: adminEmails()[0] });
}

/** Tells Josh someone claimed a code, with how many are left. */
export async function sendClaimNotice(s: SponsoredJobRow, name: string, email: string, code: string) {
  const { data } = await adminClient().from("fast_track_codes").select("claimed_at, available_at").eq("sponsor_id", s.id);
  const rows = (data ?? []).filter(isOpen);
  const left = rows.filter((r) => !r.claimed_at).length;
  const leftLine = left === 0 ? `That was the last one. All ${rows.length} are claimed.` : `${left} of ${rows.length} left.`;
  const text = [`${name} (${email}) just claimed ${code} for ${s.job_title} at ${s.company}.`, "", leftLine].join("\n");
  const html = `<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;color:#111">
<p><b>${esc(name)}</b> (${esc(email)}) just claimed <b>${esc(code)}</b> for ${esc(s.job_title)} at ${esc(s.company)}.</p>
<p>${esc(leftLine)}</p></div>`;
  for (const to of adminEmails()) {
    await sendEmail(to, { subject: `Fast Track: ${code} claimed (${left} left)`, html, text }, { replyTo: email });
  }
}
