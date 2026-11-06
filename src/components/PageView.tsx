"use client";

// Tells the server "someone viewed this page" once per page, for the admin Visitors numbers.
// No cookies or storage. The referrer is only sent with the first page of a visit, since that's
// what tells us where they came from.

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { cleanPath, cleanReferrer } from "@/lib/visit-clean";

export function PageView() {
  const pathname = usePathname();
  const search = useSearchParams();
  const first = useRef(true);
  useEffect(() => {
    if (pathname.startsWith("/admin")) return;
    const q = search.toString();
    // Only link tags and the referring site leave the browser. The server cleans again anyway.
    const body = JSON.stringify({
      p: cleanPath(pathname + (q ? `?${q}` : "")),
      r: first.current ? cleanReferrer(document.referrer) : "",
    });
    first.current = false;
    try {
      if (!navigator.sendBeacon?.("/api/v", new Blob([body], { type: "application/json" }))) {
        fetch("/api/v", { method: "POST", body, headers: { "content-type": "application/json" }, keepalive: true }).catch(() => {});
      }
    } catch {
      // Never let counting get in the way.
    }
  }, [pathname, search]);
  return null;
}
