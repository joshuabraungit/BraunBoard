"use client";

export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className="rounded-lg bg-ink px-3 py-2 text-sm font-semibold text-white hover:opacity-90">
      Save as PDF
    </button>
  );
}
