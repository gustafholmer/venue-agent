'use client'

import type { ReactNode } from 'react'
import type { AgentActionStatus } from '@/types/agent-booking'

interface ActionCardProps {
  children: ReactNode
  status: AgentActionStatus
  createdAt: string
  venueName?: string
}

function formatRelativeTime(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffMinutes = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMinutes < 1) return 'just nu'
  if (diffMinutes < 60) return `${diffMinutes} min sedan`
  if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'timme' : 'timmar'} sedan`
  if (diffDays < 7) return `${diffDays} ${diffDays === 1 ? 'dag' : 'dagar'} sedan`

  const days = ['sön', 'mån', 'tis', 'ons', 'tor', 'fre', 'lör']
  const months = [
    'jan', 'feb', 'mar', 'apr', 'maj', 'jun',
    'jul', 'aug', 'sep', 'okt', 'nov', 'dec',
  ]
  return `${days[date.getDay()]} ${date.getDate()} ${months[date.getMonth()]}`
}

export function ActionCard({ children, status, createdAt, venueName }: ActionCardProps) {
  const isPending = status === 'pending'

  return (
    <div
      className={`rounded-xl border shadow-sm p-4 transition-colors ${
        isPending
          ? 'bg-white border-l-4 border-l-[#c45a3b] border-[#e7e5e4]'
          : 'bg-[#f5f5f4] border-[#e7e5e4] opacity-75'
      }`}
    >
      {/* Meta: timestamp and venue name */}
      <div className="flex items-center gap-2 mb-3 text-xs text-[#78716c]">
        <span>{formatRelativeTime(createdAt)}</span>
        {venueName && (
          <>
            <span aria-hidden="true">·</span>
            <span>{venueName}</span>
          </>
        )}
      </div>

      {children}
    </div>
  )
}
