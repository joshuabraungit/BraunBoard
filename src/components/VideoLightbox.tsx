"use client";

import { useEffect, useRef, useState } from "react";

/**
 * A small "Watch" button that opens the sponsor's explainer video in a lightbox.
 * The video stays out of the way until someone asks for it. Esc, the X, or a click outside closes it.
 */
export function VideoLightbox({ src, label = "Watch: what you'd sell", className = "" }: { src: string; label?: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          // On the home card the whole card is a link; the button shouldn't follow it.
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        className={`relative z-30 inline-flex min-h-10 items-center gap-2 rounded-full border border-line-strong bg-surface py-1.5 pl-1.5 pr-4 text-sm font-semibold text-ink transition hover:border-ink ${className}`}
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ink">
          <svg viewBox="0 0 24 24" className="ml-0.5 h-3.5 w-3.5 fill-white" aria-hidden="true">
            <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z" />
          </svg>
        </span>
        {label}
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={label}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4"
          onClick={() => setOpen(false)}
        >
          <button
            ref={closeRef}
            type="button"
            aria-label="Close video"
            onClick={() => setOpen(false)}
            className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
          <video
            src={src}
            controls
            autoPlay
            playsInline
            onClick={(e) => e.stopPropagation()}
            className="max-h-[85vh] max-w-full rounded-xl bg-black shadow-2xl"
          />
        </div>
      )}
    </>
  );
}
