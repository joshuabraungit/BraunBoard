import { describe, expect, it } from "vitest";
import { homeUrl, htmlToText } from "../src/lib/ingest/site-text";

describe("htmlToText", () => {
  it("keeps the title, meta description and body words, drops scripts and styles", () => {
    const html = `<html><head><title>Panorama Education</title>
      <meta name="description" content="Surveys and data that help schools support every student.">
      <style>.x{color:red}</style><script>var tracking = 1;</script></head>
      <body><nav>Home</nav><h1>Help every student succeed</h1><p>Schools use Panorama to see how students feel &amp; how they&#39;re doing.</p></body></html>`;
    const text = htmlToText(html);
    expect(text).toContain("Panorama Education");
    expect(text).toContain("Surveys and data that help schools support every student.");
    expect(text).toContain("Schools use Panorama to see how students feel & how they're doing.");
    expect(text).not.toContain("tracking");
    expect(text).not.toContain("color:red");
  });

  it("caps the length", () => {
    expect(htmlToText(`<p>${"word ".repeat(5000)}</p>`, 100).length).toBeLessThanOrEqual(100);
  });
});

describe("homeUrl", () => {
  it("uses the website, falling back to the domain", () => {
    expect(homeUrl("https://www.panoramaed.com/about", null)).toBe("https://www.panoramaed.com/");
    expect(homeUrl(null, "fooda.com")).toBe("https://fooda.com/");
    expect(homeUrl("", "")).toBeNull();
  });

  it("skips job-board hosts", () => {
    expect(homeUrl("https://boards.greenhouse.io/acme", null)).toBeNull();
    expect(homeUrl("https://jobs.lever.co/acme", "acme.com")).toBe("https://acme.com/");
  });
});
