"use client";
import { useEffect, useRef, useState } from "react";
import { initials } from "@/lib/format";
import { logoCandidates } from "@/lib/logo";

/** Walks the logo fallback chain and ends at initials. */
export function CompanyLogo({
  name,
  logoUrl,
  domain,
  size = 28,
}: {
  name: string;
  logoUrl: string | null;
  domain: string | null;
  size?: number;
}) {
  const candidates = logoCandidates({ logo_url: logoUrl, domain });
  const [i, setI] = useState(0);
  const img = useRef<HTMLImageElement>(null);
  const src = candidates[i];
  const box = { width: size, height: size };

  // An image that fails before React hydrates never fires onError, which would leave a
  // broken-image icon on screen. Catch that case once we're mounted.
  useEffect(() => {
    const el = img.current;
    if (el && el.complete && el.naturalWidth === 0) setI((n) => n + 1);
  }, [i]);

  if (!src) {
    return (
      <span
        style={{ ...box, fontSize: size * 0.4 }}
        className="inline-flex shrink-0 items-center justify-center rounded-md border border-line bg-bg font-semibold text-ink-2"
        aria-hidden
      >
        {initials(name)}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={img}
      src={src}
      alt=""
      style={box}
      className="shrink-0 rounded-md border border-line bg-white object-contain"
      onError={() => setI((n) => n + 1)}
    />
  );
}
