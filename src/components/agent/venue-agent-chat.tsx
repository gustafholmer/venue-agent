'use client'

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type FormEvent,
  type KeyboardEvent,
} from 'react'
import { useAgentChat, type AgentChatMessage } from '@/hooks/use-agent-chat'
import { BookingSummaryCard } from './booking-summary-card'
import { AgentStatusIndicator } from './agent-status-indicator'

interface VenueAgentChatProps {
  venue: {
    id: string
    name: string
    slug: string
    description?: string | null
    area?: string | null
    city: string
    capacity_standing?: number | null
    capacity_seated?: number | null
    capacity_conference?: number | null
    min_guests: number
    amenities?: string[] | null
    venue_types?: string[] | null
    price_per_hour?: number | null
    price_half_day?: number | null
    price_full_day?: number | null
    price_evening?: number | null
  }
}

function MessageBubble({
  message,
  onConfirmBooking,
}: {
  message: AgentChatMessage
  onConfirmBooking: (messageId: string) => void
}) {
  const isUser = message.role === 'user'

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] bg-[#c45a3b] text-white rounded-2xl rounded-br-md px-3 py-2">
          <p className="whitespace-pre-wrap text-sm">{message.content}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-2">
      <div className="max-w-[85%]">
        <div className="bg-[#f3f4f6] text-[#1a1a1a] rounded-2xl rounded-tl-md px-3 py-2">
          <p className="whitespace-pre-wrap text-sm">{message.content}</p>
        </div>
        {message.bookingSummary && (
          <div className="mt-2">
            <BookingSummaryCard
              summary={message.bookingSummary}
              status={message.status || 'draft'}
              onConfirm={() => onConfirmBooking(message.id)}
              onEdit={() => {
                // Placeholder: will be wired to modification flow later
              }}
            />
          </div>
        )}
      </div>
    </div>
  )
}

export function VenueAgentChat({ venue }: VenueAgentChatProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const {
    messages,
    sendMessage,
    confirmBooking,
    isLoading,
    isWaitingForOwner,
  } = useAgentChat({
    venueId: venue.id,
    venueName: venue.name,
  })

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isOpen, isLoading])

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  const handleSendMessage = useCallback(
    async (messageContent: string) => {
      const trimmed = messageContent.trim()
      if (!trimmed || isLoading) return

      setInputValue('')
      await sendMessage(trimmed)
    },
    [isLoading, sendMessage],
  )

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    handleSendMessage(inputValue)
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage(inputValue)
    }
  }

  const greeting = `Hej! Fråga mig vad som helst om ${venue.name}, eller berätta om ditt event så hjälper jag dig boka.`

  return (
    <>
      {/* Floating chat button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 w-14 h-14 bg-[#c45a3b] text-white rounded-full shadow-lg hover:bg-[#a84832] transition-all flex items-center justify-center"
          aria-label="Öppna Tryffle"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
        </button>
      )}

      {/* Chat panel */}
      {isOpen && (
        <div className="fixed bottom-0 right-0 sm:bottom-6 sm:right-6 z-50 w-full sm:w-[360px] h-[70vh] sm:h-[500px] max-h-[calc(100vh-48px)] bg-white/40 backdrop-blur-md rounded-t-2xl sm:rounded-2xl shadow-xl border border-white/30 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-white/20 bg-white/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div>
                  <h3 className="font-semibold text-[#1a1a1a] text-sm">
                    Tryffle
                  </h3>
                  <p className="text-xs text-[#78716c]">{venue.name}</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-10 h-10 flex items-center justify-center text-[#78716c] hover:text-[#1a1a1a] hover:bg-[#e7e5e4] rounded-full transition-colors"
                aria-label="Stäng"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Messages area */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {/* Welcome message */}
            {messages.length === 0 && !isLoading && (
              <div className="flex items-start gap-2">
                <div className="bg-[#f3f4f6] text-[#1a1a1a] rounded-2xl rounded-tl-md px-3 py-2">
                  <p className="text-sm">{greeting}</p>
                </div>
              </div>
            )}

            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                onConfirmBooking={confirmBooking}
              />
            ))}

            {isLoading && <AgentStatusIndicator status="typing" />}
            {!isLoading && isWaitingForOwner && (
              <AgentStatusIndicator status="waiting_for_owner" />
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div className="border-t border-white/20 p-3 bg-white/30">
            <form onSubmit={handleSubmit}>
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Skriv din fråga..."
                  disabled={isLoading}
                  className="flex-1 h-10 px-3 text-sm border border-[#e7e5e4] rounded-full focus:outline-none focus:border-[#c45a3b] disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={!inputValue.trim() || isLoading}
                  className="w-10 h-10 flex items-center justify-center bg-[#c45a3b] text-white rounded-full hover:bg-[#a84832] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  aria-label="Skicka"
                >
                  <svg
                    className="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M22 2L11 13M22 2L15 22L11 13L2 9L22 2Z" />
                  </svg>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
