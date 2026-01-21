export function HeroIllustration({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 400 400"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Background abstract shapes */}
      <ellipse cx="300" cy="100" rx="80" ry="60" fill="#fff7ed" />
      <circle cx="40" cy="350" r="50" fill="#fef3c7" />
      <rect x="320" y="280" width="60" height="60" rx="12" fill="#fef3c7" transform="rotate(15 350 310)" />

      {/* Abstract venue representation - geometric shapes suggesting spaces */}
      <g>
        {/* Large arch/doorway shape */}
        <path
          d="M200 320 L200 180 Q200 120 260 120 Q320 120 320 180 L320 320 Z"
          fill="#1a1a1a"
        />
        {/* Inner arch glow */}
        <path
          d="M220 320 L220 190 Q220 150 260 150 Q300 150 300 190 L300 320 Z"
          fill="#c45a3b"
        />
        {/* Light/glow inside */}
        <ellipse cx="260" cy="280" rx="25" ry="35" fill="#fef3c7" />

        {/* Floating geometric elements - suggesting multiple spaces */}
        <rect x="160" y="200" width="30" height="30" rx="6" fill="#78716c" />
        <rect x="330" y="160" width="40" height="40" rx="8" fill="#e7e5e4" />
        <circle cx="350" cy="240" r="20" fill="#c45a3b" opacity="0.3" />

        {/* Abstract table/gathering shape */}
        <ellipse cx="260" cy="340" rx="60" ry="15" fill="#e7e5e4" />
      </g>

      {/* Person figure - abstract/geometric style */}
      <g>
        {/* Flowing body shape */}
        <path
          d="M0 380 Q-20 300 20 250 Q60 200 60 250 Q80 300 60 380 Z"
          fill="#c45a3b"
        />
        {/* Head */}
        <circle cx="40" cy="200" r="40" fill="#d4a574" />
        {/* Hair - flowing */}
        <path
          d="M0 190 Q0 150 40 145 Q80 150 85 190 Q70 175 40 180 Q10 175 0 190Z"
          fill="#1a1a1a"
        />
        {/* Arm reaching/pointing */}
        <path
          d="M60 260 Q100 230 130 200 Q140 190 135 180"
          stroke="#d4a574"
          strokeWidth="24"
          strokeLinecap="round"
        />
        {/* Tablet/phone in hand */}
        <rect x="115" y="165" width="35" height="50" rx="4" fill="#1a1a1a" />
        <rect x="120" y="172" width="25" height="35" rx="2" fill="#4a9eff" />
      </g>

      {/* Connection dots/bubbles - representing AI/matching */}
      <g>
        <circle cx="200" cy="90" r="6" fill="#c45a3b" />
        <circle cx="185" cy="110" r="4" fill="#c45a3b" opacity="0.7" />
        <circle cx="170" cy="125" r="3" fill="#c45a3b" opacity="0.5" />

        {/* Sparkles */}
        <circle cx="340" cy="120" r="5" fill="#fbbf24" />
        <circle cx="370" cy="200" r="4" fill="#fbbf24" opacity="0.7" />
      </g>

      {/* Decorative flowing line */}
      <path
        d="M80 150 Q110 130 140 150"
        stroke="#c45a3b"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
        opacity="0.4"
      />
    </svg>
  )
}
