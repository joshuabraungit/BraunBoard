import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = { alternates: { canonical: "/terms" }, title: "Terms of Service · Braun Board" };

export default function Terms() {
  return (
    <LegalPage title="Terms of Service" updated="October 12, 2026">
      <p>By using Braun Board you agree to these terms. If you don&apos;t agree, please don&apos;t use the site.</p>

      <h2>What Braun Board is</h2>
      <p>
        Braun Board collects publicly posted B2B sales jobs from employers&apos; career pages, organizes them, and lets you browse,
        save, and get alerts about them. We are not an employer, recruiter, or staffing agency, and we are not party to any hiring
        decision.
      </p>

      <h2>Job information</h2>
      <p>
        Listings, pay ranges, and other details come from the employer&apos;s posting. We work to show them accurately and never
        invent compensation or other details, but postings change and can be wrong. Always confirm details on the employer&apos;s
        own page before applying. Match scores reflect only the preferences you gave us, not a judgment of the employer or role.
      </p>

      <h2>Your account</h2>
      <ul>
        <li>Keep your sign-in secure. You&apos;re responsible for activity on your account.</li>
        <li>Don&apos;t misuse the site: no scraping, automated bulk access, or attempts to break or overload it.</li>
        <li>We may suspend accounts that misuse the service.</li>
      </ul>

      <h2>Emails</h2>
      <p>If you set up alerts, we&apos;ll email you about matching jobs. You can change frequency or turn alerts off at any time.</p>

      <h2>No warranty</h2>
      <p>
        Braun Board is provided &ldquo;as is.&rdquo; We don&apos;t guarantee that any job is still open, that information is complete, or
        that the site will always be available. To the extent allowed by law, we aren&apos;t liable for decisions you make based on
        the site.
      </p>

      <h2>Changes</h2>
      <p>We may update these terms. If changes are significant, we&apos;ll note it on the site. Continued use means you accept the updated terms.</p>

      <h2>Contact</h2>
      <p>
        <a className="underline" href="mailto:josh@joshbraun.com">josh@joshbraun.com</a>
      </p>
    </LegalPage>
  );
}
