'use client'

interface MapPlaceholderProps {
  height?: string
  className?: string
}

export function MapPlaceholder({ height = '400px', className = '' }: MapPlaceholderProps) {
  return (
    <div
      className={`bg-[#f5f3f0] border border-[#e7e5e4] rounded-lg flex items-center justify-center ${className}`}
      style={{ height }}
    >
      <div className="text-center px-4">
        <svg
          className="w-12 h-12 mx-auto mb-3 text-[#a8a29e]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
        <p className="text-sm text-[#78716c]">
          Configure Google Maps API key to enable map view
        </p>
        <p className="text-xs text-[#a8a29e] mt-1">
          Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to your environment
        </p>
      </div>
    </div>
  )
}
