// Turning onboarding answers (spec section 11) and search filters into watch
// preferences, plus the cookie that holds an anonymous visitor's answers
// until they sign in.

import { z } from "zod";
import { DEALBREAKERS, type WatchPrefs } from "./match";
import { REMOTE_TYPES, ROLE_FAMILIES, SALES_MOTIONS, SALES_SEGMENTS, type RoleFamily, type SalesSegment } from "./ingest/types";

export const ONBOARDING_COOKIE = "bb_watch";

// The onboarding role choices, in seller language, and what each maps to.
export const ROLE_CHOICES = {
  sdr: { label: "SDR / BDR", families: ["SDR/BDR"], segment: null },
  ae: { label: "Account Executive", families: ["Account Executive"], segment: null },
  ent_ae: { label: "Enterprise AE", families: ["Account Executive"], segment: "Enterprise" },
  strat_ae: { label: "Strategic AE", families: ["Account Executive"], segment: "Strategic" },
  am: { label: "Account Manager", families: ["Account Manager", "Customer Expansion"], segment: null },
  se: { label: "Sales / Solutions Engineer", families: ["Sales Engineer"], segment: null },
  leader: { label: "Sales Leader", families: ["Sales Manager", "Sales Director", "VP Sales", "CRO"], segment: null },
} as const satisfies Record<string, { label: string; families: RoleFamily[]; segment: SalesSegment | null }>;
export type RoleChoice = keyof typeof ROLE_CHOICES;

export const WORK_CHOICES = { remote: "Remote", hybrid: "Hybrid", office: "Office", any: "Any" } as const;
export const MOTION_CHOICES = { new: "New business", expansion: "Expansion", either: "Either" } as const;

export const OnboardingAnswers = z.object({
  roles: z.array(z.enum(Object.keys(ROLE_CHOICES) as [RoleChoice, ...RoleChoice[]])).min(1),
  min_base: z.number().int().positive().nullable(),
  min_ote: z.number().int().positive().nullable(),
  work: z.enum(["remote", "hybrid", "office", "any"]),
  location: z.string().max(80).default(""),
  motion: z.enum(["new", "expansion", "either"]),
  dealbreakers: z.array(z.enum(DEALBREAKERS)).default([]),
});
export type OnboardingAnswers = z.infer<typeof OnboardingAnswers>;

/** What gets stored: the answers (so the form can be edited) plus the derived prefs. */
export const StoredWatch = z.object({
  name: z.string(),
  answers: OnboardingAnswers.optional(),
  prefs: z.object({
    role_families: z.array(z.enum(ROLE_FAMILIES)),
    segments: z.array(z.enum(SALES_SEGMENTS)),
    motions: z.array(z.enum(SALES_MOTIONS)),
    remote_types: z.array(z.enum(REMOTE_TYPES)),
    locations: z.array(z.string()),
    keywords: z.array(z.string()),
    min_base: z.number().nullable(),
    min_ote: z.number().nullable(),
    dealbreakers: z.array(z.enum(DEALBREAKERS)),
  }),
});
export type StoredWatch = z.infer<typeof StoredWatch>;

export function answersToPrefs(a: OnboardingAnswers): WatchPrefs {
  const choices = a.roles.map((r) => ROLE_CHOICES[r]);
  const role_families = [...new Set(choices.flatMap((c) => c.families as readonly RoleFamily[]))];
  // A segment-specific choice only narrows things if every AE choice is segment-specific.
  // Picking plain "AE" alongside "Enterprise AE" means any segment is fine.
  const segmented = choices.filter((c) => c.segment);
  const plainAe = a.roles.includes("ae");
  const segments: SalesSegment[] = segmented.length && !plainAe ? [...new Set(segmented.map((c) => c.segment!))] : [];

  return {
    role_families,
    segments,
    motions: a.motion === "new" ? ["New Logo"] : a.motion === "expansion" ? ["Expansion"] : [],
    remote_types: a.work === "remote" ? ["Remote"] : a.work === "hybrid" ? ["Hybrid"] : a.work === "office" ? ["Onsite"] : [],
    locations: a.location
      .split(/[,;/]/)
      .map((s) => s.trim())
      .filter(Boolean),
    keywords: [],
    min_base: a.min_base,
    min_ote: a.min_ote,
    dealbreakers: a.dealbreakers,
  };
}

/** "Enterprise AE · Remote · $275K+ OTE" */
export function defaultWatchName(a: OnboardingAnswers): string {
  const roles = a.roles.map((r) => ROLE_CHOICES[r].label.replace("Account Executive", "AE"));
  const parts = [roles.slice(0, 2).join(" / ") + (roles.length > 2 ? " +" : "")];
  if (a.work !== "any") parts.push(WORK_CHOICES[a.work]);
  if (a.min_ote) parts.push(`$${Math.round(a.min_ote / 1000)}K+ OTE`);
  else if (a.min_base) parts.push(`$${Math.round(a.min_base / 1000)}K+ base`);
  return parts.join(" · ");
}

export function encodeWatchCookie(w: StoredWatch): string {
  return Buffer.from(JSON.stringify(w)).toString("base64url");
}

export function decodeWatchCookie(v: string | undefined): StoredWatch | null {
  if (!v) return null;
  try {
    return StoredWatch.parse(JSON.parse(Buffer.from(v, "base64url").toString("utf8")));
  } catch {
    return null;
  }
}

/** DB row -> prefs. Rows store arrays directly in matching columns. */
export function rowToPrefs(r: Record<string, unknown>): WatchPrefs {
  return StoredWatch.shape.prefs.parse({
    role_families: r.role_families ?? [],
    segments: r.segments ?? [],
    motions: r.motions ?? [],
    remote_types: r.remote_types ?? [],
    locations: r.locations ?? [],
    keywords: r.keywords ?? [],
    min_base: r.min_base ?? null,
    min_ote: r.min_ote ?? null,
    dealbreakers: (r.dealbreakers as string[] | undefined)?.filter((d) => (DEALBREAKERS as readonly string[]).includes(d)) ?? [],
  });
}
