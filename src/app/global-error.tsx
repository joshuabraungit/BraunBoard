"use client";

// Last-resort page for when the whole layout breaks. Kept self-contained (no site styles or
// components) since those may be what broke. No error details shown.

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif", color: "#1C1C1A" }}>
        <main style={{ maxWidth: 520, margin: "12vh auto", padding: "0 20px", lineHeight: 1.6 }}>
          <h1 style={{ fontSize: 28, margin: "0 0 12px" }}>Something went wrong on my end.</h1>
          <p>I&apos;ve been notified and I&apos;ll fix it. Give it another try in a bit.</p>
          <p>
            Stuck? Call or text me: <a href="tel:+19546950844" style={{ color: "#1C1C1A", fontWeight: 600 }}>954-695-0844</a>
          </p>
          <p>
            <button onClick={() => reset()} style={{ padding: "8px 16px", borderRadius: 8, border: 0, background: "#1C1C1A", color: "#fff", fontWeight: 600, cursor: "pointer" }}>
              Try again
            </button>{" "}
            {/* A full reload on purpose: the app shell is what broke. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/" style={{ marginLeft: 12, color: "#1C1C1A" }}>Back to jobs</a>
          </p>
        </main>
      </body>
    </html>
  );
}
