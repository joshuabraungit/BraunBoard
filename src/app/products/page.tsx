import type { Metadata } from "next";
import Link from "next/link";
import { CompanyLogo } from "@/components/CompanyLogo";
import { WatchCompanyButton } from "@/components/Actions";
import { TrendBadge } from "@/components/Hiring";
import { SeeJobs, TrackClick } from "@/components/ProductTrack";
import { formatComp, formatLocation } from "@/lib/format";
import { freshnessLabel } from "@/lib/freshness";
import { MARKET_CHOICES, isMarketChoice, marketsFor, visitorMarket, type MarketChoice } from "@/lib/market";
import {
  PRODUCT_CATEGORIES,
  PRODUCT_SORTS,
  ROLE_GROUPS,
  categoryCounts,
  isProductCategory,
  isProductSort,
  isRoleGroup,
  loadProductData,
  productCards,
  type ProductSort,
  type RoleGroup,
} from "@/lib/products";
import { getUserState } from "@/lib/session";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  alternates: { canonical: "/products" },
  title: "What you'd sell: sales jobs by product · Braun Board",
  description: "Find a product you'd be excited to sell. Every company's product in plain English, with its open sales roles.",
};

type SP = { cat?: string; role?: string; q?: string; sort?: string; country?: string };

export default async function Products({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const category = isProductCategory(sp.cat) ? sp.cat : undefined;
  const role = isRoleGroup(sp.role) ? sp.role : undefined;
  const sort: ProductSort = isProductSort(sp.sort) ? sp.sort : "open";
  const q = (sp.q ?? "").trim().slice(0, 60);
  const market: MarketChoice = isMarketChoice(sp.country) ? sp.country : await visitorMarket();
  const markets = marketsFor(market);

  const [data, state] = await Promise.all([loadProductData(), getUserState()]);
  const cards = productCards(data, { category, role, q, sort, markets });
  const counts = categoryCounts(data, markets, role);

  // Links keep the other filters as they are.
  const href = (patch: Partial<SP>) => {
    const p = new URLSearchParams();
    const next = { cat: category, role, q: q || undefined, sort: sort === "open" ? undefined : sort, country: sp.country, ...patch };
    for (const [k, v] of Object.entries(next)) if (v) p.set(k, v);
    const s = p.toString();
    return s ? `/products?${s}` : "/products";
  };
  const back = href({});
  const chip = "inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-semibold";
  const on = "border-ink bg-ink text-white";
  const off = "border-line-strong bg-surface text-ink hover:border-ink";

  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">What you&apos;d sell</h1>
      <div className="mt-3 max-w-2xl space-y-2 text-ink-2">
        <p>Job posts say things like &ldquo;AI-native revenue orchestration platform.&rdquo;</p>
        <p className="font-semibold text-ink">Cool. What does it do?</p>
        <p>
          Every company here gets a plain-English answer, pulled from its own job posts. Because it&apos;s hard to sell something you can&apos;t explain.
        </p>
      </div>

      <nav aria-label="What you'd sell" className="mt-6 flex flex-wrap gap-2">
        <Link href={href({ cat: undefined })} aria-current={!category ? "page" : undefined} className={`${chip} ${!category ? on : off}`}>
          All
        </Link>
        {PRODUCT_CATEGORIES.filter((c) => counts.get(c) || c === category).map((c) => (
          <Link key={c} href={href({ cat: c })} aria-current={c === category ? "page" : undefined} className={`${chip} ${c === category ? on : off}`}>
            {c}
            <span className={`ml-1.5 text-xs font-normal ${c === category ? "text-white/80" : "text-ink-3"}`}>{counts.get(c) ?? 0}</span>
          </Link>
        ))}
      </nav>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <nav aria-label="Role" className="flex flex-wrap gap-1 rounded-xl border border-line-strong bg-surface p-1">
          {([undefined, ...Object.keys(ROLE_GROUPS)] as (RoleGroup | undefined)[]).map((r) => (
            <Link
              key={r ?? "all"}
              href={href({ role: r })}
              aria-current={r === role ? "page" : undefined}
              className={`inline-flex min-h-10 items-center rounded-lg px-3 text-sm font-semibold ${r === role ? "bg-accent-soft text-accent" : "text-ink-2 hover:text-ink"}`}
            >
              {r ? ROLE_GROUPS[r].label : "All roles"}
            </Link>
          ))}
        </nav>
        <form action="/products" className="flex min-w-0 flex-1 flex-wrap items-center gap-2 sm:flex-none">
          {category && <input type="hidden" name="cat" value={category} />}
          {role && <input type="hidden" name="role" value={role} />}
          {sp.country && <input type="hidden" name="country" value={sp.country} />}
          <label htmlFor="products-q" className="sr-only">Search products</label>
          <input
            id="products-q"
            name="q"
            defaultValue={q}
            placeholder="Search: payments, hospitals, AI…"
            className="min-h-11 min-w-0 basis-full rounded-lg border border-line-strong bg-surface px-3 text-sm sm:w-64 sm:basis-auto"
          />
          <label htmlFor="products-sort" className="sr-only">Sort</label>
          <select id="products-sort" name="sort" defaultValue={sort} className="min-h-11 rounded-lg border border-line-strong bg-surface px-2 text-sm">
            {(Object.keys(PRODUCT_SORTS) as ProductSort[]).map((k) => (
              <option key={k} value={k}>{PRODUCT_SORTS[k]}</option>
            ))}
          </select>
          <button className="min-h-11 rounded-lg border border-ink px-3 text-sm font-semibold hover:bg-ink hover:text-white">Go</button>
        </form>
      </div>

      <p className="mt-4 text-sm text-ink-2">
        {cards.length} {cards.length === 1 ? "company" : "companies"}
        {q && <> matching &ldquo;{q}&rdquo;</>} hiring{market === "all" ? "" : ` in ${MARKET_CHOICES[market].label}`}.{" "}
        {(q || category || role) && (
          <Link href="/products" className="font-semibold text-ink underline underline-offset-2">Clear filters</Link>
        )}
      </p>

      {cards.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-dashed border-line-strong p-8 text-center text-ink-2">
          Nothing matches that yet. Try another product, role or search.
        </p>
      ) : (
        <ul className="mt-6 grid grid-cols-1 items-start gap-4 md:grid-cols-2 lg:grid-cols-3">
          {cards.map((c) => (
            <li key={c.id} className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-5">
              <div className="flex items-center gap-3">
                <CompanyLogo name={c.name} logoUrl={c.logo_url} domain={c.domain} size={44} />
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-[17px] font-bold">
                    <Link href={`/company/${c.slug}`} className="hover:underline">{c.name}</Link>
                  </h2>
                  {c.category && (
                    <Link href={href({ cat: c.category })} className="text-xs font-bold uppercase tracking-wide text-accent hover:underline">
                      {c.category}
                    </Link>
                  )}
                </div>
                {c.trend !== "steady" && <TrendBadge trend={c.trend} />}
              </div>

              {c.story ? (
                <>
                  {c.short && <p className="text-[17px] font-bold leading-snug">{c.short}</p>}
                  <p className="text-[15px] leading-relaxed text-ink-2">{c.story}</p>
                  <p className="text-xs text-ink-3">
                    What they sell, in plain English, from their own job posts.{" "}
                    <TrackClick event="report" company={c.id}>
                      <Link href={`/ask?about=${encodeURIComponent(c.name)}`} className="underline underline-offset-2 hover:text-ink">
                        Something wrong? Tell us
                      </Link>
                    </TrackClick>
                  </p>
                </>
              ) : c.checked ? (
                <p className="text-[15px] text-ink-3">Their job posts don&apos;t say what they sell, so we won&apos;t guess.</p>
              ) : (
                <p className="text-[15px] text-ink-3">We haven&apos;t written this one up yet. Check back soon.</p>
              )}

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-sm font-semibold">
                  {c.open} open {c.open === 1 ? "role" : "roles"}
                  {c.new_30d > 0 && <span className="font-normal text-ink-3"> · {c.new_30d} new in 30 days</span>}
                </span>
                <TrackClick event="watch" company={c.id} className="ml-auto">
                  <WatchCompanyButton
                    companyId={c.id}
                    on={state.watchedCompanyIds.has(c.id)}
                    back={back}
                    className="min-h-11 rounded-lg border border-line-strong px-3 text-sm font-semibold hover:border-ink aria-pressed:border-fresh aria-pressed:text-fresh"
                  />
                </TrackClick>
              </div>

              <SeeJobs company={c.id} count={c.open}>
                <ul className="divide-y divide-line border-y border-line">
                  {c.jobs.slice(0, 5).map((j) => {
                    const pay = formatComp(j);
                    return (
                      <li key={j.slug}>
                        <Link href={`/jobs/${j.slug}`} className="group block py-3">
                          <span className="block text-[15px] font-semibold group-hover:underline">{j.title_raw}</span>
                          <span className="block text-sm text-ink-2">
                            {formatLocation(j)} · {freshnessLabel(j.posted_at)}
                          </span>
                          <span className={`block text-sm font-semibold ${pay ? "text-accent" : "text-ink-3"}`}>{pay || "Pay not listed"}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
                {c.open > 5 && (
                  <TrackClick event="see_all" company={c.id}>
                    <Link href={`/company/${c.slug}`} className="mt-3 inline-block text-sm font-semibold underline underline-offset-2">
                      See all {c.open} {c.name} roles →
                    </Link>
                  </TrackClick>
                )}
              </SeeJobs>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
