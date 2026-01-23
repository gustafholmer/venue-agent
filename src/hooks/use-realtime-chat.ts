'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

export interface ChatMessage {
  id: string
  booking_request_id: string
  sender_id: string
  content: string
  is_read: boolean
  read_at: string | null
  created_at: string
  updated_at: string
  sender?: {
    id: string
    full_name: string | null
    email: string
  }
}

interface UseRealtimeChatOptions {
  bookingId: string
  currentUserId: string
  initialMessages?: ChatMessage[]
  onNewMessage?: (message: ChatMessage) => void
}

interface UseRealtimeChatReturn {
  messages: ChatMessage[]
  sendMessage: (content: string) => Promise<{ success: boolean; error?: string }>
  isConnected: boolean
  isConnecting: boolean
  connectionError: string | null
}

export function useRealtimeChat({
  bookingId,
  currentUserId,
  initialMessages = [],
  onNewMessage,
}: UseRealtimeChatOptions): UseRealtimeChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages)
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(true)
  const [connectionError, setConnectionError] = useState<string | null>(null)

  const channelRef = useRef<RealtimeChannel | null>(null)
  const supabaseRef = useRef(createClient())

  // Merge new messages avoiding duplicates
  const addMessage = useCallback((newMessage: ChatMessage) => {
    setMessages(prev => {
      // Check if message already exists
      if (prev.some(m => m.id === newMessage.id)) {
        return prev
      }
      return [...prev, newMessage]
    })
    onNewMessage?.(newMessage)
  }, [onNewMessage])

  // Set up realtime subscription
  useEffect(() => {
    const supabase = supabaseRef.current
    const channelName = `chat:${bookingId}`

    setIsConnecting(true)
    setConnectionError(null)

    const channel = supabase.channel(channelName, {
      config: {
        broadcast: { self: false }, // Don't receive own broadcasts
      },
    })

    channel
      .on('broadcast', { event: 'message' }, ({ payload }) => {
        if (payload && typeof payload === 'object' && 'id' in payload) {
          addMessage(payload as ChatMessage)
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true)
          setIsConnecting(false)
          setConnectionError(null)
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setIsConnected(false)
          setIsConnecting(false)
          setConnectionError('Anslutningen bröts')
        } else if (status === 'TIMED_OUT') {
          setIsConnected(false)
          setIsConnecting(false)
          setConnectionError('Anslutningen tog för lång tid')
        }
      })

    channelRef.current = channel

    return () => {
      channel.unsubscribe()
      channelRef.current = null
    }
  }, [bookingId, addMessage])

  // Update messages when initialMessages change
  useEffect(() => {
    if (initialMessages.length > 0) {
      setMessages(prev => {
        // Merge initial messages with any new ones we've received
        const messageMap = new Map<string, ChatMessage>()
        initialMessages.forEach(m => messageMap.set(m.id, m))
        prev.forEach(m => messageMap.set(m.id, m))

        return Array.from(messageMap.values()).sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        )
      })
    }
  }, [initialMessages])

  // Send message function
  const sendMessage = useCallback(async (content: string): Promise<{ success: boolean; error?: string }> => {
    const trimmedContent = content.trim()
    if (!trimmedContent) {
      return { success: false, error: 'Meddelandet kan inte vara tomt' }
    }

    const supabase = supabaseRef.current

    // Get sender profile for optimistic update
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', currentUserId)
      .single()

    // Create optimistic message
    const optimisticId = crypto.randomUUID()
    const optimisticMessage: ChatMessage = {
      id: optimisticId,
      booking_request_id: bookingId,
      sender_id: currentUserId,
      content: trimmedContent,
      is_read: false,
      read_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      sender: {
        id: currentUserId,
        full_name: profile?.full_name || null,
        email: profile?.email || '',
      },
    }

    // Add optimistic message immediately
    addMessage(optimisticMessage)

    try {
      // Insert into database
      const { data: message, error: insertError } = await supabase
        .from('messages')
        .insert({
          booking_request_id: bookingId,
          sender_id: currentUserId,
          content: trimmedContent,
          is_read: false,
        })
        .select(`
          *,
          sender:profiles!sender_id(
            id,
            full_name,
            email
          )
        `)
        .single()

      if (insertError || !message) {
        // Remove optimistic message on error
        setMessages(prev => prev.filter(m => m.id !== optimisticId))
        return { success: false, error: 'Kunde inte skicka meddelandet' }
      }

      // Replace optimistic message with real one
      setMessages(prev =>
        prev.map(m => m.id === optimisticId ? { ...message, sender: message.sender } : m)
      )

      // Broadcast to other participants
      if (channelRef.current) {
        await channelRef.current.send({
          type: 'broadcast',
          event: 'message',
          payload: { ...message, sender: message.sender },
        })
      }

      return { success: true }
    } catch (error) {
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => m.id !== optimisticId))
      console.error('Error sending message:', error)
      return { success: false, error: 'Ett oväntat fel uppstod' }
    }
  }, [bookingId, currentUserId, addMessage])

  return {
    messages,
    sendMessage,
    isConnected,
    isConnecting,
    connectionError,
  }
}
