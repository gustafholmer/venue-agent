'use client'

import { useState } from 'react'
import { approveAction } from '@/actions/agent-actions/approve-action'
import { declineAction } from '@/actions/agent-actions/decline-action'
import { ActionCard } from './action-card'
import { ModifyDialog } from './modify-dialog'
import type { BookingApprovalSummary, AgentActionStatus } from '@/types/agent-booking'

interface BookingApprovalCardProps {
  action: {
    id: string
    status: string
    summary: BookingApprovalSummary
    created_at: string
    venue?: { name: string }
  }
  onActionComplete?: () => void
}

function formatSwedishDate(dateStr: string): string {
  const date = new Date(dateStr)
  const days = ['Sön', 'Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör']
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
    case 'approved':
      return (
        <div className="flex items-center gap-1.5 text-sm text-green-700">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>Godkänd</span>
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
          <span>Motbud skickat</span>
        </div>
      )
    case 'expired':
      return (
        <div className="flex items-center gap-1.5 text-sm text-[#78716c]">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Utgången</span>
        </div>
      )
    default:
      return null
  }
}

export function ActionCardBooking({ action, onActionComplete }: BookingApprovalCardProps) {
  const [isApproving, setIsApproving] = useState(false)
  const [isDeclining, setIsDeclining] = useState(false)
  const [showDeclineInput, setShowDeclineInput] = useState(false)
  const [declineReason, setDeclineReason] = useState('')
  const [showModify, setShowModify] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const summary = action.summary
  const isPending = action.status === 'pending'

  async function handleApprove() {
    setIsApproving(true)
    setError(null)
    try {
      const result = await approveAction(action.id)
      if (!result.success) {
        setError(result.error ?? 'Kunde inte godkänna')
      } else {
        onActionComplete?.()
      }
    } catch {
      setError('Ett oväntat fel uppstod')
    } finally {
      setIsApproving(false)
    }
  }

  async function handleDecline() {
    if (!showDeclineInput) {
      setShowDeclineInput(true)
      return
    }

    setIsDeclining(true)
    setError(null)
    try {
      const result = await declineAction(action.id, declineReason || undefined)
      if (!result.success) {
        setError(result.error ?? 'Kunde inte avböja')
      } else {
        onActionComplete?.()
      }
    } catch {
      setError('Ett oväntat fel uppstod')
    } finally {
      setIsDeclining(false)
    }
  }

  // Build extras display
  const extrasText = summary.extras.length > 0 ? summary.extras.join(' + ') : null
  const cateringNote = 'Ingen catering'

  return (
    <ActionCard
      status={action.status as AgentActionStatus}
      createdAt={action.created_at}
      venueName={action.venue?.name}
    >
      {/* Heading */}
      <div className="flex items-center gap-2 mb-2">
        <span className="w-2 h-2 rounded-full bg-[#c45a3b]" aria-hidden="true" />
        <span className="text-sm font-semibold text-[#1a1a1a]">Ny bokningsforfragan</span>
      </div>

      {/* Details */}
      <div className="space-y-1 text-sm text-[#1a1a1a] mb-3">
        <p>
          {summary.eventTypeLabel} · {summary.guestCount} gaster · {formatSwedishDate(summary.date)} · {summary.startTime}–{summary.endTime}
        </p>
        <p className="font-semibold">{formatPrice(summary.price)}</p>
        <p className="text-[#78716c] text-xs">
          {extrasText ?? cateringNote}
        </p>
      </div>

      {/* Customer info */}
      {(summary.customerName || summary.companyName) && (
        <p className="text-xs text-[#78716c] mb-3">
          Kund: {summary.customerName}{summary.companyName ? `, ${summary.companyName}` : ''}
        </p>
      )}

      {/* Customer note */}
      {summary.customerNote && (
        <p className="text-xs text-[#78716c] italic mb-3">
          &ldquo;{summary.customerNote}&rdquo;
        </p>
      )}

      {/* Error */}
      {error && (
        <p className="text-xs text-red-600 mb-2">{error}</p>
      )}

      {/* Actions or resolved state */}
      {isPending ? (
        <div className="space-y-2">
          {/* Decline reason input */}
          {showDeclineInput && (
            <input
              type="text"
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              placeholder="Anledning (valfritt)"
              className="w-full h-9 px-3 text-sm border border-[#e7e5e4] rounded-lg focus:outline-none focus:border-[#c45a3b]"
            />
          )}

          <div className="flex gap-2">
            <button
              onClick={handleApprove}
              disabled={isApproving || isDeclining}
              className="flex-1 h-9 text-sm font-medium bg-[#c45a3b] text-white rounded-lg hover:bg-[#a84832] disabled:opacity-50 disabled:cursor-not-allowed transition-colors inline-flex items-center justify-center gap-2"
            >
              {isApproving && <Spinner />}
              Godkann
            </button>
            <button
              onClick={handleDecline}
              disabled={isApproving || isDeclining}
              className="flex-1 h-9 text-sm font-medium text-[#1a1a1a] border border-[#e7e5e4] rounded-lg hover:bg-[#f5f5f4] disabled:opacity-50 disabled:cursor-not-allowed transition-colors inline-flex items-center justify-center gap-2"
            >
              {isDeclining && <Spinner />}
              Avboj
            </button>
            <button
              onClick={() => setShowModify(true)}
              disabled={isApproving || isDeclining}
              className="flex-1 h-9 text-sm font-medium text-[#1a1a1a] border border-[#e7e5e4] rounded-lg hover:bg-[#f5f5f4] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Andra
            </button>
          </div>

          {/* Inline modify dialog */}
          {showModify && (
            <ModifyDialog
              actionId={action.id}
              originalSummary={summary}
              onClose={() => setShowModify(false)}
              onComplete={() => {
                setShowModify(false)
                onActionComplete?.()
              }}
            />
          )}
        </div>
      ) : (
        <div className="pt-2 border-t border-[#e7e5e4]">
          <StatusBadge status={action.status} />
        </div>
      )}
    </ActionCard>
  )
}

function Spinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}
