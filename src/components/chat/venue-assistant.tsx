'use client'

import { useState, useEffect, useRef, useCallback, type FormEvent, type KeyboardEvent } from 'react'
import { AgentMascot } from '@/components/illustrations/agent-mascot'
import { SuggestionChip } from './suggestion-chip'
import type { AgentMessage, Suggestion } from '@/types/agent'

export interface VenueContext {
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

export interface FormSetters {
  setEventDate?: (date: string) => void
  setStartTime?: (time: string) => void
  setEndTime?: (time: string) => void
  setEventType?: (type: string) => void
  setGuestCount?: (count: string) => void
}

interface VenueAssistantProps {
  venue: VenueContext
  formSetters?: FormSetters
  isBookingPage?: boolean
}

interface LocalMessage extends AgentMessage {
  isLocal?: boolean
}

function MessageBubble({
  message,
  onApplySuggestion,
  formSetters
}: {
  message: LocalMessage
  onApplySuggestion?: (suggestion: Suggestion) => void
  formSetters?: FormSetters
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
      <div className="flex-shrink-0 w-8 h-8 bg-[#fef3c7] rounded-full flex items-center justify-center overflow-hidden">
        <AgentMascot variant="small" className="w-5 h-5" />
      </div>
      <div className="max-w-[85%]">
        <div className="bg-[#f3f4f6] text-[#111827] rounded-2xl rounded-tl-md px-3 py-2">
          <p className="whitespace-pre-wrap text-sm">{message.content}</p>
        </div>
        {message.suggestions && message.suggestions.length > 0 && onApplySuggestion && formSetters && (
          <div className="flex flex-wrap gap-2 mt-2">
            {message.suggestions.map((suggestion, idx) => (
              <SuggestionChip
                key={`${suggestion.type}-${idx}`}
                suggestion={suggestion}
                onApply={onApplySuggestion}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function LoadingIndicator() {
  return (
    <div className="flex items-start gap-2">
      <div className="flex-shrink-0 w-8 h-8 bg-[#fef3c7] rounded-full flex items-center justify-center overflow-hidden">
        <AgentMascot variant="small" className="w-5 h-5" />
      </div>
      <div className="bg-[#f3f4f6] text-[#6b7280] rounded-2xl rounded-tl-md px-3 py-2">
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <span className="w-1.5 h-1.5 bg-[#9ca3af] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1.5 h-1.5 bg-[#9ca3af] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1.5 h-1.5 bg-[#9ca3af] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>
    </div>
  )
}

export function VenueAssistant({ venue, formSetters, isBookingPage = false }: VenueAssistantProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<LocalMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-scroll to bottom
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isOpen])

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  const handleApplySuggestion = useCallback((suggestion: Suggestion) => {
    if (!formSetters) return

    const value = String(suggestion.value)

    switch (suggestion.type) {
      case 'date':
        formSetters.setEventDate?.(value)
        break
      case 'startTime':
        formSetters.setStartTime?.(value)
        break
      case 'endTime':
        formSetters.setEndTime?.(value)
        break
      case 'eventType':
        formSetters.setEventType?.(value)
        break
      case 'guestCount':
        formSetters.setGuestCount?.(value)
        break
    }

    // Add confirmation message
    setMessages(prev => [...prev, {
      id: `applied_${Date.now()}`,
      role: 'agent',
      content: `Jag har fyllt i "${suggestion.label}" åt dig.`,
      timestamp: new Date(),
      isLocal: true,
    }])
  }, [formSetters])

  const handleSendMessage = useCallback(async (messageContent: string) => {
    const trimmed = messageContent.trim()
    if (!trimmed || isLoading) return

    const userMsg: LocalMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: new Date(),
      isLocal: true,
    }

    setMessages(prev => [...prev, userMsg])
    setInputValue('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/venue-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          venueId: venue.id,
          isBookingPage,
        }),
      })

      if (!response.ok) throw new Error('Failed to get response')

      const data = await response.json()

      const agentMsg: LocalMessage = {
        id: `agent_${Date.now()}`,
        role: 'agent',
        content: data.message,
        suggestions: data.suggestions,
        timestamp: new Date(),
        isLocal: true,
      }

      setMessages(prev => [...prev, agentMsg])
    } catch (error) {
      console.error('Error:', error)
      setMessages(prev => [...prev, {
        id: `error_${Date.now()}`,
        role: 'agent',
        content: 'Något gick fel. Försök igen.',
        timestamp: new Date(),
        isLocal: true,
      }])
    } finally {
      setIsLoading(false)
    }
  }, [isLoading, venue.id, isBookingPage])

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

  const greeting = isBookingPage
    ? `Hej! Jag hjälper dig boka ${venue.name}. Ställ frågor eller berätta om ditt event så kan jag hjälpa dig fylla i formuläret.`
    : `Hej! Fråga mig vad som helst om ${venue.name}.`

  return (
    <>
      {/* Floating button - hidden when chat is open */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-[#c45a3b] text-white rounded-full shadow-lg hover:bg-[#a84832] transition-all flex items-center justify-center"
          aria-label="Öppna assistent"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </button>
      )}

      {/* Chat window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[360px] max-w-[calc(100vw-48px)] h-[500px] max-h-[calc(100vh-48px)] bg-white rounded-2xl shadow-2xl border border-[#e5e7eb] flex flex-col overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-[#e5e7eb] bg-[#f9fafb]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#fef3c7] rounded-full flex items-center justify-center">
                  <AgentMascot variant="small" className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-[#111827] text-sm">Venue Agent</h3>
                  <p className="text-xs text-[#6b7280]">Fråga om {venue.name}</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 flex items-center justify-center text-[#6b7280] hover:text-[#111827] hover:bg-[#e5e7eb] rounded-full transition-colors"
                aria-label="Stäng"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {/* Welcome message */}
            {messages.length === 0 && !isLoading && (
              <div className="flex items-start gap-2">
                <div className="flex-shrink-0 w-8 h-8 bg-[#fef3c7] rounded-full flex items-center justify-center overflow-hidden">
                  <AgentMascot variant="small" className="w-5 h-5" />
                </div>
                <div className="bg-[#f3f4f6] text-[#111827] rounded-2xl rounded-tl-md px-3 py-2">
                  <p className="text-sm">{greeting}</p>
                </div>
              </div>
            )}

            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                onApplySuggestion={handleApplySuggestion}
                formSetters={formSetters}
              />
            ))}

            {isLoading && <LoadingIndicator />}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-[#e5e7eb] p-3">
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
                  className="flex-1 h-10 px-3 text-sm border border-[#e5e7eb] rounded-full focus:outline-none focus:border-[#c45a3b] disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={!inputValue.trim() || isLoading}
                  className="w-10 h-10 flex items-center justify-center bg-[#c45a3b] text-white rounded-full hover:bg-[#a84832] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  aria-label="Skicka"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
