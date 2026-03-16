'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getVenueConversations, type ConversationListItem } from '@/actions/agent-conversations/get-venue-conversations'
import { ConversationDetail } from './conversation-detail'
import type { AgentConversationMessage } from '@/types/agent-booking'

interface ConversationListProps {
  venueId?: string
}

type TabKey = 'pending' | 'all'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'pending', label: 'Att göra' },
  { key: 'all', label: 'Alla' },
]

function getLastUserMessage(messages: AgentConversationMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === 'user') {
      return messages[i].content
    }
  }
  return ''
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

  const months = ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec']
  return `${date.getDate()} ${months[date.getMonth()]}`
}

export function ConversationList({ venueId }: ConversationListProps) {
  const [conversations, setConversations] = useState<ConversationListItem[]>([])
  const [activeTab, setActiveTab] = useState<TabKey>('pending')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchConversations = useCallback(async () => {
    const result = await getVenueConversations({ venueId, limit: 50 })
    if (result.success && result.conversations) {
      setConversations(result.conversations)
    }
    setIsLoading(false)
  }, [venueId])

  useEffect(() => {
    fetchConversations()
  }, [fetchConversations])

  // Realtime subscription on agent_conversations
  useEffect(() => {
    const supabase = createClient()
    const channelName = venueId ? `conv-list:${venueId}` : 'conv-list:all'

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'agent_conversations',
          ...(venueId ? { filter: `venue_id=eq.${venueId}` } : {}),
        },
        () => {
          fetchConversations()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [venueId, fetchConversations])

  // If a conversation is selected, show detail view
  if (selectedId) {
    return (
      <ConversationDetail
        conversationId={selectedId}
        onBack={() => {
          setSelectedId(null)
          fetchConversations()
        }}
      />
    )
  }

  const filtered = activeTab === 'pending'
    ? conversations.filter(c => c.pending_escalation_id !== null)
    : conversations

  const pendingCount = conversations.filter(c => c.pending_escalation_id !== null).length

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
          <svg className="h-6 w-6 animate-spin text-[#78716c]" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <svg className="w-12 h-12 text-[#e7e5e4] mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <p className="text-sm text-[#78716c]">
            {activeTab === 'pending'
              ? 'Inga ärenden att hantera'
              : 'Inga konversationer än'}
          </p>
        </div>
      )}

      {/* Conversation rows */}
      {!isLoading && filtered.length > 0 && (
        <div className="bg-white border border-[#e7e5e4] rounded-xl overflow-hidden divide-y divide-[#e7e5e4]">
          {filtered.map((conv) => {
            const lastMessage = getLastUserMessage(conv.messages)
            const displayName = conv.customer_name || conv.customer_email || 'Anonym'

            return (
              <button
                key={conv.id}
                onClick={() => setSelectedId(conv.id)}
                className="w-full flex items-center justify-between px-4 sm:px-6 py-4 hover:bg-[#fafaf9] transition-colors text-left"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-medium text-[#1a1a1a] truncate">
                      {displayName}
                    </span>
                    {conv.pending_escalation_id && (
                      <span className="flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[#c45a3b]/10 text-[#c45a3b]">
                        Behöver svar
                      </span>
                    )}
                    {!venueId && conv.venue_name && (
                      <span className="flex-shrink-0 text-xs text-[#a8a29e]">
                        {conv.venue_name}
                      </span>
                    )}
                  </div>
                  {lastMessage && (
                    <p className="text-sm text-[#78716c] truncate">
                      {lastMessage}
                    </p>
                  )}
                </div>
                <div className="flex-shrink-0 ml-4">
                  <span className="text-xs text-[#a8a29e]">
                    {formatRelativeTime(conv.updated_at)}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
