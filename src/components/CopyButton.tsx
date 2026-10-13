"use client";

import { useState } from "react";

/** Copies text to the clipboard and says so for a moment. */
export function CopyButton({ text, label = "Copy", className = "" }: { text: string; label?: string; className?: string }) {
  const [state, setState] = useState<"idle" | "done" | "failed">("idle");
  const flash = (v: "done" | "failed") => {
    setState(v);
    setTimeout(() => setState("idle"), 2500);
  };
  return (
    <button
      type="button"
      className={className}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          return flash("done");
        } catch {
          // Clipboard API blocked (permissions, older browser). Fall back to the old copy command.
        }
        try {
          const ta = document.createElement("textarea");
          ta.value = text;
          ta.setAttribute("readonly", "");
          ta.style.position = "fixed";
          ta.style.opacity = "0";
          document.body.appendChild(ta);
          ta.select();
          const ok = document.execCommand("copy");
          ta.remove();
          flash(ok ? "done" : "failed");
        } catch {
          flash("failed");
        }
      }}
    >
      {state === "done" ? "Copied ✓" : state === "failed" ? "Couldn't copy. Select the text instead." : label}
    </button>
  );
}
