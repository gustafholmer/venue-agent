'use client'

import { useState, useEffect, useCallback } from 'react'

export interface AgentChatMessage {
  id: string
  role: 'user' | 'agent'
  content: string
  timestamp: string
}

interface UseAgentChatOptions {
  venueId: string
  venueName: string
}

interface UseAgentChatReturn {
  messages: AgentChatMessage[]
  sendMessage: (content: string) => Promise<void>
  isLoading: boolean
  conversationId: string | null
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
      } catch (error) {
        console.error('Failed to fetch agent messages:', error)
      }
    }

    fetchMessages()

    return () => {
      cancelled = true
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
        }

        setMessages((prev) => [...prev, agentMsg])
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

  return {
    messages,
    sendMessage,
    isLoading,
    conversationId,
  }
}
