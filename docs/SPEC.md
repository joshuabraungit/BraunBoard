**V1 Product + Technical Specification**

*HiringCafe-style inventory. Bring a Trailer-style discovery. Built only
for sellers.*

  -----------------------------------------------------------------------
  **Core promise\
  **Tell us the sales job you would take. We will tell you when it shows
  up.
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**V1 launch target**: approximately 5,000 active U.S. B2B sales jobs
across roughly 1,000--2,000 technology/SaaS companies, starting with
Greenhouse, Lever, and Ashby.

# 1. Product concept

Braun Board is a job-discovery product exclusively for people in sales.
It should feel less like a traditional job board and more like a
watchlist-driven marketplace. Users define the sales job they would
actually take, browse current inventory, follow searches and companies,
and receive alerts when relevant new roles appear.

  -----------------------------------------------------------------------
  **Positioning\
  **Stop looking for sales jobs. Tell us what you would take. We will
  tell you when it shows up.
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## The product combines:

-   HiringCafe-like infrastructure: fresh, normalized job inventory
    pulled from public employer career sites and ATS systems.

-   Bring a Trailer-like behavior: follow, watch, get alerted, and
    return for newly surfaced inventory.

-   Sales-specific structure: role, segment, compensation, selling
    motion, self-sourcing expectations, and other seller-native
    attributes.

# 2. V1 scope

Launch with enough inventory to make the product feel alive, but do not
attempt comprehensive U.S. coverage on day one.

  -----------------------------------------------------------------------
  Area                                V1 decision
  ----------------------------------- -----------------------------------
  Inventory target                    \~5,000 active sales jobs

  Companies                           \~1,000--2,000 companies initially;
                                      expand as needed to hit quality
                                      inventory target

  Geography                           United States

  Company focus                       Technology and SaaS first

  ATS sources                         Greenhouse, Lever, Ashby

  Refresh cadence                     Approximately every 4 hours

  Delivery                            Email alerts first

  Public browsing                     No account required

  Saved watches / alerts              Account required
  -----------------------------------------------------------------------

**Build sequence:** start with 200--500 real jobs to validate ingestion,
classification, and card design. Then scale collection until public
inventory reaches roughly 5,000 active jobs.

# 3. Included roles

Focus V1 on B2B sales roles where the sales context can be normalized
consistently.

## Include

-   SDR / BDR

-   Account Executive

-   SMB Account Executive

-   Mid-Market Account Executive

-   Enterprise Account Executive

-   Strategic Account Executive

-   Account Manager

-   Customer Expansion / Growth

-   Sales Engineer / Solutions Engineer

-   Sales Manager

-   Sales Director

-   VP Sales

-   CRO

## Exclude initially

-   Retail sales

-   Insurance agents

-   Real estate agents

-   Commission-only consumer sales

-   Cashier / store associate

-   Generic customer service

-   Recruiting

-   Marketing

-   Revenue Operations

-   Sales Enablement

# 4. Product experience

## Primary navigation

  -----------------------------------------------------------------------
  For You\
  New Today\
  All Jobs\
  Watchlist\
  Companies\
  Alerts
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## Homepage

The homepage should feel like a marketplace. Use a three-column card
grid on desktop, two columns on tablet, and one column on mobile.
Suggested sections:

-   For You --- personalized matches

-   New Today --- newest discovered roles

-   High OTE --- e.g. \$250K+ where explicitly published

-   Remote Enterprise AE

-   Trending Companies --- companies with notable growth in sales
    openings

-   Your Watchlist --- companies and searches the user follows

# 5. Job card design

Company logos are the primary visual asset. Do not generate decorative
artwork for each role. The inventory itself should be the visual
content.

  -----------------------------------------------------------------------
  ROLE TITLE Posted 3h ago\
  Remote --- US\
  \
  \$150K--\$175K base · \$300K OTE\
  \[Company logo\] Gong\
  \
  Enterprise · New Logo · Outbound\
  \
  Short AI-generated seller-specific summary.\
  \
  ♡ Watch View Job →
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## Card priorities

-   Role title

-   Freshness

-   Company logo and company name

-   Location / remote status

-   Base salary and OTE when explicitly available

-   Sales segment / motion tags

-   One concise seller-specific summary

-   Save / Watch / View Job actions

## Logo resolution order

1.  Logo returned from ATS

2.  Company website metadata

3.  Company favicon

4.  Domain-based logo service

5.  Initials fallback

# 6. Job ingestion architecture

