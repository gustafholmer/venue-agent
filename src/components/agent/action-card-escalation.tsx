'use client'

import { useState } from 'react'
import { declineAction } from '@/actions/agent-actions/decline-action'
import { ActionCard } from './action-card'
import { ReplyDialog } from './reply-dialog'
import type { EscalationSummary, AgentActionStatus } from '@/types/agent-booking'

interface EscalationCardProps {
  action: {
    id: string
    status: string
    summary: EscalationSummary
    created_at: string
    venue?: { name: string }
  }
  onActionComplete?: () => void
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
          <span>Besvarad</span>
        </div>
      )
    case 'declined':
      return (
        <div className="flex items-center gap-1.5 text-sm text-red-600">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          <span>Avbojd</span>
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

export function ActionCardEscalation({ action, onActionComplete }: EscalationCardProps) {
  const [isDeclining, setIsDeclining] = useState(false)
  const [showReply, setShowReply] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const summary = action.summary
  const isPending = action.status === 'pending'

  async function handleDecline() {
    setIsDeclining(true)
    setError(null)
    try {
      const result = await declineAction(action.id)
      if (!result.success) {
        setError(result.error ?? 'Kunde inte avboja')
      } else {
        onActionComplete?.()
      }
    } catch {
      setError('Ett ovantat fel uppstod')
    } finally {
      setIsDeclining(false)
    }
  }

  return (
    <ActionCard
      status={action.status as AgentActionStatus}
      createdAt={action.created_at}
      venueName={action.venue?.name}
    >
      {/* Heading */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-base" aria-hidden="true">&#9889;</span>
        <span className="text-sm font-semibold text-[#1a1a1a]">Behover ditt svar</span>
      </div>

      {/* Customer request */}
      <p className="text-sm text-[#1a1a1a] mb-2">
        {summary.customerRequest}
      </p>

      {/* Escalation reasons */}
      {summary.reasons.length > 0 && (
        <p className="text-xs text-[#78716c] mb-2">
          Eskalerat pga: {summary.reasons.join(', ')}
        </p>
      )}

      {/* Customer budget */}
      {summary.customerBudget != null && (
        <p className="text-xs text-[#78716c] mb-3">
          Kundbudget: ~{formatPrice(summary.customerBudget)}
        </p>
      )}

      {/* Error */}
      {error && (
        <p className="text-xs text-red-600 mb-2">{error}</p>
      )}

      {/* Actions or resolved state */}
      {isPending ? (
        <div className="space-y-2">
          <div className="flex gap-2">
            <button
              onClick={() => setShowReply(true)}
              disabled={isDeclining}
              className="flex-1 h-9 text-sm font-medium bg-[#c45a3b] text-white rounded-lg hover:bg-[#a84832] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Svara
            </button>
            <button
              onClick={handleDecline}
              disabled={isDeclining}
              className="flex-1 h-9 text-sm font-medium text-[#1a1a1a] border border-[#e7e5e4] rounded-lg hover:bg-[#f5f5f4] disabled:opacity-50 disabled:cursor-not-allowed transition-colors inline-flex items-center justify-center gap-2"
            >
              {isDeclining && <Spinner />}
              Avboj
            </button>
          </div>

          {/* Inline reply dialog */}
          {showReply && (
            <ReplyDialog
              actionId={action.id}
              onClose={() => setShowReply(false)}
              onComplete={() => {
                setShowReply(false)
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
