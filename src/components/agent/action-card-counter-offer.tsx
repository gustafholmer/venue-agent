'use client'

import { ActionCard } from './action-card'
import type { BookingApprovalSummary, AgentActionStatus } from '@/types/agent-booking'

interface CounterOfferSummary extends BookingApprovalSummary {
  originalActionId?: string
  ownerNote?: string
}

interface CounterOfferCardProps {
  action: {
    id: string
    status: string
    summary: CounterOfferSummary
    created_at: string
    venue?: { name: string }
  }
  onActionComplete?: () => void
}

function formatSwedishDate(dateStr: string): string {
  const date = new Date(dateStr)
  const days = ['Son', 'Man', 'Tis', 'Ons', 'Tor', 'Fre', 'Lor']
  const months = [
    'jan', 'feb', 'mar', 'apr', 'maj', 'jun',
    'jul', 'aug', 'sep', 'okt', 'nov', 'dec',
  ]
  return `${days[date.getDay()]} ${date.getDate()} ${months[date.getMonth()]}`
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('sv-SE').format(price) + ' kr'
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'pending':
      return (
        <div className="flex items-center gap-1.5 text-sm text-amber-600">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Invantar kundens svar</span>
        </div>
      )
    case 'approved':
      return (
        <div className="flex items-center gap-1.5 text-sm text-green-700">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>Accepterat av kunden</span>
        </div>
      )
    case 'declined':
      return (
        <div className="flex items-center gap-1.5 text-sm text-red-600">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          <span>Avbojt av kunden</span>
        </div>
      )
    case 'expired':
      return (
        <div className="flex items-center gap-1.5 text-sm text-[#78716c]">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Utgangen</span>
        </div>
      )
    default:
      return null
  }
}

export function ActionCardCounterOffer({ action }: CounterOfferCardProps) {
  const summary = action.summary

  return (
    <ActionCard
      status={action.status as AgentActionStatus}
      createdAt={action.created_at}
      venueName={action.venue?.name}
    >
      {/* Heading */}
      <div className="flex items-center gap-2 mb-2">
        <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
        <span className="text-sm font-semibold text-[#1a1a1a]">Motbud skickat</span>
      </div>

      {/* Modified booking details */}
      <div className="space-y-1 text-sm text-[#1a1a1a] mb-2">
        <p>
          {summary.eventTypeLabel} · {summary.guestCount} gaster · {formatSwedishDate(summary.date)} · {summary.startTime}–{summary.endTime}
        </p>
        <p className="font-semibold">{formatPrice(summary.price)}</p>
      </div>

      {/* Owner note */}
      {summary.ownerNote && (
        <p className="text-xs text-[#78716c] italic mb-3">
          &ldquo;{summary.ownerNote}&rdquo;
        </p>
      )}

      {/* Status */}
      <div className="pt-2 border-t border-[#e7e5e4]">
        <StatusBadge status={action.status} />
      </div>
    </ActionCard>
  )
}
