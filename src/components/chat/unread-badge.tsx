'use client'

import { memo } from 'react'

interface UnreadBadgeProps {
  count: number
  /** Show animated ping indicator */
  animate?: boolean
  /** Size variant */
  size?: 'sm' | 'md'
}

export const UnreadBadge = memo(function UnreadBadge({
  count,
  animate = true,
  size = 'md',
}: UnreadBadgeProps) {
  if (count <= 0) return null

  const displayCount = count > 99 ? '99+' : count.toString()

  const sizeClasses = {
    sm: 'min-w-[16px] h-4 text-[10px] px-1',
    md: 'min-w-[20px] h-5 text-xs px-1.5',
  }

  return (
    <span className="relative inline-flex">
      <span
        className={`
          inline-flex items-center justify-center
          rounded-full font-medium
          bg-[var(--accent)] text-white
          ${sizeClasses[size]}
        `}
      >
        {displayCount}
      </span>
      {animate && (
        <span
          className="absolute inset-0 rounded-full bg-[var(--accent)] animate-ping opacity-40"
          style={{ animationDuration: '1.5s' }}
        />
      )}
    </span>
  )
})

/**
 * Simple dot indicator for smaller spaces
 */
interface UnreadDotProps {
  visible: boolean
  animate?: boolean
}

export const UnreadDot = memo(function UnreadDot({
  visible,
  animate = true,
}: UnreadDotProps) {
  if (!visible) return null

  return (
    <span className="relative inline-flex">
      <span className="w-2.5 h-2.5 rounded-full bg-[var(--accent)]" />
      {animate && (
        <span
          className="absolute inset-0 rounded-full bg-[var(--accent)] animate-ping opacity-40"
          style={{ animationDuration: '1.5s' }}
        />
      )}
    </span>
  )
})
