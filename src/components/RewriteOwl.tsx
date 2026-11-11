// The Braun Board owl (green reading glasses) hanging on to the top edge of a card on the employer page.
// Asleep over the jargon version of a job ad, wide awake over the plain-English one.

export function RewriteOwl({ asleep = false, className = "" }: { asleep?: boolean; className?: string }) {
  return (
    <svg viewBox="70 20 320 215" aria-hidden="true" className={`pointer-events-none ${className}`}>
      <defs>
        <clipPath id={asleep ? "rw-owl-clip-a" : "rw-owl-clip-b"}>
          <rect x="0" y="0" width="400" height="226" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${asleep ? "rw-owl-clip-a" : "rw-owl-clip-b"})`}>
        <path d="M110 120 L100 62 L156 96 Z" fill="#16140f" />
        <path d="M290 120 L300 62 L244 96 Z" fill="#16140f" />
        <ellipse cx="200" cy="215" rx="125" ry="128" fill="#16140f" />
        <circle cx="158" cy="172" r="44" fill="#faf8f4" />
        <circle cx="242" cy="172" r="44" fill="#faf8f4" />
        {asleep ? (
          <g fill="none" stroke="#16140f" strokeWidth="6" strokeLinecap="round">
            <path d="M140 178 Q158 192 176 178" />
            <path d="M224 178 Q242 192 260 178" />
          </g>
        ) : (
          <g>
            <circle cx="158" cy="176" r="17" fill="#16140f" />
            <circle cx="242" cy="176" r="17" fill="#16140f" />
            <circle cx="163" cy="171" r="4" fill="#ffffff" />
            <circle cx="247" cy="171" r="4" fill="#ffffff" />
          </g>
        )}
        <circle cx="158" cy="174" r="30" fill="none" stroke="#4cae73" strokeWidth="6" />
        <circle cx="242" cy="174" r="30" fill="none" stroke="#4cae73" strokeWidth="6" />
        <path d="M188 172 L212 172" stroke="#4cae73" strokeWidth="6" strokeLinecap="round" />
        <path d="M186 210 L214 210 L200 226 Z" fill="#c98a1a" />
      </g>
      {asleep && (
        <g fill="#8c8578" fontFamily="ui-sans-serif, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif" fontWeight="700">
          <text x="310" y="118" fontSize="40">z</text>
          <text x="338" y="76" fontSize="56">Z</text>
        </g>
      )}
      <g fill="#c98a1a">
        <ellipse cx="108" cy="224" rx="9" ry="12" />
        <ellipse cx="128" cy="226" rx="9" ry="12" />
        <ellipse cx="148" cy="224" rx="9" ry="12" />
        <ellipse cx="252" cy="224" rx="9" ry="12" />
        <ellipse cx="272" cy="226" rx="9" ry="12" />
        <ellipse cx="292" cy="224" rx="9" ry="12" />
      </g>
    </svg>
  );
}
