# Braun Board

**Tell us the sales job you would take. We will tell you when it shows up.**

A watchlist-driven job board built only for B2B sellers. Fresh inventory pulled from public employer ATS boards (Greenhouse, Lever, Ashby), normalized into a seller-native taxonomy, with email alerts when a job matching your watch appears.

Full product spec: [`docs/SPEC.md`](docs/SPEC.md)

## Stack

- **Next.js 15** (App Router, TypeScript, Tailwind v4)
- **Supabase** (Postgres + Auth) for data, accounts and row-level security
- **Anthropic API** for seller-specific attribute extraction (optional, falls back to keyword rules)
- **Resend** for alert email (optional, dry-runs without it)
- **GitHub Actions** cron for the 4-hour refresh and daily digest

## Getting started

```bash
npm install
npm run dev        # http://localhost:3000, shows sample jobs until Supabase is connected
npm test           # classifier, comp parsing, location, match scoring, freshness
```

### Connect real data

1. Create a Supabase project. Run `supabase/migrations/0001_init.sql` in the SQL editor (or `supabase db push`).
2. Turn on Email and Google providers under Authentication.
3. `cp .env.example .env.local` and fill in the keys.
4. Seed companies and detect their ATS:
   ```bash
   npm run seed -- data/seed-companies.csv
   ```
5. Pull jobs:
   ```bash
   npm run ingest -- --all
   ```
6. For scheduled runs, add the same env vars as GitHub repo secrets. `.github/workflows/ingest.yml` runs ingestion every 4 hours and the digest daily.

## How ingestion works

```
Company → detect ATS → adapter → raw jobs → sales classifier → normalize
       → extract sales attributes → dedupe → store → match against watches → alerts
```

| Piece | File | Notes |
|---|---|---|
| Adapters | `src/lib/ingest/adapters/*` | One per ATS, all return the same `RawJob` shape |
| ATS detection | `src/lib/ingest/detect-ats.ts` | Sniffs careers URLs, or probes public APIs with guessed board tokens |
| Sales classifier | `src/lib/ingest/classify.ts` | Rule-based. Includes/excludes per spec section 3, maps to role family, seniority, segment |
| Location | `src/lib/ingest/location.ts` | US-only filter, remote/hybrid/onsite. Bare "Remote" is kept but flagged `needs_review` |
| Compensation | `src/lib/ingest/compensation.ts` | **Trust rule:** only explicitly published, explicitly labeled pay. Unlabeled ranges are dropped |
| AI extraction | `src/lib/ingest/extract.ts` | Motion, self-sourcing, customer segment, summary, and what the posting does/doesn't disclose. Enum-validated, `Unknown` over guesses |
| Dedupe | `src/lib/ingest/dedupe.ts` | company + normalized title + location, then description similarity |
| Pipeline | `src/lib/ingest/pipeline.ts` | First-seen/last-seen, two missed crawls before a job is hidden, failed crawls never remove jobs |
| Match score | `src/lib/match.ts` | Transparent, based only on stated preferences. Unknowns are neutral. Dealbreakers block |
| Alerts | `src/lib/alerts/*` | Matches recorded at ingest, sent instant or daily, click tracked via `/r/[id]` |

## Build status (spec section 20)

- [x] 1. Supabase schema (auth tables + RLS included)
- [x] 2. Company seed import + ATS detection
- [x] 3. Greenhouse adapter
- [x] 4. Sales-role classifier + normalized taxonomy
- [x] 5. Job grid, job cards, company page, job detail page
- [x] 6. Lever + Ashby adapters
- [x] 7. Dedupe, first-seen/last-seen, inactive-job handling
- [ ] 8. Watch creation + preference storage UI (onboarding at `/for-you`), Supabase Auth sign-in pages
- [x] 9. Match scoring (logic + tests; UI display pending)
- [x] 10. Email alert generation + delivery
- [ ] 11. Admin dashboard (data is there: `crawl_runs`, `needs_review`, `is_disabled`)
- [ ] 12. Scale from 200–500 test jobs toward ~5,000. Grow `data/seed-companies.csv` toward ~1,500 companies

## Notes

- Never scrape LinkedIn or anything behind auth. Every adapter hits a documented public endpoint.
- `data/seed-companies.csv` is a starter list of 40. Rows without a `careers_url` get their ATS detected by probing.
- Sample data in `src/lib/sample-data.ts` uses made-up companies and only shows when Supabase isn't configured.
