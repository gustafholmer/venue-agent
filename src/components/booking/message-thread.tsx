'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { getMessages, type MessageWithSender } from '@/actions/messages/get-messages'
import { sendMessage } from '@/actions/messages/send-message'

interface MessageThreadProps {
  bookingId: string
}

function getInitials(name: string | null, email: string): string {
  if (name) {
    const parts = name.trim().split(/\s+/)
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    }
    return name.slice(0, 2).toUpperCase()
  }
  // Fallback to email
  return email.slice(0, 2).toUpperCase()
}

function formatTimestamp(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const isToday = date.toDateString() === now.toDateString()

  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  const isYesterday = date.toDateString() === yesterday.toDateString()

  const timeStr = date.toLocaleTimeString('sv-SE', {
    hour: '2-digit',
    minute: '2-digit',
  })

  if (isToday) {
    return `Idag ${timeStr}`
  }

  if (isYesterday) {
    return `Igår ${timeStr}`
  }

  return date.toLocaleDateString('sv-SE', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function MessageThread({ bookingId }: MessageThreadProps) {
  const [messages, setMessages] = useState<MessageWithSender[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newMessage, setNewMessage] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const fetchMessages = useCallback(async () => {
    const result = await getMessages(bookingId)
    if (result.success && result.messages) {
      setMessages(result.messages)
      setError(null)
    } else {
      setError(result.error || 'Kunde inte hämta meddelanden')
    }
    setIsLoading(false)
  }, [bookingId])

  useEffect(() => {
    fetchMessages()
  }, [fetchMessages])

  useEffect(() => {
    if (!isLoading) {
      scrollToBottom()
    }
  }, [messages, isLoading])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const trimmedMessage = newMessage.trim()
    if (!trimmedMessage || isSending) {
      return
    }

    setIsSending(true)
    setError(null)

    const result = await sendMessage(bookingId, trimmedMessage)

    if (result.success) {
      setNewMessage('')
      // Refetch messages to get the new one with sender info
      await fetchMessages()
      // Focus the textarea for easy continuation
      textareaRef.current?.focus()
    } else {
      setError(result.error || 'Kunde inte skicka meddelandet')
    }

    setIsSending(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Send on Enter (without Shift for newline)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  if (isLoading) {
    return (
      <div className="bg-white border border-[#e5e7eb] rounded-xl p-6">
        <h2 className="text-lg font-semibold text-[#111827] mb-4">Meddelanden</h2>
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-4 border-[#1e3a8a] border-t-transparent"></div>
          <p className="text-[#6b7280] mt-2 text-sm">Laddar meddelanden...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white border border-[#e5e7eb] rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-[#111827]">Meddelanden</h2>
        <button
          onClick={fetchMessages}
          className="p-2 text-[#6b7280] hover:text-[#374151] hover:bg-[#f3f4f6] rounded-lg transition-colors"
          title="Uppdatera meddelanden"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Messages list */}
      <div className="space-y-4 max-h-96 overflow-y-auto mb-4">
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 mx-auto mb-3 bg-[#f3f4f6] rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-[#9ca3af]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="text-[#6b7280]">Inga meddelanden ännu</p>
            <p className="text-[#9ca3af] text-sm mt-1">Skriv ett meddelande för att starta konversationen</p>
          </div>
        ) : (
          messages.map((message) => (
            <div key={message.id} className="flex gap-3">
              {/* Avatar with initials */}
              <div className="flex-shrink-0 w-9 h-9 bg-[#1e3a8a] rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">
                  {getInitials(message.sender.full_name, message.sender.email)}
                </span>
              </div>

              {/* Message content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="font-medium text-[#111827] text-sm">
                    {message.sender.full_name || message.sender.email}
                  </span>
                  <span className="text-xs text-[#9ca3af]">
                    {formatTimestamp(message.created_at)}
                  </span>
                </div>
                <p className="text-[#374151] text-sm mt-1 whitespace-pre-wrap break-words">
                  {message.content}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message input form */}
      <form onSubmit={handleSubmit} className="border-t border-[#e5e7eb] pt-4">
        <div className="flex gap-3">
          <textarea
            ref={textareaRef}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Skriv ett meddelande..."
            rows={2}
            disabled={isSending}
            className="flex-1 px-3 py-2 border border-[#e5e7eb] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent resize-none text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <Button
            type="submit"
            disabled={isSending || !newMessage.trim()}
            className="self-end"
          >
            {isSending ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Skickar...
              </span>
            ) : (
              'Skicka'
            )}
          </Button>
        </div>
        <p className="text-xs text-[#9ca3af] mt-2">
          Tryck Enter för att skicka, Shift+Enter för ny rad
        </p>
      </form>
    </div>
  )
}
