'use client'

import type { BookingSummary } from '@/hooks/use-agent-chat'

interface BookingSummaryCardProps {
  summary: BookingSummary
  onConfirm: () => void
  onEdit: () => void
  status: 'draft' | 'sent' | 'approved' | 'declined' | 'modified'
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  const days = ['Sön', 'Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör']
  const months = [
    'jan', 'feb', 'mar', 'apr', 'maj', 'jun',
    'jul', 'aug', 'sep', 'okt', 'nov', 'dec',
  ]
  const dayName = days[date.getDay()]
  const day = date.getDate()
  const month = months[date.getMonth()]
  return `${dayName} ${day} ${month}`
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('sv-SE').format(price) + ' kr'
}

function StatusBadge({ status }: { status: BookingSummaryCardProps['status'] }) {
  switch (status) {
    case 'sent':
      return (
        <div className="flex items-center gap-1.5 text-sm text-[#78716c]">
          <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>Skickad — inväntar svar</span>
        </div>
      )
    case 'approved':
      return (
        <div className="flex items-center gap-1.5 text-sm text-green-700">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>Godkänd!</span>
        </div>
      )
    case 'declined':
      return (
        <div className="flex items-center gap-1.5 text-sm text-red-600">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          <span>Avböjd</span>
        </div>
      )
    case 'modified':
      return (
        <div className="flex items-center gap-1.5 text-sm text-amber-600">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          <span>Ändrad av lokalen</span>
        </div>
      )
    default:
      return null
  }
}

export function BookingSummaryCard({
  summary,
  onConfirm,
  onEdit,
  status,
}: BookingSummaryCardProps) {
  const isDraft = status === 'draft'

  return (
    <div className="bg-white border border-[#e7e5e4] rounded-xl p-3.5 my-1 shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-2 mb-2.5">
        <svg
          className="w-4 h-4 text-[#78716c]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
          />
        </svg>
        <span className="text-sm font-medium text-[#1a1a1a]">
          Bokningsförslag
        </span>
      </div>

      {/* Details */}
      <div className="space-y-1 text-sm text-[#1a1a1a]">
        <p>
          {summary.eventTypeLabel} · {summary.guestCount} gäster
        </p>
        <p className="text-[#78716c]">
          {formatDate(summary.date)} · {summary.startTime}–{summary.endTime}
        </p>
        <p className="font-medium">{formatPrice(summary.price)}</p>
        {summary.extras.length > 0 && (
          <p className="text-[#78716c] text-xs">
            {summary.extras.join(', ')}
          </p>
        )}
      </div>

      {/* Actions or Status */}
      <div className="mt-3 pt-2.5 border-t border-[#e7e5e4]">
        {isDraft ? (
          <div className="flex gap-2">
            <button
              onClick={onConfirm}
              className="flex-1 h-8 text-sm font-medium bg-[#c45a3b] text-white rounded-lg hover:bg-[#a84832] transition-colors"
            >
              Skicka till lokalen
            </button>
            <button
              onClick={onEdit}
              className="h-8 px-3 text-sm font-medium text-[#78716c] border border-[#e7e5e4] rounded-lg hover:bg-[#f3f4f6] transition-colors"
            >
              Ändra
            </button>
          </div>
        ) : (
          <StatusBadge status={status} />
        )}
      </div>
    </div>
  )
}
