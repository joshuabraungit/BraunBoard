// The Braun Board owl, peeking over a job card and reading it. Animation lives in globals.css
// (.owl-*), and switches off for people who ask their device to reduce motion.

export function PeekerOwl({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="20 50 360 375"
      role="img"
      aria-label="The Braun Board owl peeking over a job posting and reading it"
    >
      <g className="owl-head">
        <path d="M110 120 L100 62 L156 96 Z" fill="#16140f" />
        <path d="M290 120 L300 62 L244 96 Z" fill="#16140f" />
        <ellipse cx="200" cy="215" rx="125" ry="128" fill="#16140f" />
        <circle cx="158" cy="172" r="44" fill="#faf8f4" />
        <circle cx="242" cy="172" r="44" fill="#faf8f4" />
        <g className="owl-pupils">
          <circle cx="160" cy="188" r="17" fill="#16140f" />
          <circle cx="244" cy="188" r="17" fill="#16140f" />
          <circle cx="165" cy="183" r="4" fill="#ffffff" />
          <circle cx="249" cy="183" r="4" fill="#ffffff" />
        </g>
        <circle className="owl-lid" cx="158" cy="172" r="45" fill="#16140f" />
        <circle className="owl-lid" cx="242" cy="172" r="45" fill="#16140f" />
        <circle cx="158" cy="174" r="30" fill="none" stroke="#4cae73" strokeWidth="6" />
        <circle cx="242" cy="174" r="30" fill="none" stroke="#4cae73" strokeWidth="6" />
        <path d="M188 172 L212 172" stroke="#4cae73" strokeWidth="6" strokeLinecap="round" />
        <path d="M186 210 L214 210 L200 236 Z" fill="#c98a1a" />
      </g>
      <rect x="30" y="222" width="340" height="196" rx="14" fill="#ffffff" stroke="#d9d3c7" strokeWidth="2" />
      <g className="owl-claws-l" fill="#c98a1a">
        <ellipse cx="108" cy="224" rx="7" ry="11" />
        <ellipse cx="124" cy="226" rx="7" ry="11" />
        <ellipse cx="140" cy="224" rx="7" ry="11" />
      </g>
      <g className="owl-claws-r" fill="#c98a1a">
        <ellipse cx="260" cy="224" rx="7" ry="11" />
        <ellipse cx="276" cy="226" rx="7" ry="11" />
        <ellipse cx="292" cy="224" rx="7" ry="11" />
      </g>
      <rect x="60" y="262" width="190" height="18" rx="4" fill="#16140f" />
      <rect x="60" y="294" width="260" height="10" rx="5" fill="#ebe7df" />
      <rect x="60" y="314" width="220" height="10" rx="5" fill="#ebe7df" />
      <g className="owl-chip">
        <rect x="60" y="346" width="168" height="36" rx="18" fill="#fbf1dc" stroke="#8a5a00" strokeWidth="2" />
        <text x="144" y="370" textAnchor="middle" fontSize="16" fontWeight="600" fill="#8a5a00" fontFamily="ui-sans-serif, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif">
          ? Ask about quota
        </text>
      </g>
    </svg>
  );
}
