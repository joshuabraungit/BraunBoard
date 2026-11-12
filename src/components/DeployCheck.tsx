"use client";

// A tab left open across a deploy has buttons that point at code that's gone ("Failed to find
// Server Action"). When the visitor comes back to the tab, check whether the site was updated
// and quietly reload, unless they've typed something we'd throw away. Also checks every few
// minutes while the tab sits open, since a tab left visible overnight (or a laptop waking
// from sleep) never fires the "came back" events.

import { useEffect } from "react";

const BUILD = process.env.NEXT_PUBLIC_BUILD_ID ?? "dev";

function hasUnsavedInput() {
  return Array.from(document.querySelectorAll("input, textarea, select")).some((el) => {
    if (el instanceof HTMLInputElement) {
      if (el.type === "checkbox" || el.type === "radio") return el.checked !== el.defaultChecked;
      if (el.type === "file") return (el.files?.length ?? 0) > 0;
      if (el.type === "hidden") return false;
      return el.value !== el.defaultValue;
    }
    if (el instanceof HTMLTextAreaElement) return el.value !== el.defaultValue;
    if (el instanceof HTMLSelectElement) return Array.from(el.options).some((o) => o.selected !== o.defaultSelected);
    return false;
  });
}

export function DeployCheck() {
  useEffect(() => {
    if (BUILD === "dev") return;
    let last = Date.now();
    const check = async () => {
      if (document.visibilityState !== "visible" || Date.now() - last < 60_000) return;
      last = Date.now();
      try {
        const res = await fetch("/api/build", { cache: "no-store" });
        const { id } = (await res.json()) as { id?: string };
        if (id && id !== "dev" && id !== BUILD && !hasUnsavedInput()) window.location.reload();
      } catch {
        // Offline or a blip. Try again next time they come back.
      }
    };
    document.addEventListener("visibilitychange", check);
    window.addEventListener("focus", check);
    const timer = window.setInterval(check, 5 * 60_000);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", check);
      window.removeEventListener("focus", check);
    };
  }, []);
  return null;
}
