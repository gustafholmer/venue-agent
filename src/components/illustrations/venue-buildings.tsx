interface VenueBuildingsProps {
  className?: string
}

export function VenueBuildings({ className = '' }: VenueBuildingsProps) {
  return (
    <svg
      viewBox="0 0 520 340"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Ground shadow */}
      <ellipse cx="260" cy="330" rx="230" ry="10" fill="#1a1a1a" opacity="0.04" />

      {/* ===== Building 1 - Art Deco Tower (left) ===== */}
      <rect x="28" y="110" width="56" height="220" rx="4" fill="#c45a3b" />
      {/* Stepped top */}
      <rect x="34" y="88" width="44" height="28" rx="3" fill="#c45a3b" />
      <rect x="40" y="70" width="32" height="24" rx="3" fill="#c45a3b" />
      <rect x="48" y="54" width="16" height="22" rx="2" fill="#c45a3b" />
      {/* Spire */}
      <rect x="53" y="34" width="6" height="22" rx="1" fill="#c45a3b" />
      <circle cx="56" cy="32" r="4" fill="#fef3c7" />
      {/* Vertical deco lines */}
      <rect x="38" y="115" width="2" height="210" fill="white" opacity="0.06" />
      <rect x="54" y="115" width="2" height="210" fill="white" opacity="0.06" />
      <rect x="72" y="115" width="2" height="210" fill="white" opacity="0.06" />
      {/* Horizontal band */}
      <rect x="28" y="108" width="56" height="3" fill="white" opacity="0.08" />
      {/* Windows */}
      {[130, 158, 186, 214, 242, 270].map((y) => (
        <g key={`b1-${y}`}>
          <rect x="40" y={y} width="10" height="16" rx="2" fill="white" opacity="0.15" />
          <rect x="62" y={y} width="10" height="16" rx="2" fill="white" opacity="0.15" />
        </g>
      ))}
      {/* Door */}
      <path d="M46,330 V310 A10,10 0 0,1 66,310 V330 Z" fill="#fef3c7" />

      {/* ===== Tree 1 ===== */}
      <rect x="96" y="298" width="3" height="32" fill="#a8907a" opacity="0.3" />
      <ellipse cx="97" cy="285" rx="14" ry="16" fill="#c45a3b" opacity="0.12" />
      <ellipse cx="88" cy="293" rx="9" ry="10" fill="#c45a3b" opacity="0.10" />
      <ellipse cx="107" cy="293" rx="9" ry="10" fill="#c45a3b" opacity="0.10" />

      {/* ===== Building 2 - Neoclassical (center-left) ===== */}
      <rect x="120" y="155" width="76" height="175" rx="4" fill="#fef3c7" />
      {/* Pediment */}
      <polygon points="116,155 158,108 200,155" fill="#fef3c7" />
      <polygon points="124,155 158,118 192,155" fill="white" opacity="0.05" />
      {/* Oculus in pediment */}
      <circle cx="158" cy="137" r="7" fill="#c45a3b" opacity="0.2" />
      <circle cx="158" cy="137" r="4" fill="white" opacity="0.06" />
      {/* Cornice */}
      <rect x="118" y="152" width="80" height="4" rx="1" fill="#c45a3b" opacity="0.1" />
      {/* Pilasters */}
      <rect x="124" y="156" width="5" height="174" rx="1" fill="#c45a3b" opacity="0.08" />
      <rect x="187" y="156" width="5" height="174" rx="1" fill="#c45a3b" opacity="0.08" />
      {/* Arched windows row 1 */}
      <path d="M134,195 V182 A7,7 0 0,1 148,182 V195 Z" fill="#c45a3b" opacity="0.2" />
      <path d="M153,195 V182 A7,7 0 0,1 167,182 V195 Z" fill="#c45a3b" opacity="0.2" />
      <path d="M172,195 V182 A7,7 0 0,1 186,182 V195 Z" fill="#c45a3b" opacity="0.2" />
      {/* Arched windows row 2 */}
      <path d="M134,230 V217 A7,7 0 0,1 148,217 V230 Z" fill="#c45a3b" opacity="0.2" />
      <path d="M153,230 V217 A7,7 0 0,1 167,217 V230 Z" fill="#c45a3b" opacity="0.2" />
      <path d="M172,230 V217 A7,7 0 0,1 186,217 V230 Z" fill="#c45a3b" opacity="0.2" />
      {/* Arched windows row 3 */}
      <path d="M134,265 V252 A7,7 0 0,1 148,252 V265 Z" fill="#c45a3b" opacity="0.2" />
      <path d="M153,265 V252 A7,7 0 0,1 167,252 V265 Z" fill="#c45a3b" opacity="0.2" />
      <path d="M172,265 V252 A7,7 0 0,1 186,252 V265 Z" fill="#c45a3b" opacity="0.2" />
      {/* Arched door */}
      <path d="M147,330 V306 A11,11 0 0,1 169,306 V330 Z" fill="#c45a3b" opacity="0.35" />

      {/* ===== Building 3 - Grand Venue Hall (center) ===== */}
      <rect x="210" y="158" width="120" height="172" rx="6" fill="#c45a3b" />
      {/* Dome */}
      <ellipse cx="270" cy="158" rx="60" ry="38" fill="#c45a3b" />
      {/* Dome highlight */}
      <ellipse cx="265" cy="148" rx="38" ry="20" fill="white" opacity="0.05" />
      {/* Cupola */}
      <rect x="260" y="116" width="20" height="12" rx="4" fill="#c45a3b" />
      <ellipse cx="270" cy="116" rx="12" ry="7" fill="#c45a3b" />
      <circle cx="270" cy="110" r="5" fill="#fef3c7" opacity="0.5" />
      {/* Flag */}
      <rect x="269" y="88" width="2" height="24" fill="#c45a3b" />
      <polygon points="271,88 287,94 271,100" fill="#fef3c7" opacity="0.6" />
      {/* Decorative band */}
      <rect x="210" y="268" width="120" height="3" fill="white" opacity="0.07" />
      {/* Arched windows row 1 */}
      <path d="M222,208 V189 A9,9 0 0,1 240,189 V208 Z" fill="white" opacity="0.14" />
      <path d="M248,208 V189 A9,9 0 0,1 266,189 V208 Z" fill="white" opacity="0.14" />
      <path d="M274,208 V189 A9,9 0 0,1 292,189 V208 Z" fill="white" opacity="0.14" />
      <path d="M300,208 V189 A9,9 0 0,1 318,189 V208 Z" fill="white" opacity="0.14" />
      {/* Arched windows row 2 */}
      <path d="M222,248 V229 A9,9 0 0,1 240,229 V248 Z" fill="white" opacity="0.14" />
      <path d="M248,248 V229 A9,9 0 0,1 266,229 V248 Z" fill="white" opacity="0.14" />
      <path d="M274,248 V229 A9,9 0 0,1 292,229 V248 Z" fill="white" opacity="0.14" />
      <path d="M300,248 V229 A9,9 0 0,1 318,229 V248 Z" fill="white" opacity="0.14" />
      {/* Grand arched entrance */}
      <path d="M252,330 V296 A18,18 0 0,1 288,296 V330 Z" fill="#fef3c7" />
      {/* Entrance columns */}
      <rect x="245" y="278" width="5" height="52" rx="2" fill="#fef3c7" opacity="0.4" />
      <rect x="290" y="278" width="5" height="52" rx="2" fill="#fef3c7" opacity="0.4" />
      {/* Steps */}
      <rect x="245" y="326" width="50" height="4" rx="1" fill="#fef3c7" opacity="0.3" />

      {/* ===== Tree 2 ===== */}
      <rect x="342" y="300" width="3" height="30" fill="#a8907a" opacity="0.3" />
      <ellipse cx="343" cy="288" rx="12" ry="14" fill="#c45a3b" opacity="0.12" />
      <ellipse cx="335" cy="295" rx="8" ry="9" fill="#c45a3b" opacity="0.10" />
      <ellipse cx="352" cy="295" rx="8" ry="9" fill="#c45a3b" opacity="0.10" />

      {/* ===== Building 4 - Modern (center-right) ===== */}
      <rect x="362" y="188" width="58" height="142" rx="3" fill="#fef3c7" />
      {/* Angled roof accent */}
      <polygon points="362,188 420,188 420,172" fill="#c45a3b" opacity="0.25" />
      <rect x="362" y="185" width="58" height="4" rx="1" fill="#c45a3b" opacity="0.15" />
      {/* Large windows */}
      {[200, 234, 268].map((y) => (
        <g key={`b4-${y}`}>
          <rect x="370" y={y} width="18" height="22" rx="2" fill="#c45a3b" opacity="0.18" />
          <rect x="396" y={y} width="18" height="22" rx="2" fill="#c45a3b" opacity="0.18" />
        </g>
      ))}
      {/* Door */}
      <rect x="382" y="305" width="18" height="25" rx="2" fill="#c45a3b" opacity="0.3" />

      {/* ===== Building 5 - Charming Gabled (right) ===== */}
      <rect x="436" y="228" width="55" height="102" rx="5" fill="#c45a3b" />
      {/* Steep peaked roof */}
      <polygon points="432,228 463.5,182 495,228" fill="#c45a3b" />
      <polygon points="442,228 463.5,195 485,228" fill="white" opacity="0.04" />
      {/* Chimney */}
      <rect x="476" y="196" width="10" height="26" rx="2" fill="#c45a3b" />
      <rect x="474" y="193" width="14" height="5" rx="1" fill="#c45a3b" />
      {/* Smoke wisps */}
      <circle cx="481" cy="186" r="3" fill="#a8a29e" opacity="0.08" />
      <circle cx="484" cy="178" r="2.5" fill="#a8a29e" opacity="0.06" />
      <circle cx="480" cy="171" r="2" fill="#a8a29e" opacity="0.04" />
      {/* Round window in gable */}
      <circle cx="463.5" cy="212" r="7" fill="white" opacity="0.15" />
      <line x1="463.5" y1="205" x2="463.5" y2="219" stroke="white" strokeWidth="1" opacity="0.08" />
      <line x1="456.5" y1="212" x2="470.5" y2="212" stroke="white" strokeWidth="1" opacity="0.08" />
      {/* Windows */}
      <rect x="447" y="245" width="12" height="16" rx="2" fill="white" opacity="0.15" />
      <rect x="469" y="245" width="12" height="16" rx="2" fill="white" opacity="0.15" />
      <rect x="447" y="275" width="12" height="16" rx="2" fill="white" opacity="0.15" />
      <rect x="469" y="275" width="12" height="16" rx="2" fill="white" opacity="0.15" />
      {/* Arched door */}
      <path d="M455,330 V314 A9,9 0 0,1 473,314 V330 Z" fill="#fef3c7" />

      {/* ===== Street lamp left ===== */}
      <rect x="12" y="272" width="2.5" height="58" rx="1" fill="#78716c" opacity="0.18" />
      <ellipse cx="13.25" cy="269" rx="5" ry="4" fill="#fef3c7" opacity="0.25" />
      <rect x="9" y="268" width="8.5" height="2" rx="1" fill="#78716c" opacity="0.15" />

      {/* ===== Street lamp right ===== */}
      <rect x="507" y="282" width="2.5" height="48" rx="1" fill="#78716c" opacity="0.18" />
      <ellipse cx="508.25" cy="279" rx="5" ry="4" fill="#fef3c7" opacity="0.25" />
      <rect x="504" y="278" width="8.5" height="2" rx="1" fill="#78716c" opacity="0.15" />

      {/* ===== Small ground bushes ===== */}
      <ellipse cx="28" cy="328" rx="12" ry="5" fill="#c45a3b" opacity="0.08" />
      <ellipse cx="502" cy="328" rx="10" ry="4" fill="#c45a3b" opacity="0.08" />
    </svg>
  )
}
