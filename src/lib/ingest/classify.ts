// Rule-based title classifier. Spec sections 3 + 8.
// Decides (1) is this a V1 B2B sales role at all, and (2) its role family,
// seniority and segment. Deterministic on purpose: titles carry most of the
// signal and rules are cheap, testable and easy for an admin to reason about.
// The AI step (extract.ts) fills in what titles can't tell us.

import type { RoleFamily, SalesSegment, Seniority } from "./types";

export interface TitleClassification {
  role_family: RoleFamily;
  seniority: Seniority;
  sales_segment: SalesSegment;
  title_normalized: string;
  is_channel: boolean;
}

// Anything matching these is out of scope for V1, even if it says "sales".
const EXCLUDE = [
  /\b(rev(enue)?\s*ops|revenue operations|sales operations|sales ops|gtm operations|deal desk)\b/i,
  /\b(enablement|sales training|onboarding specialist)\b/i,
  /\b(recruit(er|ing)|talent acquisition|sourcer)\b/i,
  /\b(people|hr|human resources)( business)? partner\b/i, // HR, even when the title says "Field Sales"
  /\b(marketing|demand gen|growth marketing|content|brand|communications|pr manager)\b/i,
  /\b(retail|store|cashier|associate,? (store|retail)|showroom)\b/i,
  /\b(insurance|real estate|realtor|mortgage|loan officer|licensed agent)\b/i,
  /\b(customer (service|support|care)|support (specialist|engineer|agent)|call center)\b/i,
  /\bcommission[- ]only\b/i,
  /\b(analyst|data scientist|software engineer|developer|designer|product manager|counsel|attorney|paralegal)\b/i,
  /\b(intern|internship|apprentice)\b/i,
  /\btechnical account manager\b/i,
  // Engineers who don't sell: anything "engineer(ing)" that isn't a sales / solutions / presales / value engineer
  /\bengineering (manager|director|lead)\b/i,
  /\b(software|data|backend|back-end|frontend|front-end|full[- ]stack|platform|infrastructure|site reliability|ml|machine learning|security|qa|test|devops|mobile|ios|android|staff|principal) engineer/i, // post-sales technical support, not a selling role
  /\b(future|talent (pool|community|network)|general (application|interest)|evergreen|pipeline req)\b/i,
  /\bopportunities\s*$/i,
  /\b(sales tax|tax)\b/i,
  /\b(compensation|commissions?) (analyst|manager|specialist|administrator)\b/i,
  /\b(sales|solutions) (strategy|planning|programs?)\b/i,
];

// Order matters: first match wins, so more specific families come first.
const FAMILIES: { family: RoleFamily; re: RegExp }[] = [
  { family: "CRO", re: /\b(chief revenue officer|cro|chief sales officer|cso)\b/i },
  { family: "VP Sales", re: /\b(vp|rvp|avp|gvp|vice president|svp|evp|head)\b.*\b(sales|revenue|business development)\b/i },
  { family: "Sales Director", re: /\b(director|sr\.? director|senior director)\b.*\b(sales|account executives?|business development|solutions engineering|sales engineering|account management)\b/i },
  { family: "Sales Director", re: /\b(sales|regional|area) director\b/i },
  { family: "Sales Engineer", re: /\b(sales engineer|solutions? engineer|solutions? consultant|pre-?sales|solutions? architect.*(sales|pre-?sales)|value engineer)\b/i },
  { family: "Sales Manager", re: /\b(sales manager|manager,? (sales|account executives?|business development|sales development|sdrs?|bdrs?|solutions engineering)|(sdr|bdr|sales development|business development|ae|account executive) (team )?(manager|lead)|regional sales manager|area sales manager|first[- ]line sales manager)\b/i },
  { family: "SDR/BDR", re: /\b(sdr|bdr|sales development|business development rep(resentative)?|market development rep|lead development|outbound rep)\b/i },
  { family: "Customer Expansion", re: /\b(expansion|growth account (executive|manager)|upsell|account (executive|manager),? (expansion|growth))\b/i },
  { family: "Account Manager", re: /\b(account manager|client partner|customer account manager|named account manager)\b/i },
  { family: "Account Executive", re: /\b(account executive|ae\b|sales executive|enterprise sales|account director|sales representative|sales rep|business development (executive|manager)|new business (sales|executive)|partner (sales )?(manager|executive)|channel (sales )?(manager|account executive)|alliances? manager)\b/i },
];

const SEGMENTS: { segment: SalesSegment; re: RegExp }[] = [
  { segment: "Strategic", re: /\b(strategic|global accounts?|major accounts?|key accounts?|named accounts?|large enterprise|fortune \d+)\b/i },
  { segment: "Enterprise", re: /\b(enterprise|ent\.?)\b/i },
  { segment: "Mid-Market", re: /\b(mid[- ]?market|mm|midmarket|corporate)\b/i },
  { segment: "SMB", re: /\b(smb|small business|small and medium|small & medium|velocity|emerging|startups?)\b/i },
];

// Partnerships / channel roles. Titles only: the model's read of the description tagged regional
// sales directors as "Channel", which is noise for someone hunting partner roles.
const CHANNEL = /\b(channel|partners?|partnerships?|alliances?|resellers?|ecosystems?)\b/i;
// "Client Partner" and "Account Partner" are account management, not partnerships.
const NOT_CHANNEL = /\b(client|account) partners?\b/i;

/** Is this a partnerships or channel role, judged by the title? */
export function isChannelTitle(title: string): boolean {
  return CHANNEL.test(title) && !NOT_CHANNEL.test(title);
}

function seniorityFor(family: RoleFamily): Seniority {
  switch (family) {
    case "Sales Manager":
      return "Manager";
    case "Sales Director":
      return "Director";
    case "VP Sales":
    case "CRO":
      return "Executive";
    default:
      return "Individual Contributor";
  }
}

/** Collapse noise so "Sr. Enterprise Account Executive (Remote, US)" and "Senior Enterprise AE" compare equal. */
export function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/\(.*?\)|\[.*?\]/g, " ") // parentheticals are usually location / req ids
    .replace(/\s[-–|,]\s.*$/, " ") // "AE - Remote" / "AE | NYC"
    .replace(/\bsr\.?\b/g, "senior")
    .replace(/\bjr\.?\b/g, "junior")
    .replace(/\bae\b/g, "account executive")
    .replace(/\bmm\b/g, "mid-market")
    .replace(/\bmid market\b/g, "mid-market")
    .replace(/[^a-z0-9\- ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Returns null when the title isn't an in-scope B2B sales role. */
export function classifyTitle(rawTitle: string): TitleClassification | null {
  const title = rawTitle.trim();
  if (!title) return null;
  if (EXCLUDE.some((re) => re.test(title))) return null;

  const hit = FAMILIES.find((f) => f.re.test(title));
  if (!hit) return null;

  // "Strategic Cuisines" (Toast) is a restaurant category, not a deal-size segment.
  const segTitle = title.replace(/\bstrategic cuisines?\b/gi, "");
  const seg = SEGMENTS.find((s) => s.re.test(segTitle));
  return {
    role_family: hit.family,
    seniority: seniorityFor(hit.family),
    sales_segment: seg?.segment ?? "Unknown",
    title_normalized: normalizeTitle(title),
    is_channel: isChannelTitle(title),
  };
}
