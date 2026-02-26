'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

export interface BookingSummary {
  date: string
  startTime: string
  endTime: string
  guestCount: number
  eventType: string
  eventTypeLabel: string
  price: number
  extras: string[]
}

export interface VenueSuggestion {
  name: string
  slug: string
  capacity: string
  priceRange: string
  area: string
  matchReason: string
}

export interface AgentChatMessage {
  id: string
  role: 'user' | 'agent'
  content: string
  bookingSummary?: BookingSummary
  venueSuggestions?: VenueSuggestion[]
  timestamp: string
  status?: 'draft' | 'sent' | 'approved' | 'declined' | 'modified'
}

interface UseAgentChatOptions {
  venueId: string
  venueName: string
}

interface UseAgentChatReturn {
  messages: AgentChatMessage[]
  sendMessage: (content: string) => Promise<void>
  confirmBooking: (messageId: string) => Promise<void>
  isLoading: boolean
  conversationId: string | null
  isWaitingForOwner: boolean
}

function getStorageKey(venueId: string): string {
  return `agent_conv_${venueId}`
}

export function useAgentChat({
  venueId,
  venueName,
}: UseAgentChatOptions): UseAgentChatReturn {
  const [messages, setMessages] = useState<AgentChatMessage[]>([])
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isWaitingForOwner, setIsWaitingForOwner] = useState(false)

  const channelRef = useRef<RealtimeChannel | null>(null)
  const supabaseRef = useRef(createClient())

  // Restore conversationId from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(getStorageKey(venueId))
    if (stored) {
      setConversationId(stored)
    }
  }, [venueId])

  // Fetch existing messages when conversationId is restored
  useEffect(() => {
    if (!conversationId) return

    let cancelled = false

    async function fetchMessages() {
      try {
        const response = await fetch(
          `/api/venue-agent?conversationId=${encodeURIComponent(conversationId!)}`,
        )
        if (!response.ok) return

        const data = await response.json()
        if (cancelled) return

        if (data.messages && Array.isArray(data.messages)) {
          setMessages(data.messages)
        }
        if (data.isWaitingForOwner) {
          setIsWaitingForOwner(true)
        }
      } catch (error) {
        console.error('Failed to fetch agent messages:', error)
      }
    }

    fetchMessages()

    return () => {
      cancelled = true
    }
  }, [conversationId])

  // Subscribe to Supabase Realtime for owner action updates
  useEffect(() => {
    if (!conversationId) return

    const supabase = supabaseRef.current
    const channelName = `agent:${conversationId}`

    const channel = supabase.channel(channelName, {
      config: {
        broadcast: { self: false },
      },
    })

    channel
      .on('broadcast', { event: 'action_update' }, ({ payload }) => {
        if (!payload) return

        const { action, message: updateMessage } = payload as {
          action: 'approved' | 'declined' | 'modified'
          message?: string
        }

        // Update waiting status
        setIsWaitingForOwner(false)

        // Update the status of booking summary messages
        setMessages((prev) =>
          prev.map((msg) => {
            if (msg.bookingSummary && msg.status === 'sent') {
              return { ...msg, status: action }
            }
            return msg
          }),
        )

        // Add a system-style agent message about the update
        const statusMessages: Record<string, string> = {
          approved: 'Lokalen har godkänt din bokning!',
          declined: 'Tyvärr, lokalen kunde inte godkänna denna bokning.',
          modified:
            updateMessage ||
            'Lokalen har föreslagit en ändring av bokningen.',
        }

        const systemMsg: AgentChatMessage = {
          id: `system_${Date.now()}`,
          role: 'agent',
          content: statusMessages[action] || 'Uppdatering från lokalen.',
          timestamp: new Date().toISOString(),
        }

        setMessages((prev) => [...prev, systemMsg])
      })
      .subscribe()

    channelRef.current = channel

    return () => {
      channel.unsubscribe()
      channelRef.current = null
    }
  }, [conversationId])

  // Send a message to the agent
  const sendMessage = useCallback(
    async (content: string) => {
      const trimmed = content.trim()
      if (!trimmed || isLoading) return

      // Optimistic UI: add user message immediately
      const userMsg: AgentChatMessage = {
        id: `user_${Date.now()}`,
        role: 'user',
        content: trimmed,
        timestamp: new Date().toISOString(),
      }

      setMessages((prev) => [...prev, userMsg])
      setIsLoading(true)

      try {
        const response = await fetch('/api/venue-agent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            conversationId,
            venueId,
            message: trimmed,
          }),
        })

        if (!response.ok) throw new Error('Failed to get response')

        const data = await response.json()

        // Store conversationId if new
        if (data.conversationId && data.conversationId !== conversationId) {
          setConversationId(data.conversationId)
          localStorage.setItem(getStorageKey(venueId), data.conversationId)
        }

        // Build agent message
        const agentMsg: AgentChatMessage = {
          id: `agent_${Date.now()}`,
          role: 'agent',
          content: data.message,
          timestamp: new Date().toISOString(),
          bookingSummary: data.bookingSummary || undefined,
          venueSuggestions: data.venueSuggestions || undefined,
          status: data.bookingSummary ? 'draft' : undefined,
        }

        setMessages((prev) => [...prev, agentMsg])

        // Update waiting status if agent indicates it
        if (data.isWaitingForOwner) {
          setIsWaitingForOwner(true)
        }
      } catch (error) {
        console.error('Agent chat error:', error)
        setMessages((prev) => [
          ...prev,
          {
            id: `error_${Date.now()}`,
            role: 'agent',
            content: 'Något gick fel. Försök igen.',
            timestamp: new Date().toISOString(),
          },
        ])
      } finally {
        setIsLoading(false)
      }
    },
    [isLoading, conversationId, venueId],
  )

  // Confirm/send a booking proposal to the venue owner
  const confirmBooking = useCallback(
    async (messageId: string) => {
      if (!conversationId) return

      // Update the message status to 'sent' optimistically
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId ? { ...msg, status: 'sent' as const } : msg,
        ),
      )
      setIsWaitingForOwner(true)

      try {
        const response = await fetch('/api/venue-agent/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ conversationId, messageId }),
        })

        if (!response.ok) {
          throw new Error('Failed to confirm booking')
        }
      } catch (error) {
        console.error('Failed to confirm booking:', error)
        // Revert optimistic update
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === messageId
              ? { ...msg, status: 'draft' as const }
              : msg,
          ),
        )
        setIsWaitingForOwner(false)
      }
    },
    [conversationId],
  )

  return {
    messages,
    sendMessage,
    confirmBooking,
    isLoading,
    conversationId,
    isWaitingForOwner,
  }
}
