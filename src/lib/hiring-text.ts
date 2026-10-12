import type { CompanyStats } from "./data";

/** One plain sentence about how a company is hiring. */
export function hiringSentence(s: CompanyStats): string {
  const roles = (n: number) => `${n} sales role${n === 1 ? "" : "s"}`;
  if (s.trend === "ramping")
    return `Posted ${roles(s.new_30d)} in the last 30 days${s.new_prev_30d ? `, up from ${s.new_prev_30d} the month before` : ""}.`;
  if (s.trend === "pulling_back")
    return s.open_roles_30d_ago != null && s.open_roles < s.open_roles_30d_ago
      ? `Down to ${roles(s.open_roles)} open from ${s.open_roles_30d_ago} a month ago.`
      : `Closed ${roles(s.closed_30d)} in the last 30 days and posted ${s.new_30d}.`;
  return s.new_30d ? `Posted ${roles(s.new_30d)} in the last 30 days.` : "No new sales roles posted in the last 30 days.";
}

