// Which countries a visitor sees by default, and the choices in the country filter.
import { headers } from "next/headers";
import { EUR_TO_USD, GBP_TO_USD } from "./ingest/compensation";

export type MarketChoice = "NA" | "US" | "CA" | "UK" | "DE" | "all";

export const MARKET_CHOICES: Record<MarketChoice, { label: string; markets: string[] | null }> = {
  NA: { label: "US + Canada", markets: ["US", "CA"] },
  US: { label: "United States", markets: ["US"] },
  CA: { label: "Canada", markets: ["CA"] },
  UK: { label: "United Kingdom", markets: ["UK"] },
  DE: { label: "Germany", markets: ["DE"] },
  all: { label: "All countries", markets: null },
};

export const isMarketChoice = (v: unknown): v is MarketChoice => typeof v === "string" && v in MARKET_CHOICES;

/**
 * Default for this visitor, from the country Vercel sees their request coming from.
 * UK and Ireland see UK jobs, Germany, Austria and Switzerland see Germany, the US and Canada see
 * US + Canada, everyone else sees everything.
 */
export async function visitorMarket(): Promise<MarketChoice> {
  const c = (await headers()).get("x-vercel-ip-country")?.toUpperCase();
  if (!c || c === "US" || c === "CA") return "NA";
  if (c === "GB" || c === "IE") return "UK";
  if (c === "DE" || c === "AT" || c === "CH") return "DE";
  return "all";
}

/** Markets to filter by, or undefined for no filter. */
export const marketsFor = (choice: MarketChoice): string[] | undefined => MARKET_CHOICES[choice].markets ?? undefined;

/** Pay filter presets. Values are always USD (what the database compares); labels follow the market. */
export function payPresets(choice: MarketChoice, kind: "base" | "ote"): { value: number; label: string }[] {
  if (choice === "UK") {
    const gbp = kind === "base" ? [50, 60, 75, 90, 110] : [80, 100, 125, 150, 200];
    return gbp.map((k) => ({ value: Math.round(k * 1000 * GBP_TO_USD), label: `£${k}K+ ${kind === "base" ? "base" : "OTE"}` }));
  }
  if (choice === "DE") {
    const eur = kind === "base" ? [60, 75, 90, 110, 130] : [100, 130, 160, 200, 250];
    return eur.map((k) => ({ value: Math.round(k * 1000 * EUR_TO_USD), label: `€${k}K+ ${kind === "base" ? "base" : "OTE"}` }));
  }
  const usd = kind === "base" ? [100, 125, 150, 175, 200] : [150, 200, 250, 300, 400];
  return usd.map((k) => ({ value: k * 1000, label: `$${k}K+ ${kind === "base" ? "base" : "OTE"}` }));
}
