import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = { title: "Privacy Policy · Braun Board" };

export default function Privacy() {
  return (
    <LegalPage title="Privacy Policy" updated="October 12, 2026">
      <p>
        Braun Board helps salespeople find B2B sales jobs and get alerted when relevant ones appear. This page explains what we
        collect and how we use it. Plain version: we only collect what we need to run the job alerts you ask for, and we don&apos;t
        sell your data.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li><strong>Account info:</strong> your email address, and your name and profile photo if you sign in with Google.</li>
        <li><strong>Your preferences:</strong> the answers you give about the sales job you&apos;d take (role, pay, location, dealbreakers), your saved searches, watched companies and saved jobs.</li>
        <li><strong>Alert activity:</strong> which alert emails we sent you and whether you clicked through, so we can tell if alerts are useful.</li>
        <li><strong>Basic technical data:</strong> standard server logs and a sign-in cookie that keeps you logged in.</li>
      </ul>
      <p>If you use the site without signing in, your onboarding answers are stored only in a cookie in your browser.</p>

      <h2>How we use it</h2>
      <ul>
        <li>To show you matching jobs and send the email alerts you chose (instant, daily, or off).</li>
        <li>To keep your account signed in and your watches saved.</li>
        <li>To improve job matching and alert quality.</li>
      </ul>

      <h2>What we don&apos;t do</h2>
      <ul>
        <li>We don&apos;t sell or rent your personal information.</li>
        <li>We don&apos;t share your preferences or activity with employers or recruiters.</li>
        <li>We don&apos;t apply to jobs on your behalf. &ldquo;Apply&rdquo; takes you to the employer&apos;s own site.</li>
      </ul>

      <h2>Service providers</h2>
      <p>
        We use a small number of providers to run the site: Supabase (database and sign-in), Vercel (hosting), Google (optional
        sign-in), and an email delivery service for alerts. They process data only to provide those services to us.
      </p>

      <h2>Job listings</h2>
      <p>
        Job listings come from employers&apos; public career pages and applicant tracking systems. We don&apos;t collect anything about
        you from those sources.
      </p>

      <h2>Your choices</h2>
      <ul>
        <li>Turn alerts off any time on the Alerts page or from the link in any alert email.</li>
        <li>Edit or delete your watches on the Watchlist page.</li>
        <li>Ask us to delete your account and data by emailing the address below.</li>
      </ul>

      <h2>Contact</h2>
      <p>
        Questions or deletion requests: <a className="underline" href="mailto:josh@joshbraun.com">josh@joshbraun.com</a>
      </p>
    </LegalPage>
  );
}
