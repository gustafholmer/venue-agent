'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRealtimeChat, type ChatMessage } from '@/hooks/use-realtime-chat'
import { useChatScroll } from '@/hooks/use-chat-scroll'
import { ChatBubble } from './chat-bubble'
import { Button } from '@/components/ui/button'

interface RealtimeChatProps {
  threadId: string
  threadType: 'booking' | 'inquiry'
  currentUserId: string
  initialMessages?: ChatMessage[]
  participantName?: string
  readOnly?: boolean
  onMessagesRead?: () => void
}

function ConnectionIndicator({ isConnected, isConnecting }: { isConnected: boolean; isConnecting: boolean }) {
  if (isConnecting) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
        <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
        <span>Ansluter...</span>
      </div>
    )
  }

  if (isConnected) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
        <div className="w-2 h-2 rounded-full bg-green-500" />
        <span>Ansluten</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1.5 text-xs text-red-500">
      <div className="w-2 h-2 rounded-full bg-red-500" />
      <span>Frånkopplad</span>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full py-12 px-4">
      <div className="w-14 h-14 rounded-full bg-[var(--bg-soft)] flex items-center justify-center mb-4">
        <svg
          className="w-7 h-7 text-[var(--text-muted)]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
      </div>
      <p className="text-[var(--text-muted)] text-center">
        Inga meddelanden ännu
      </p>
      <p className="text-sm text-[var(--text-muted)] opacity-70 text-center mt-1">
        Skriv ett meddelande för att starta konversationen
      </p>
    </div>
  )
}

function shouldShowSender(
  messages: ChatMessage[],
  index: number,
  currentUserId: string
): boolean {
  const message = messages[index]
  const previousMessage = messages[index - 1]

  // Own messages don't show sender
  if (message.sender_id === currentUserId) return false

  // First message or different sender from previous
  if (!previousMessage) return true
  if (previousMessage.sender_id !== message.sender_id) return true

  // Same sender but more than 5 minutes apart
  const timeDiff =
    new Date(message.created_at).getTime() -
    new Date(previousMessage.created_at).getTime()
  return timeDiff > 5 * 60 * 1000
}

export function RealtimeChat({
  threadId,
  threadType,
  currentUserId,
  initialMessages = [],
  participantName,
  readOnly,
  onMessagesRead,
}: RealtimeChatProps) {
  const [inputValue, setInputValue] = useState('')
  const [isSending, setIsSending] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const {
    messages,
    sendMessage,
    isConnected,
    isConnecting,
    connectionError,
  } = useRealtimeChat({
    threadId,
    threadType,
    currentUserId,
    initialMessages,
  })

  const { containerRef, scrollToBottom, isNearBottom } = useChatScroll()

  // Scroll to bottom when messages change (if user is near bottom)
  useEffect(() => {
    if (isNearBottom()) {
      scrollToBottom()
    }
  }, [messages, scrollToBottom, isNearBottom])

  // Mark messages as read on mount/focus
  useEffect(() => {
    onMessagesRead?.()
  }, [onMessagesRead])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()

    const trimmedValue = inputValue.trim()
    if (!trimmedValue || isSending || !isConnected) return

    setIsSending(true)
    setInputValue('')

    const result = await sendMessage(trimmedValue)

    if (!result.success) {
      // Restore input on error
      setInputValue(trimmedValue)
    } else {
      // Scroll to bottom after sending
      setTimeout(() => scrollToBottom(), 100)
      // Mark messages as read
      onMessagesRead?.()
    }

    setIsSending(false)
    textareaRef.current?.focus()
  }, [inputValue, isSending, isConnected, sendMessage, scrollToBottom, onMessagesRead])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }, [handleSubmit])

  return (
    <div className="flex flex-col h-full bg-white border border-[var(--border)] rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] bg-[var(--bg-soft)]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[var(--accent)]/10 flex items-center justify-center">
            <svg
              className="w-5 h-5 text-[var(--accent)]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
          </div>
          <div>
            <h3 className="font-medium text-[var(--text)]">
              {participantName || 'Meddelanden'}
            </h3>
          </div>
        </div>
        <ConnectionIndicator isConnected={isConnected} isConnecting={isConnecting} />
      </div>

      {/* Connection error banner */}
      {connectionError && (
        <div className="px-4 py-2 bg-red-50 border-b border-red-100 text-sm text-red-600">
          {connectionError}
        </div>
      )}

      {/* Messages area */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0"
      >
        {messages.length === 0 ? (
          <EmptyState />
        ) : (
          messages.map((message, index) => (
            <ChatBubble
              key={message.id}
              message={message}
              isOwnMessage={message.sender_id === currentUserId}
              showSender={shouldShowSender(messages, index, currentUserId)}
            />
          ))
        )}
      </div>

      {/* Input area — hidden when readOnly */}
      {!readOnly && (
        <form
          onSubmit={handleSubmit}
          className="flex-shrink-0 px-4 py-3 border-t border-[var(--border)] bg-[var(--bg-soft)]"
        >
          <div className="flex gap-2">
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isConnected ? 'Skriv ett meddelande...' : 'Ansluter...'}
              disabled={!isConnected || isSending}
              rows={1}
              className="
                flex-1 px-3.5 py-2.5 text-sm
                border border-[var(--border)] rounded-xl
                bg-white
                focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)]
                resize-none
                disabled:opacity-50 disabled:cursor-not-allowed
                placeholder:text-[var(--text-muted)]
              "
            />
            <Button
              type="submit"
              disabled={!isConnected || isSending || !inputValue.trim()}
              className="self-end px-4"
            >
              {isSending ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                  />
                </svg>
              )}
            </Button>
          </div>
          <p className="text-[10px] text-[var(--text-muted)] mt-1.5 px-1">
            Enter för att skicka · Shift+Enter för ny rad
          </p>
        </form>
      )}
    </div>
  )
}
