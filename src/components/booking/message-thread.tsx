'use client'

import { useState, useEffect, useCallback } from 'react'
import { RealtimeChat } from '@/components/chat/realtime-chat'
import { getMessages, type MessageWithSender } from '@/actions/messages/get-messages'
import { markMessagesAsRead } from '@/actions/messages/mark-read'
import type { ChatMessage } from '@/hooks/use-realtime-chat'

interface MessageThreadProps {
  threadId: string
  threadType: 'booking' | 'inquiry'
  currentUserId: string
  participantName?: string
  readOnly?: boolean
}

export function MessageThread({
  threadId,
  threadType,
  currentUserId,
  participantName,
  readOnly,
}: MessageThreadProps) {
  const [initialMessages, setInitialMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch initial messages
  useEffect(() => {
    async function fetchMessages() {
      setIsLoading(true)
      const result = await getMessages(threadId, threadType)

      if (result.success && result.messages) {
        // Transform to ChatMessage format
        const messages: ChatMessage[] = result.messages.map(msg => ({
          id: msg.id,
          booking_request_id: msg.booking_request_id,
          venue_inquiry_id: msg.venue_inquiry_id,
          sender_id: msg.sender_id,
          content: msg.content,
          is_read: msg.is_read,
          read_at: msg.read_at,
          created_at: msg.created_at,
          updated_at: msg.updated_at,
          sender: msg.sender,
        }))
        setInitialMessages(messages)
        setError(null)
      } else {
        setError(result.error || 'Kunde inte hämta meddelanden')
      }

      setIsLoading(false)
    }

    fetchMessages()
  }, [threadId, threadType])

  // Handle marking messages as read
  const handleMessagesRead = useCallback(async () => {
    await markMessagesAsRead(threadId, undefined, threadType)
  }, [threadId, threadType])

  if (isLoading) {
    return (
      <div className="bg-white border border-[var(--border)] rounded-xl p-6">
        <h2 className="text-lg font-semibold text-[var(--text)] mb-4">Meddelanden</h2>
        <div className="flex flex-col items-center justify-center py-12">
          <div className="w-8 h-8 border-3 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
          <p className="text-[var(--text-muted)] mt-3 text-sm">Laddar meddelanden...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white border border-[var(--border)] rounded-xl p-6">
        <h2 className="text-lg font-semibold text-[var(--text)] mb-4">Meddelanden</h2>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-[400px] sm:h-[500px]">
      <RealtimeChat
        threadId={threadId}
        threadType={threadType}
        currentUserId={currentUserId}
        initialMessages={initialMessages}
        participantName={participantName}
        readOnly={readOnly}
        onMessagesRead={handleMessagesRead}
      />
    </div>
  )
}
