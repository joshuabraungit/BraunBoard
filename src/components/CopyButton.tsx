"use client";

import { useState } from "react";

/** Copies text to the clipboard and says so for a moment. */
export function CopyButton({ text, label = "Copy", className = "" }: { text: string; label?: string; className?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className={className}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 2000);
        } catch {
          // Clipboard blocked (old browser or no permission). Nothing else to do.
        }
      }}
    >
      {done ? "Copied ✓" : label}
    </button>
  );
}
