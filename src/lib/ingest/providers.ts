import type { AtsProvider } from "./types";

/**
 * Boards we crawl. Workday and SmartRecruiters adapters exist but are switched off
 * pending a legal review: Workday has no official public API, and SmartRecruiters'
 * robots.txt disallows crawlers. Add them back here only once that's settled.
 */
export const ENABLED_PROVIDERS: AtsProvider[] = ["greenhouse", "lever", "ashby"];
