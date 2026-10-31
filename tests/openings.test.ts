import { describe, expect, it } from "vitest";
import type { JobView } from "../src/lib/data";
import { collapseOpenings } from "../src/lib/openings";

const job = (id: string, title: string, city: string | null, company = "Braze") =>
  ({ id, title_raw: title, company_name: company, city, state: city ? "NY" : null, remote_type: "Unknown", markets: ["US"] }) as unknown as JobView;

describe("collapseOpenings", () => {
  it("shows one card per company, title and place, counting the openings", () => {
    const r = collapseOpenings([
      job("a", "Account Executive, Enterprise", "New York"),
      job("b", "Account Executive, Enterprise", "Chicago"),
      job("c", "account executive, enterprise ", "New York"),
      job("d", "Account Executive, Enterprise", "New York", "Stripe"),
    ]);
    expect(r.map((x) => [x.job.id, x.openings])).toEqual([["a", 2], ["b", 1], ["d", 1]]);
  });
});
