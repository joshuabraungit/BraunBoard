"use client";

import { useRef, useState } from "react";

/**
 * The sponsor's explainer video with a big, obvious play button over a still frame.
 * Once it starts, the normal controls take over.
 */
export function ExplainerVideo({ src, label = "Play the video", className = "" }: { src: string; label?: string; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [started, setStarted] = useState(false);

  return (
    <div className={`relative overflow-hidden rounded-xl bg-ink ${className}`}>
      <video
        ref={ref}
        // #t=1 makes the browser show a frame from one second in, instead of a blank first frame.
        src={`${src}#t=1`}
        controls={started}
        playsInline
        preload="metadata"
        className="aspect-[4/5] w-full"
        onPlay={() => setStarted(true)}
      />
      {!started && (
        <button
          type="button"
          aria-label={label}
          onClick={() => {
            setStarted(true);
            const v = ref.current;
            if (v) {
              v.currentTime = 0;
              void v.play();
            }
          }}
          className="group absolute inset-0 flex flex-col items-center justify-center gap-3 bg-ink/25 transition hover:bg-ink/15"
        >
          <span className="flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-[0_4px_24px_rgba(0,0,0,0.35)] transition group-hover:scale-105 sm:h-24 sm:w-24">
            <svg viewBox="0 0 24 24" className="ml-1.5 h-9 w-9 fill-ink sm:h-10 sm:w-10" aria-hidden="true">
              <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z" />
            </svg>
          </span>
          <span className="rounded-full bg-ink/70 px-3 py-1 text-sm font-semibold text-white">{label}</span>
        </button>
      )}
    </div>
  );
}
