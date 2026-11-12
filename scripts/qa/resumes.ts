// Made-up résumés for testing "Say it in their words". No real people.
// Written the way text comes out of a PDF: some lines wrap mid-sentence, bullets vary.
// role = which Braun Board jobs to test against. facts = "Things I've done" already saved.
// answer = what this person says "yes" with when a gap question comes up (true, modest).

export interface TestResume {
  name: string;
  role: "SDR/BDR" | "Account Executive" | "Account Manager" | "Partnerships" | "Sales Leadership";
  why: string;
  text: string;
  facts?: string[];
  answer: string;
}

export const RESUMES: TestResume[] = [
  {
    name: "sdr-strong",
    role: "SDR/BDR",
    why: "SDR with clear numbers",
    answer: "Yes, I wrote my own email sequences in Outreach for two quarters. Reply rate was around 9%.",
    text: `Priya Raman
Austin, TX | priya.raman@example.com | linkedin.com/in/priyaraman-example
EXPERIENCE
Sales Development Representative, Lumenstack (HR software)          Mar 2024 - Present
• Book meetings for 3 mid-market AEs through cold calls, email and LinkedIn
• Set 142 qualified meetings in 2024, 118% of annual target
• Ranked #2 of 11 SDRs for pipeline sourced in Q1 2025 ($1.4M)
• Researched accounts in ZoomInfo and wrote first-touch emails tailored to
HR directors at 200 to 1,000 employee companies
Customer Service Associate, Brightline Bank                                   2022 - 2024
• Answered 60+ customer calls a day about accounts and cards
• Trained 4 new hires on the phone system
EDUCATION
BBA, Marketing, Texas State University, 2022
SKILLS
Salesforce, Outreach, ZoomInfo, LinkedIn Sales Navigator, Gong`,
  },
  {
    name: "ae-midmarket",
    role: "Account Executive",
    why: "Mid-market AE, strong numbers, has saved facts",
    facts: ["Mutual action plans: I build a written close plan with the champion on every deal over $50K"],
    answer: "Yes. I ran discovery and demos for a couple of deals with IT security teams, maybe 3 or 4 total.",
    text: `Marcus Bell
Chicago, IL · marcus.bell@example.com
PROFESSIONAL EXPERIENCE
Account Executive, Mid-Market — Fieldwise (field service software)    2021 – Present
- Closed $1.9M in new ARR in FY2024 (131% of quota), average deal $42K
- Ran full cycle from discovery to close with operations leaders at
companies with 100–2,000 employees
- Built pipeline myself: about 40% of my closed deals were self-sourced
- President's Club 2023
Sales Development Rep — Fieldwise                                             2019 – 2021
- Promoted to AE after 20 months
- Generated $3.2M in pipeline for the mid-market team
EDUCATION
B.A. Communications, University of Illinois`,
  },
  {
    name: "ae-enterprise-fintech",
    role: "Account Executive",
    why: "Enterprise AE in fintech, long cycles",
    answer: "Yes, I've worked deals with procurement and legal on almost every enterprise contract. Usually 3 to 6 months of back and forth.",
    text: `Elena Vasquez
New York, NY | elena.v@example.com
SUMMARY
Enterprise seller with 8 years in payments and banking software.
EXPERIENCE
Enterprise Account Executive | Ledgerline Payments | 2020–Present
• Sell treasury and payments software to CFOs and treasurers at banks and
large corporates
• Closed 6 seven-figure deals since 2020; largest $3.4M TCV
• Sales cycles of 9 to 14 months with 8+ stakeholders
• 2023: 104% of $2.5M quota
Account Executive | Clearbridge Financial Data | 2016–2020
• Grew a book of 30 asset managers; 96% gross retention
EDUCATION
BS Finance, Fordham University`,
  },
  {
    name: "career-changer-teacher",
    role: "SDR/BDR",
    why: "Teacher moving into sales, no sales numbers",
    answer: "Yes, I called parents every week, about 25 calls a week, including some hard conversations.",
    text: `Jordan Ellis
Denver, CO | jordan.ellis@example.com
EXPERIENCE
7th Grade Science Teacher, Mountain View Middle School         2018 – 2025
• Taught 5 classes of about 30 students each
• Led the school's robotics club and raised $6,000 from local businesses for
competition travel
• Chair of the science department (2022 – 2025)
• Created a new lab curriculum adopted by 3 other schools in the district
Server, Copper Kettle Restaurant                                           2014 – 2018
• Upsold specials and wine; regularly top in weekly sales among 12 servers
EDUCATION
B.S. Biology, Colorado State University
Teaching License, State of Colorado`,
  },
  {
    name: "ae-thin",
    role: "Account Executive",
    why: "Thin résumé, almost no numbers",
    answer: "Yes, I did some outbound prospecting on my own, mostly cold email.",
    text: `Sam Okafor
Atlanta, GA - sam.okafor@example.com
Experience
Account Executive, Brightpath Software
Responsible for selling software to small businesses
Managed a pipeline of deals
Worked closely with marketing and customer success
Hit my numbers most quarters
Sales Associate, Verizon Wireless Store
Helped customers choose phones and plans
Education
Georgia State University`,
  },
  {
    name: "account-manager",
    role: "Account Manager",
    why: "Account manager focused on renewals and expansion",
    answer: "Yes, I put together quarterly business reviews for my top 15 accounts.",
    text: `Hannah Brooks
Seattle, WA | hannah.brooks@example.com
EXPERIENCE
Account Manager, Crateful (warehouse software)                     2022 – Present
• Own renewals and upsells for 85 existing customers, about $4.8M ARR
• 108% net revenue retention in 2024
• Expanded 12 accounts from one warehouse to multiple sites
• Work with Customer Success on at-risk accounts
Customer Success Manager, Crateful                                          2020 – 2022
• Onboarded 40 new customers
EDUCATION
BA Economics, University of Washington`,
  },
  {
    name: "hospitality-inside-sales",
    role: "Account Executive",
    why: "Inside sales to restaurants, short cycles",
    answer: "Yes, I sold to multi-location groups a few times, the biggest had 7 locations.",
    text: `Luis Moreno
Miami, FL · luis.moreno@example.com
WORK HISTORY
Inside Sales Rep, TableReady (restaurant POS)            2023 - present
• Sell point-of-sale systems to independent restaurant owners by phone
and in person
• Close 15 to 20 new locations a month; 2024 total: 212 locations
• Sales cycle usually 1 to 3 weeks
Restaurant Manager, La Brisa                                  2017 - 2023
• Ran front of house for a 120-seat restaurant
• Chose and rolled out our first POS system
EDUCATION
Miami Dade College, Hospitality Management`,
  },
  {
    name: "partnerships",
    role: "Partnerships",
    why: "Partner manager, channel",
    answer: "Yes, I ran joint webinars with two partners last year.",
    text: `Aisha Thompson
Remote (Raleigh, NC) | aisha.t@example.com
EXPERIENCE
Partner Manager, Quillcraft (marketing software)                       2021–Present
• Manage 25 agency and reseller partners
• Partner-sourced revenue grew from $600K to $2.1M (2021 to 2024)
• Recruited and onboarded 9 new agency partners
• Train partner sellers on demos and pricing
Account Executive, Quillcraft                                                   2019–2021
• Sold to marketing directors at small businesses
EDUCATION
BA English, UNC Chapel Hill`,
  },
  {
    name: "sdr-manager",
    role: "Sales Leadership",
    why: "SDR manager moving up",
    answer: "Yes, I built our SDR onboarding program, about 3 weeks long.",
    text: `Kevin Park
San Francisco, CA | kevin.park@example.com
EXPERIENCE
Manager, Sales Development | Tallyho (expense software) | 2022 - Present
• Lead a team of 8 SDRs supporting enterprise and mid-market AEs
• Team hit 112% of meetings target in 2024
• Hired 11 SDRs; 5 promoted to AE
• Weekly call coaching using Gong
Senior SDR | Tallyho | 2020 - 2022
• Top SDR 5 of 8 quarters
EDUCATION
UC Davis, BA Psychology`,
  },
  {
    name: "retail-to-b2b",
    role: "Account Executive",
    why: "B2C retail seller moving to B2B",
    facts: ["Prospecting: I built a list of 40 local businesses and cold called them to set up corporate gift accounts at the store"],
    answer: "Yes, I've given product demos to small groups, maybe 10 people at a time, at in-store events.",
    text: `Tara Nguyen
Phoenix, AZ | tara.nguyen@example.com
EXPERIENCE
Store Sales Lead, Summit Outdoor Gear                              2019 – Present
• Top seller in a 20-person store 3 years running
• Personal sales of $780K in 2024
• Run in-store product clinics on camping and climbing gear
• Opened 14 corporate gift accounts with local businesses
Sales Associate, Summit Outdoor Gear                                     2017 – 2019
EDUCATION
Arizona State University, Business (coursework)`,
  },
];
