'use client'

import { useState, useEffect, useCallback } from 'react'
import { getAgentActions } from '@/actions/agent-actions/get-actions'
import { createClient } from '@/lib/supabase/client'
import { ActionCardBooking } from './action-card-booking'
import { ActionCardEscalation } from './action-card-escalation'
import { ActionCardCounterOffer } from './action-card-counter-offer'
import type { BookingApprovalSummary, EscalationSummary } from '@/types/agent-booking'

interface ActionFeedProps {
  venueId?: string
  initialActions?: ActionRow[]
}

interface ActionRow {
  id: string
  venue_id: string
  conversation_id: string
  customer_id: string | null
  action_type: string
  status: string
  summary: Record<string, unknown>
  owner_response: Record<string, unknown> | null
  booking_request_id: string | null
  created_at: string
  updated_at: string
  resolved_at: string | null
  venues: { name: string } | null
  agent_conversations: {
    customer_id: string | null
    status: string
    collected_booking_data: Record<string, unknown> | null
  } | null
}

type TabKey = 'pending' | 'all' | 'approved' | 'declined'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'pending', label: 'Att gora' },
  { key: 'all', label: 'Alla' },
  { key: 'approved', label: 'Godkanda' },
  { key: 'declined', label: 'Avbojda' },
]

function filterActions(actions: ActionRow[], tab: TabKey): ActionRow[] {
  switch (tab) {
    case 'pending':
      return actions.filter((a) => a.status === 'pending')
    case 'approved':
      return actions.filter((a) => a.status === 'approved')
    case 'declined':
      return actions.filter((a) => a.status === 'declined')
    case 'all':
    default:
      return actions
  }
}

export function ActionFeed({ venueId, initialActions }: ActionFeedProps) {
  const [actions, setActions] = useState<ActionRow[]>(initialActions ?? [])
  const [activeTab, setActiveTab] = useState<TabKey>('pending')
  const [isLoading, setIsLoading] = useState(!initialActions)

  const fetchActions = useCallback(async () => {
    const result = await getAgentActions({
      venueId,
      limit: 50,
    })
    if (result.success && result.actions) {
      setActions(result.actions as unknown as ActionRow[])
    }
    setIsLoading(false)
  }, [venueId])

  // Initial load
  useEffect(() => {
    if (!initialActions) {
      fetchActions()
    }
  }, [fetchActions, initialActions])

  // Subscribe to Supabase Realtime for live updates
  useEffect(() => {
    const supabase = createClient()
    const channelName = venueId ? `actions:${venueId}` : 'actions:all'

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'agent_actions',
          ...(venueId ? { filter: `venue_id=eq.${venueId}` } : {}),
        },
        () => {
          // Refetch on any change to agent_actions
          fetchActions()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [venueId, fetchActions])

  function handleActionComplete() {
    fetchActions()
  }

  const filteredActions = filterActions(actions, activeTab)
  const pendingCount = actions.filter((a) => a.status === 'pending').length

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-1 border-b border-[#e7e5e4] mb-4">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-2 text-sm font-medium transition-colors relative ${
              activeTab === tab.key
                ? 'text-[#1a1a1a]'
                : 'text-[#78716c] hover:text-[#1a1a1a]'
            }`}
          >
            {tab.label}
            {tab.key === 'pending' && pendingCount > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-xs font-medium bg-[#c45a3b] text-white rounded-full">
                {pendingCount}
              </span>
            )}
            {activeTab === tab.key && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#1a1a1a] rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex justify-center py-12">
          <svg
            className="h-6 w-6 animate-spin text-[#78716c]"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && filteredActions.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <svg
            className="w-12 h-12 text-[#e7e5e4] mb-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
            />
          </svg>
          <p className="text-sm text-[#78716c]">Inga atgarder just nu</p>
          {activeTab !== 'all' && activeTab !== 'pending' && (
            <p className="text-xs text-[#78716c] mt-1">
              Prova en annan flik
            </p>
          )}
        </div>
      )}

      {/* Action cards */}
      {!isLoading && filteredActions.length > 0 && (
        <div className="space-y-3">
          {filteredActions.map((action) => {
            switch (action.action_type) {
              case 'booking_approval':
                return (
                  <ActionCardBooking
                    key={action.id}
                    action={{
                      id: action.id,
                      status: action.status,
                      summary: action.summary as unknown as BookingApprovalSummary,
                      created_at: action.created_at,
                      venue: action.venues ? { name: action.venues.name } : undefined,
                    }}
                    onActionComplete={handleActionComplete}
                  />
                )
              case 'escalation':
                return (
                  <ActionCardEscalation
                    key={action.id}
                    action={{
                      id: action.id,
                      status: action.status,
                      summary: action.summary as unknown as EscalationSummary,
                      created_at: action.created_at,
                      venue: action.venues ? { name: action.venues.name } : undefined,
                    }}
                    onActionComplete={handleActionComplete}
                  />
                )
              case 'counter_offer':
                return (
                  <ActionCardCounterOffer
                    key={action.id}
                    action={{
                      id: action.id,
                      status: action.status,
                      summary: action.summary as unknown as BookingApprovalSummary & { originalActionId?: string; ownerNote?: string },
                      created_at: action.created_at,
                      venue: action.venues ? { name: action.venues.name } : undefined,
                    }}
                    onActionComplete={handleActionComplete}
                  />
                )
              default:
                return null
            }
          })}
        </div>
      )}
    </div>
  )
}
