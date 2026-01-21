interface AgentMascotProps {
  className?: string
  variant?: 'default' | 'small'
}

export function AgentMascot({ className = '', variant = 'default' }: AgentMascotProps) {
  if (variant === 'small') {
    return (
      <svg
        viewBox="0 0 48 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
      >
        <style>
          {`
            @keyframes bounce {
              0%, 100% { transform: translateY(0); }
              50% { transform: translateY(-3px); }
            }
            .pin-bounce { animation: bounce 2s ease-in-out infinite; }
          `}
        </style>

        {/* Location pin above */}
        <g className="pin-bounce" style={{ transformOrigin: '24px 15px' }}>
          <path
            d="M24 4 C19 4 15 8.5 15 13 C15 19 24 26 24 26 C24 26 33 19 33 13 C33 8.5 29 4 24 4Z"
            fill="#1a1a1a"
            opacity="0.2"
          />
          <circle cx="24" cy="12.5" r="3.5" fill="#c45a3b" opacity="0.5" />
        </g>

        {/* Subtle glow/shadow */}
        <ellipse cx="24" cy="62" rx="16" ry="2" fill="#1a1a1a" opacity="0.05" />

        {/* Soft rectangle head */}
        <rect x="2" y="29" width="44" height="34" rx="14" fill="#c45a3b" />

        {/* Subtle highlight */}
        <ellipse cx="24" cy="35" rx="14" ry="4" fill="white" opacity="0.08" />

        {/* Eyes - simple dots */}
        <circle cx="16" cy="43" r="4" fill="#1a1a1a" />
        <circle cx="32" cy="43" r="4" fill="#1a1a1a" />

        {/* Smile */}
        <path
          d="M16 51 Q24 57 32 51"
          stroke="#1a1a1a"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
    )
  }

  return (
    <svg
      viewBox="0 0 160 158"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <style>
        {`
          @keyframes bounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-6px); }
          }
          .pin-bounce { animation: bounce 2s ease-in-out infinite; }
        `}
      </style>

      {/* Location pin above */}
      <g className="pin-bounce" style={{ transformOrigin: '80px 31px' }} opacity="0.2">
        <path
          d="M80 8 C70 8 62 16 62 26 C62 40 80 54 80 54 C80 54 98 40 98 26 C98 16 90 8 80 8Z"
          fill="#1a1a1a"
        />
        <circle cx="80" cy="25" r="8" fill="#c45a3b" />
      </g>

      {/* Subtle glow/shadow */}
      <ellipse cx="80" cy="150" rx="50" ry="6" fill="#1a1a1a" opacity="0.05" />

      {/* Soft rectangle head */}
      <rect x="10" y="60" width="140" height="90" rx="36" fill="#c45a3b" />

      {/* Eyes - simple dots */}
      <circle cx="55" cy="92" r="10" fill="#1a1a1a" />
      <circle cx="105" cy="92" r="10" fill="#1a1a1a" />

      {/* Smile */}
      <path
        d="M50 117 Q80 137 110 117"
        stroke="#1a1a1a"
        strokeWidth="7"
        strokeLinecap="round"
        fill="none"
      />

      {/* Subtle highlight */}
      <ellipse cx="80" cy="75" rx="40" ry="10" fill="white" opacity="0.08" />
    </svg>
  )
}
