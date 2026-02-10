interface AuthSkylineProps {
  className?: string
}

export function AuthSkyline({ className = '' }: AuthSkylineProps) {
  return (
    <svg
      viewBox="0 0 600 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Ground line */}
      <rect x="0" y="190" width="600" height="10" fill="#1a1a1a" opacity="0.03" rx="5" />

      {/* ===== Row house 1 (far left) — warm sand ===== */}
      <rect x="20" y="120" width="48" height="70" rx="3" fill="#e8d5b7" />
      <polygon points="16,120 44,90 72,120" fill="#d4b896" />
      {/* Chimney */}
      <rect x="55" y="96" width="8" height="20" rx="1.5" fill="#d4b896" />
      <rect x="53" y="94" width="12" height="4" rx="1" fill="#c4a882" />
      {/* Windows */}
      <rect x="30" y="134" width="10" height="12" rx="1.5" fill="#8b6f4e" opacity="0.25" />
      <rect x="48" y="134" width="10" height="12" rx="1.5" fill="#8b6f4e" opacity="0.25" />
      {/* Door */}
      <path d="M38,190 V172 A7,7 0 0,1 52,172 V190 Z" fill="#8b6f4e" opacity="0.35" />

      {/* ===== Row house 2 — terracotta ===== */}
      <rect x="72" y="110" width="44" height="80" rx="3" fill="#c45a3b" opacity="0.7" />
      <rect x="72" y="106" width="44" height="6" rx="1" fill="#c45a3b" opacity="0.5" />
      {/* Windows */}
      <rect x="80" y="120" width="10" height="14" rx="1.5" fill="#fef3c7" opacity="0.2" />
      <rect x="98" y="120" width="10" height="14" rx="1.5" fill="#fef3c7" opacity="0.2" />
      <rect x="80" y="146" width="10" height="14" rx="1.5" fill="#fef3c7" opacity="0.2" />
      <rect x="98" y="146" width="10" height="14" rx="1.5" fill="#fef3c7" opacity="0.2" />
      {/* Door */}
      <rect x="88" y="172" width="14" height="18" rx="2" fill="#fef3c7" opacity="0.3" />

      {/* ===== Tree 1 ===== */}
      <rect x="126" y="168" width="2.5" height="22" fill="#8b7355" opacity="0.25" />
      <ellipse cx="127" cy="158" rx="10" ry="12" fill="#7a9b6d" opacity="0.2" />
      <ellipse cx="121" cy="164" rx="7" ry="7" fill="#7a9b6d" opacity="0.15" />

      {/* ===== Townhouse (taller) — plum ===== */}
      <rect x="145" y="80" width="42" height="110" rx="3" fill="#7b4a6b" opacity="0.6" />
      {/* Flat roof detail */}
      <rect x="143" y="77" width="46" height="5" rx="1.5" fill="#7b4a6b" opacity="0.4" />
      {/* Windows */}
      {[92, 116, 140].map((y) => (
        <g key={`th-${y}`}>
          <rect x="153" y={y} width="9" height="12" rx="1.5" fill="#f0d68a" opacity="0.2" />
          <rect x="170" y={y} width="9" height="12" rx="1.5" fill="#f0d68a" opacity="0.2" />
        </g>
      ))}
      {/* Door */}
      <path d="M161,190 V175 A6,6 0 0,1 173,175 V190 Z" fill="#f0d68a" opacity="0.3" />

      {/* ===== Café / shop — warm ochre ===== */}
      <rect x="195" y="140" width="55" height="50" rx="4" fill="#c9935a" opacity="0.6" />
      {/* Awning */}
      <path d="M193,140 L197,128 H248 L252,140 Z" fill="#b07d45" opacity="0.5" />
      {/* Scalloped awning edge */}
      <path d="M193,140 Q200,146 207,140 Q214,146 221,140 Q228,146 235,140 Q242,146 252,140" stroke="#b07d45" strokeWidth="1.5" fill="none" opacity="0.3" />
      {/* Shop window */}
      <rect x="202" y="148" width="20" height="16" rx="2" fill="white" opacity="0.2" />
      <rect x="228" y="148" width="14" height="16" rx="2" fill="white" opacity="0.15" />
      {/* Door */}
      <rect x="208" y="172" width="12" height="18" rx="2" fill="white" opacity="0.2" />

      {/* ===== Tree 2 ===== */}
      <rect x="262" y="170" width="2.5" height="20" fill="#8b7355" opacity="0.25" />
      <ellipse cx="263" cy="160" rx="11" ry="13" fill="#7a9b6d" opacity="0.2" />
      <ellipse cx="270" cy="166" rx="7" ry="7" fill="#7a9b6d" opacity="0.15" />

      {/* ===== Church / venue — sand with tower ===== */}
      <rect x="285" y="100" width="60" height="90" rx="4" fill="#e8d5b7" opacity="0.8" />
      {/* Tower */}
      <rect x="303" y="52" width="24" height="52" rx="2" fill="#e8d5b7" opacity="0.8" />
      <polygon points="303,52 315,30 327,52" fill="#d4b896" opacity="0.7" />
      {/* Spire */}
      <rect x="313" y="20" width="4" height="12" rx="1" fill="#d4b896" opacity="0.6" />
      <circle cx="315" cy="18" r="3" fill="#f0d68a" opacity="0.4" />
      {/* Rose window */}
      <circle cx="315" cy="72" r="8" fill="#c45a3b" opacity="0.2" />
      <circle cx="315" cy="72" r="5" fill="white" opacity="0.08" />
      {/* Arched windows */}
      <path d="M295,130 V118 A7,7 0 0,1 309,118 V130 Z" fill="#8b6f4e" opacity="0.2" />
      <path d="M319,130 V118 A7,7 0 0,1 333,118 V130 Z" fill="#8b6f4e" opacity="0.2" />
      {/* Grand door */}
      <path d="M305,190 V168 A10,10 0 0,1 325,168 V190 Z" fill="#8b6f4e" opacity="0.3" />

      {/* ===== Modern building — slate ===== */}
      <rect x="355" y="95" width="40" height="95" rx="3" fill="#7b8fa3" opacity="0.5" />
      <polygon points="355,95 395,95 395,82" fill="#5a7088" opacity="0.35" />
      {/* Windows */}
      {[108, 132, 156].map((y) => (
        <g key={`mb-${y}`}>
          <rect x="362" y={y} width="12" height="14" rx="1.5" fill="white" opacity="0.15" />
          <rect x="380" y={y} width="12" height="14" rx="1.5" fill="white" opacity="0.15" />
        </g>
      ))}
      {/* Door */}
      <rect x="370" y="176" width="14" height="14" rx="1.5" fill="white" opacity="0.18" />

      {/* ===== Tree 3 ===== */}
      <rect x="405" y="172" width="2.5" height="18" fill="#8b7355" opacity="0.25" />
      <ellipse cx="406" cy="163" rx="9" ry="11" fill="#7a9b6d" opacity="0.2" />

      {/* ===== Small cottage — warm ochre ===== */}
      <rect x="420" y="145" width="45" height="45" rx="4" fill="#c9935a" opacity="0.5" />
      <polygon points="416,145 442.5,115 469,145" fill="#b07d45" opacity="0.45" />
      {/* Round attic window */}
      <circle cx="442.5" cy="130" r="5" fill="white" opacity="0.15" />
      {/* Windows */}
      <rect x="428" y="156" width="10" height="12" rx="1.5" fill="white" opacity="0.18" />
      <rect x="446" y="156" width="10" height="12" rx="1.5" fill="white" opacity="0.18" />
      {/* Door */}
      <path d="M436,190 V178 A6,6 0 0,1 448,178 V190 Z" fill="white" opacity="0.2" />

      {/* ===== Row house 3 (far right) — terracotta ===== */}
      <rect x="475" y="125" width="46" height="65" rx="3" fill="#c45a3b" opacity="0.55" />
      <rect x="475" y="121" width="46" height="6" rx="1" fill="#c45a3b" opacity="0.4" />
      {/* Windows */}
      <rect x="483" y="136" width="10" height="12" rx="1.5" fill="#fef3c7" opacity="0.18" />
      <rect x="501" y="136" width="10" height="12" rx="1.5" fill="#fef3c7" opacity="0.18" />
      <rect x="483" y="158" width="10" height="12" rx="1.5" fill="#fef3c7" opacity="0.18" />
      <rect x="501" y="158" width="10" height="12" rx="1.5" fill="#fef3c7" opacity="0.18" />
      {/* Door */}
      <rect x="491" y="176" width="12" height="14" rx="2" fill="#fef3c7" opacity="0.25" />

      {/* ===== Small tree far right ===== */}
      <rect x="533" y="174" width="2" height="16" fill="#8b7355" opacity="0.2" />
      <ellipse cx="534" cy="166" rx="8" ry="10" fill="#7a9b6d" opacity="0.15" />

      {/* ===== Tiny house peek (far right edge) ===== */}
      <rect x="550" y="150" width="35" height="40" rx="3" fill="#e8d5b7" opacity="0.4" />
      <polygon points="547,150 567.5,130 588,150" fill="#d4b896" opacity="0.35" />
      <rect x="558" y="162" width="8" height="10" rx="1" fill="#8b6f4e" opacity="0.15" />
      <rect x="572" y="162" width="8" height="10" rx="1" fill="#8b6f4e" opacity="0.15" />

      {/* ===== Street lamps ===== */}
      <rect x="138" y="168" width="2" height="22" rx="0.5" fill="#78716c" opacity="0.12" />
      <ellipse cx="139" cy="166" rx="3.5" ry="3" fill="#f0d68a" opacity="0.15" />

      <rect x="520" y="172" width="2" height="18" rx="0.5" fill="#78716c" opacity="0.12" />
      <ellipse cx="521" cy="170" rx="3.5" ry="3" fill="#f0d68a" opacity="0.15" />
    </svg>
  )
}
