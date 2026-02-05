interface VenueBuildingsProps {
  className?: string
}

export function VenueBuildings({ className = '' }: VenueBuildingsProps) {
  return (
    <svg
      viewBox="0 0 320 280"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Subtle ground shadow */}
      <ellipse cx="160" cy="270" rx="140" ry="8" fill="#1a1a1a" opacity="0.03" />

      {/* Building 1 - Left, tall narrow */}
      <rect x="30" y="100" width="50" height="160" rx="8" fill="#c45a3b" />
      <rect x="40" y="115" width="12" height="18" rx="2" fill="white" opacity="0.15" />
      <rect x="58" y="115" width="12" height="18" rx="2" fill="white" opacity="0.15" />
      <rect x="40" y="145" width="12" height="18" rx="2" fill="white" opacity="0.15" />
      <rect x="58" y="145" width="12" height="18" rx="2" fill="white" opacity="0.15" />
      <rect x="40" y="175" width="12" height="18" rx="2" fill="white" opacity="0.15" />
      <rect x="58" y="175" width="12" height="18" rx="2" fill="white" opacity="0.15" />
      <rect x="40" y="205" width="12" height="18" rx="2" fill="white" opacity="0.15" />
      <rect x="58" y="205" width="12" height="18" rx="2" fill="white" opacity="0.15" />
      <rect x="46" y="235" width="18" height="25" rx="3" fill="#fef3c7" />

      {/* Building 2 - Center left, medium with pitched roof */}
      <rect x="95" y="140" width="60" height="120" rx="6" fill="#fef3c7" />
      <polygon points="95,140 125,105 155,140" fill="#fef3c7" />
      <rect x="108" y="160" width="14" height="20" rx="2" fill="#c45a3b" opacity="0.3" />
      <rect x="130" y="160" width="14" height="20" rx="2" fill="#c45a3b" opacity="0.3" />
      <rect x="108" y="195" width="14" height="20" rx="2" fill="#c45a3b" opacity="0.3" />
      <rect x="130" y="195" width="14" height="20" rx="2" fill="#c45a3b" opacity="0.3" />
      <rect x="115" y="230" width="20" height="30" rx="3" fill="#c45a3b" opacity="0.5" />

      {/* Building 3 - Center, large dome (venue hall) */}
      <rect x="165" y="150" width="80" height="110" rx="8" fill="#c45a3b" />
      <ellipse cx="205" cy="150" rx="40" ry="25" fill="#c45a3b" />
      <ellipse cx="205" cy="145" rx="25" ry="12" fill="white" opacity="0.08" />
      <rect x="180" y="175" width="16" height="22" rx="3" fill="white" opacity="0.15" />
      <rect x="204" y="175" width="16" height="22" rx="3" fill="white" opacity="0.15" />
      <rect x="228" y="175" width="16" height="22" rx="3" fill="white" opacity="0.15" />
      <rect x="180" y="210" width="16" height="22" rx="3" fill="white" opacity="0.15" />
      <rect x="204" y="210" width="16" height="22" rx="3" fill="white" opacity="0.15" />
      <rect x="228" y="210" width="16" height="22" rx="3" fill="white" opacity="0.15" />
      <rect x="192" y="240" width="26" height="20" rx="4" fill="#fef3c7" />

      {/* Building 4 - Right, small */}
      <rect x="260" y="180" width="45" height="80" rx="6" fill="#fef3c7" />
      <rect x="270" y="195" width="10" height="14" rx="2" fill="#c45a3b" opacity="0.3" />
      <rect x="285" y="195" width="10" height="14" rx="2" fill="#c45a3b" opacity="0.3" />
      <rect x="270" y="220" width="10" height="14" rx="2" fill="#c45a3b" opacity="0.3" />
      <rect x="285" y="220" width="10" height="14" rx="2" fill="#c45a3b" opacity="0.3" />
      <rect x="275" y="245" width="15" height="15" rx="2" fill="#c45a3b" opacity="0.5" />

      {/* Small decorative elements */}
      <circle cx="25" cy="250" r="8" fill="#e8cec8" opacity="0.5" />
      <circle cx="300" cy="245" r="6" fill="#e8cec8" opacity="0.5" />
    </svg>
  )
}
