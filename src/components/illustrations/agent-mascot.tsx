interface TryffleLogoProps {
  className?: string
  variant?: 'default' | 'small'
}

export function TryffleLogo({ className = '', variant = 'default' }: TryffleLogoProps) {
  if (variant === 'small') {
    return (
      <svg
        viewBox="0 0 32 38"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
      >
        {/* Pin-shaped stem - tapers to point */}
        <path
          d="M10 20 C10 20 12 30 16 36 C20 30 22 20 22 20Z"
          fill="#fef3c7"
        />

        {/* Mushroom cap - rounded dome */}
        <path
          d="M3 17 C3 9 8 3 16 3 C24 3 29 9 29 17 C29 20 26 22 16 22 C6 22 3 20 3 17Z"
          fill="#c45a3b"
        />

        {/* Subtle highlight on cap */}
        <ellipse cx="10" cy="10" rx="4" ry="2.5" fill="white" opacity="0.1" />
      </svg>
    )
  }

  return (
    <svg
      viewBox="0 0 120 145"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Pin-shaped stem - tapers to point */}
      <path
        d="M38 85 C38 85 48 115 60 140 C72 115 82 85 82 85Z"
        fill="#fef3c7"
      />

      {/* Mushroom cap - rounded dome */}
      <path
        d="M8 72 C8 38 28 10 60 10 C92 10 112 38 112 72 C112 82 100 90 60 90 C20 90 8 82 8 72Z"
        fill="#c45a3b"
      />

      {/* Subtle highlight on cap */}
      <ellipse cx="35" cy="38" rx="16" ry="10" fill="white" opacity="0.1" />
    </svg>
  )
}
