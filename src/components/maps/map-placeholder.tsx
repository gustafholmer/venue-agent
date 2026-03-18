'use client'

interface MapPlaceholderProps {
  height?: string
  className?: string
}

export function MapPlaceholder({ height = '400px', className = '' }: MapPlaceholderProps) {
  return (
    <div
      className={`bg-[#e8e4df] rounded-lg overflow-hidden relative ${className}`}
      style={{ height }}
    >
      {/* SVG street grid pattern */}
      <svg
        className="absolute inset-0 w-full h-full opacity-30"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <pattern id="grid" width="80" height="80" patternUnits="userSpaceOnUse">
            <rect width="80" height="80" fill="none" />
            <path d="M 80 0 L 0 0 0 80" fill="none" stroke="#c4bfb8" strokeWidth="1" />
          </pattern>
          <pattern id="blocks" width="160" height="160" patternUnits="userSpaceOnUse">
            <rect width="160" height="160" fill="url(#grid)" />
            <rect x="8" y="8" width="64" height="64" rx="2" fill="#d6d1cb" />
            <rect x="88" y="8" width="64" height="64" rx="2" fill="#dad5cf" />
            <rect x="8" y="88" width="64" height="64" rx="2" fill="#dad5cf" />
            <rect x="88" y="88" width="64" height="64" rx="2" fill="#d6d1cb" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#blocks)" />
        {/* Diagonal "main road" */}
        <line x1="0" y1="30%" x2="100%" y2="70%" stroke="#c4bfb8" strokeWidth="3" />
        {/* Horizontal "road" */}
        <line x1="0" y1="50%" x2="100%" y2="50%" stroke="#c4bfb8" strokeWidth="2" />
      </svg>
    </div>
  )
}