Do not build one giant scraper. Build source adapters that output the
same internal job object.

  -----------------------------------------------------------------------
  Company\
  ↓\
  Detect ATS\
  ↓\
  ATS adapter\
  ↓\
  Raw jobs\
  ↓\
  Sales-job classifier\
  ↓\
  Normalize fields\
  ↓\
  Extract sales attributes\
  ↓\
  Deduplicate\
  ↓\
  Store\
  ↓\
  Match against user watches
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## V1 adapters

  -----------------------------------------------------------------------
  /adapters/greenhouse\
  /adapters/lever\
  /adapters/ashby
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## Canonical adapter output

  -----------------------------------------------------------------------
  {\
  \"source_job_id\": \"\",\
  \"company\": \"\",\
  \"title\": \"\",\
  \"location\": \"\",\
  \"description\": \"\",\
  \"salary_min\": null,\
  \"salary_max\": null,\
  \"apply_url\": \"\",\
  \"source_url\": \"\"\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

Do not scrape LinkedIn. Do not crawl pages behind authentication. Prefer
public employer career pages and public ATS endpoints.

# 7. Data model

Use PostgreSQL / Supabase for V1.

## companies

  -----------------------------------------------------------------------
  id\
  name\
  domain\
  logo_url\
  website_url\
  industry\
  employee_range\
  ats_provider\
  ats_identifier\
  careers_url\
  created_at\
  updated_at\
  last_crawled_at
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## jobs

  -----------------------------------------------------------------------
  id\
  company_id\
  source_job_id\
  source_provider\
  source_url\
  apply_url\
  title_raw\
  title_normalized\
  role_family\
  seniority\
  sales_segment\
  location_raw\
  city\
  state\
  country\
  remote_type\
  employment_type\
  salary_min\
  salary_max\
  ote_min\
  ote_max\
  currency\
  description_raw\
  sales_motion\
  self_sourcing_level\
  customer_segment\
  first_seen_at\
  last_seen_at\
  removed_at\
  is_active\
  created_at\
  updated_at
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

# 8. Normalization + sales-specific classification

Preserve the original job title but map it to a normalized role family
and sales segment.

  -----------------------------------------------------------------------
  Sr. Enterprise Account Executive\
  Enterprise AE\
  Enterprise Sales Executive\
  Strategic Enterprise Account Executive\
  \
  → role_family = Account Executive\
  → sales_segment = Enterprise
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## AI extraction should return structured values only. Example:

  -----------------------------------------------------------------------
  {\
  \"role_family\": \"Account Executive\",\
  \"seniority\": \"Individual Contributor\",\
  \"sales_segment\": \"Enterprise\",\
  \"sales_motion\": \"New Logo\",\
  \"self_sourcing_level\": \"High\",\
  \"customer_segment\": \"Enterprise\"\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

### Allowed sales_motion values

  -----------------------------------------------------------------------
  New Logo\
  Expansion\
  Mixed\
  Channel\
  Unknown
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

### Allowed self_sourcing_level values

  -----------------------------------------------------------------------
  Low\
  Medium\
  High\
  Unknown
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

  -----------------------------------------------------------------------
  **Trust rule\
  **Never invent compensation, quota, ACV, quota attainment, territory
  quality, or other facts not explicitly supported by the source. Use
  NULL or Unknown.
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

# 9. Freshness + deduplication

Freshness is a core product feature. Store when Braun Board first
discovered the job, not merely a source-provided date that may be stale.

-   18 min ago

-   2h ago

-   Today

-   Yesterday

-   3d ago

When a job is seen again, update last_seen_at. If a previously indexed
job disappears after multiple checks, set is_active = false and record
removed_at. Do not display inactive listings.

## Deduplicate using a combination of:

-   source_job_id

-   company_id

-   normalized title

-   normalized location

-   description similarity

# 10. Search + watch system

Search should support seller-native filters, but the Watch feature is
the primary differentiation.

## Search filters

-   Role

-   Keyword

-   Company

-   Location

-   Remote status

-   Base salary

-   OTE

-   Sales segment: SMB / Mid-Market / Enterprise / Strategic

-   Sales motion: New Logo / Expansion / Mixed

-   Posted date

## Watch this search

  -----------------------------------------------------------------------
  Enterprise AE\
  Remote US\
  Base \>= \$150K\
  OTE \>= \$275K\
  Enterprise\
  Exclude heavy outbound
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

A user can name this watch, e.g. "Dream Enterprise AE Jobs."

## Company watch

Users can also watch a company. When that company posts a new sales
role, trigger an alert.

# 11. Onboarding

Use conversational onboarding around a single question:

  -----------------------------------------------------------------------
  **Onboarding headline\
  **What sales job would you actually take?
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

-   Role: SDR / BDR / AE / Enterprise AE / Strategic AE / AM / SE /
    Sales Leader

-   Minimum base salary

-   Minimum OTE

-   Work preference: Remote / Hybrid / Office / Any

-   Location (optional)

-   Motion: New business / Expansion / Either

-   Dealbreakers: heavy outbound, early-stage startups, office required,
    no salary listed, commission only, SMB, greenfield territory

Save these answers as the user's primary watch.

# 12. Match score

V1 match scoring must be transparent and based only on the user's stated
preferences. Do not score whether the company is "good."

  -----------------------------------------------------------------------
  94% Match\
  \
  Role ✓\
  Compensation ✓\
  Remote ✓\
  Segment ✓\
  Motion ✓
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

Unknown values should not automatically count against the role.

# 13. Alerts

Start with email. Push notifications and SMS are out of scope for V1.

  -----------------------------------------------------------------------
  Alert frequency:\
  Instant\
  Daily Digest\
  Off
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

  -----------------------------------------------------------------------
  3 new jobs match your Enterprise AE watch\
  \
  94% --- Enterprise AE --- Gong\
  \$160K--\$180K base · Remote\
  \
  91% --- Strategic AE --- Wiz\
  \$300K OTE · Remote\
  \
  88% --- Enterprise AE --- Datadog\
  Remote\
  \
  See all matches →
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

# 14. Company + job detail pages

## Company page

  -----------------------------------------------------------------------
  /company/gong\
  \
  Logo\
  Company name\
  Website\
  \
  12 open sales jobs\
  \
  Sales roles added:\
  Last 7 days\
  Last 30 days\
  \
  Current openings\
  \
  Watch Company
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## Job detail page

  -----------------------------------------------------------------------
  /jobs/gong-enterprise-account-executive-123\
  \
  Company logo\
  Role\
  Company\
  Location\
  \
  Base\
  OTE\
  Posted\
  \
  Apply\
  Watch Company\
  Save Job
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

### Seller-oriented sections

-   The role

-   Selling motion

-   Who you are selling to

-   Pipeline expectations

-   Compensation

-   What is not disclosed

  -----------------------------------------------------------------------
  **What is not disclosed\
  **Explicitly tell the user when the posting does not disclose quota
  attainment, quota size, average deal size, territory size, or other
  seller-relevant details. This is a trust feature.
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

# 15. Visual direction

Take inspiration from HiringCafe's information density and Bring a
Trailer's marketplace feel, but do not clone either product.

-   White or warm-white background

-   Dark typography

-   Very light borders

-   Company logos as the primary imagery

-   Compact cards

-   Minimal gradients

-   Minimal illustration

-   No generic stock photography

-   No giant SaaS graphics

-   Compensation and freshness visually prominent

## Mobile

Use one-column cards. On job detail pages, use sticky bottom actions for
Save and Apply.

# 16. Authentication + admin

Use Supabase Auth. Support email and Google sign-in. Browsing does not
require an account. Saving, watching, and alerts do.

## Admin dashboard

-   Companies monitored

-   Active jobs

-   New jobs today

-   Jobs removed today

-   Jobs by ATS provider

-   Crawler errors

-   Jobs requiring review

### Admin actions

-   Disable company

-   Disable job

-   Correct role classification

-   Trigger company refresh

# 17. Seed strategy

Create an initial seed list of approximately 1,500 technology/SaaS
companies using Greenhouse, Lever, or Ashby. Increase coverage if
necessary to reach approximately 5,000 high-quality active sales
openings.

  -----------------------------------------------------------------------
  **Quality bar\
  **Optimize for relevant B2B sales inventory, freshness, and reliability
  --- not an arbitrary company count.
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

# 18. Explicitly out of scope for V1

-   Resume builder

-   AI resume rewriting

-   Automatic applications

-   LinkedIn integration

-   Recruiter messaging

-   Candidate database

-   Company reviews

-   RepVue integration

-   Quota attainment estimates

-   Territory ratings

-   Interview preparation

-   Salary negotiation

-   Social network

-   Comments

-   Messaging

-   Native mobile app

# 19. V1 success metrics

The main product question is: when someone creates a watch, do they
consistently receive jobs they would actually consider?

-   Alert open rate

-   Job click rate

-   Save rate

-   Apply click rate

-   Watch creation rate

-   Jobs hidden / disliked

-   7-day retention

-   30-day retention

**Primary signal:** percentage of alerts that result in a job-detail
click.

# 20. Recommended implementation sequence

6.  Create Supabase schema and authentication.

7.  Build company seed import and ATS detection.

8.  Build Greenhouse adapter and ingest the first real jobs.

9.  Add sales-role classifier and normalized role taxonomy.

10. Build job grid, job cards, company page, and job detail page.

11. Add Lever and Ashby adapters.

12. Add deduplication, first-seen/last-seen logic, and inactive-job
    handling.

13. Add watch creation and preference storage.

14. Add match scoring.

15. Add email alert generation and delivery.

16. Build admin dashboard and crawler error visibility.

17. Scale from 200--500 test jobs toward roughly 5,000 active sales
    jobs.

# 21. V1 acceptance criteria

-   At least 200--500 real sales jobs can be ingested during development
    from supported ATS sources.

-   Every visible job links to the original employer/ATS application
    page.

-   Job cards show company logos with a reliable fallback.

-   Roles are normalized into the defined sales taxonomy.

-   No unsupported compensation or seller metrics are invented.

-   Freshness reflects Braun Board first-seen time.

-   Duplicate listings are suppressed.

-   Users can create a watch, save jobs, watch companies, and edit alert
    frequency.

-   New matching jobs can trigger an email alert.

-   Inactive jobs disappear from browse/search results.

-   The interface is responsive on desktop, tablet, and mobile.

-   Admin can inspect crawler errors and manually disable bad records.

# 22. Product mantra

  -----------------------------------------------------------------------
  **Braun Board\
  **The sales jobs worth knowing about, delivered.
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

Do not optimize V1 for breadth. Optimize for trust: fresh jobs, useful
sales-specific structure, clean cards, and alerts that feel worth
opening.
