'use client'

import { useState, useEffect, useRef, useCallback, type FormEvent, type KeyboardEvent } from 'react'
import { Button } from '@/components/ui/button'
import { processAgentMessage } from '@/actions/agent/process-message'
import { saveSearchForSharing } from '@/actions/search/save-search'
import type { AgentMessage, AgentState, VenueResult } from '@/types/agent'
import Link from 'next/link'

interface AgentChatProps {
  sessionId: string
  initialQuery?: string
  initialMessages?: AgentMessage[]
  initialState?: AgentState
  demoMode?: boolean
}

function VenueCard({ venue }: { venue: VenueResult }) {
  return (
    <Link
      href={`/venues/${venue.slug}`}
      className="block bg-white border border-[#e7e5e4] rounded-xl p-4 hover:shadow-md transition-shadow"
    >
      {venue.imageUrl && (
        <div className="w-full h-32 bg-[#faf9f7] rounded-lg mb-3 overflow-hidden">
          <img
            src={venue.imageUrl}
            alt={venue.name}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <h4 className="font-semibold text-[#1a1a1a] mb-1">{venue.name}</h4>
      <p className="text-sm text-[#78716c] mb-2">{venue.area}</p>
      <div className="flex items-center justify-between text-sm">
        <span className="text-[#c45a3b] font-medium">
          {venue.price.toLocaleString('sv-SE')} SEK
        </span>
        <span className="text-[#78716c]">
          {venue.capacity} pers
        </span>
      </div>
      {venue.availableDates && venue.availableDates.length > 0 && (
        <p className="text-xs text-[#059669] mt-2">
          Ledig: {venue.availableDates.slice(0, 3).join(', ')}
          {venue.availableDates.length > 3 && ` +${venue.availableDates.length - 3}`}
        </p>
      )}
      {venue.matchReason && (
        <p className="text-xs text-[#78716c] mt-1 italic">
          {venue.matchReason}
        </p>
      )}
    </Link>
  )
}

function MessageBubble({ message }: { message: AgentMessage }) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] sm:max-w-[75%] ${
          isUser
            ? 'bg-[#c45a3b] text-white rounded-2xl rounded-br-md'
            : 'bg-[#f3f4f6] text-[#1a1a1a] rounded-2xl rounded-bl-md'
        } px-4 py-3`}
      >
        <p className="whitespace-pre-wrap text-sm sm:text-base">{message.content}</p>

        {/* Venue results inline */}
        {message.venues && message.venues.length > 0 && (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {message.venues.map((venue) => (
              <VenueCard key={venue.id} venue={venue} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function LoadingIndicator({ agentState }: { agentState?: AgentState }) {
  return (
    <div className="flex justify-start">
      <div className="bg-[#f3f4f6] text-[#78716c] rounded-2xl rounded-bl-md px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <span className="w-2 h-2 bg-[#a8a29e] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-2 h-2 bg-[#a8a29e] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-2 h-2 bg-[#a8a29e] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
          <span className="text-sm">Söker lokaler...</span>
          {agentState && agentState !== 'idle' && (
            <span className="text-xs ml-2 px-2 py-1 bg-[#e7e5e4] rounded-md">
              {agentState}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// Demo mode mock responses
const DEMO_RESPONSES = [
  {
    message: 'Jag hittade några lokaler som kan passa! Här är mina förslag baserat på din sökning:',
    venues: [
      { id: '1', name: 'Södra Teatern', slug: 'sodra-teatern', area: 'Södermalm', price: 18000, capacity: 300, imageUrl: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=800&h=600&fit=crop', matchReason: 'Historisk lokal med fantastisk atmosfär' },
      { id: '2', name: 'Fotografiska Event', slug: 'fotografiska', area: 'Södermalm', price: 35000, capacity: 500, imageUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&h=600&fit=crop', matchReason: 'Inspirerande miljö med utsikt' },
      { id: '3', name: 'Berns Salonger', slug: 'berns-salonger', area: 'Norrmalm', price: 45000, capacity: 800, imageUrl: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=800&h=600&fit=crop', matchReason: 'Klassisk festlokal sedan 1863' },
    ],
  },
  {
    message: 'Absolut! Här är fler alternativ för dig:',
    venues: [
      { id: '4', name: 'Clarion Sign Konferens', slug: 'clarion-sign-konferens', area: 'Norrmalm', price: 12000, capacity: 180, imageUrl: 'https://images.unsplash.com/photo-1431540015161-0bf868a2d407?w=800&h=600&fit=crop', matchReason: 'Modern och professionell' },
      { id: '5', name: 'Trädgården', slug: 'tradgaarden', area: 'Södermalm', price: 70000, capacity: 1500, imageUrl: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800&h=600&fit=crop', matchReason: 'Unik industriell charm' },
    ],
  },
]

export function AgentChat({
  sessionId,
  initialQuery,
  initialMessages = [],
  initialState = 'idle',
  demoMode = false,
}: AgentChatProps) {
  const [messages, setMessages] = useState<AgentMessage[]>(initialMessages)
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [agentState, setAgentState] = useState<AgentState>(initialState)
  const [hasProcessedInitialQuery, setHasProcessedInitialQuery] = useState(false)
  const [isSharing, setIsSharing] = useState(false)
  const [shareStatus, setShareStatus] = useState<'idle' | 'success' | 'error'>('idle')

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`
    }
  }, [inputValue])

  // Track demo response index
  const demoResponseIndex = useRef(0)

  const handleSendMessage = useCallback(async (messageContent: string) => {
    const trimmedMessage = messageContent.trim()
    if (!trimmedMessage || isLoading) return

    // Optimistically add user message
    const optimisticUserMessage: AgentMessage = {
      id: `temp_${Date.now()}`,
      role: 'user',
      content: trimmedMessage,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, optimisticUserMessage])
    setInputValue('')
    setIsLoading(true)

    // Demo mode: use mock responses
    if (demoMode) {
      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 1000))

      const demoResponse = DEMO_RESPONSES[demoResponseIndex.current % DEMO_RESPONSES.length]
      demoResponseIndex.current++

      const agentMessage: AgentMessage = {
        id: `agent_${Date.now()}`,
        role: 'agent',
        content: demoResponse.message,
        venues: demoResponse.venues,
        timestamp: new Date(),
      }

      setMessages((prev) => {
        const filtered = prev.filter((m) => m.id !== optimisticUserMessage.id)
        return [
          ...filtered,
          { ...optimisticUserMessage, id: `user_${Date.now()}` },
          agentMessage,
        ]
      })
      setAgentState('searching')
      setIsLoading(false)
      return
    }

    try {
      const result = await processAgentMessage(sessionId, trimmedMessage)

      if (result.success && result.response) {
        // Replace optimistic message with actual and add agent response
        const agentMessage: AgentMessage = {
          id: `agent_${Date.now()}`,
          role: 'agent',
          content: result.response.message,
          venues: result.response.venues,
          timestamp: new Date(),
        }

        setMessages((prev) => {
          // Replace the optimistic user message with a confirmed one
          const filtered = prev.filter((m) => m.id !== optimisticUserMessage.id)
          return [
            ...filtered,
            { ...optimisticUserMessage, id: `user_${Date.now()}` },
            agentMessage,
          ]
        })
        setAgentState(result.response.state)
      } else {
        // Show error message
        const errorMessage: AgentMessage = {
          id: `error_${Date.now()}`,
          role: 'agent',
          content: result.error || 'Något gick fel. Försök igen.',
          timestamp: new Date(),
        }

        setMessages((prev) => [...prev, errorMessage])
      }
    } catch (error) {
      console.error('Error sending message:', error)
      const errorMessage: AgentMessage = {
        id: `error_${Date.now()}`,
        role: 'agent',
        content: 'Ett oväntat fel uppstod. Försök igen.',
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }, [isLoading, sessionId, demoMode])

  // Process initial query from URL params on mount
  useEffect(() => {
    if (initialQuery && !hasProcessedInitialQuery && messages.length === 0) {
      setHasProcessedInitialQuery(true)
      handleSendMessage(initialQuery)
    }
  }, [initialQuery, hasProcessedInitialQuery, messages.length, handleSendMessage])

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    handleSendMessage(inputValue)
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage(inputValue)
    }
  }

  // Check if we have venue results to share
  const hasVenues = messages.some((m) => m.venues && m.venues.length > 0)

  async function handleShareSearch() {
    if (isSharing) return

    setIsSharing(true)
    setShareStatus('idle')

    try {
      const result = await saveSearchForSharing({ sessionId })

      if (result.success && result.searchId) {
        const shareUrl = `${window.location.origin}/search/${result.searchId}`

        // Try to copy to clipboard
        try {
          await navigator.clipboard.writeText(shareUrl)
          setShareStatus('success')

          // Reset status after 3 seconds
          setTimeout(() => setShareStatus('idle'), 3000)
        } catch {
          // Fallback: open in new tab
          window.open(shareUrl, '_blank')
          setShareStatus('success')
          setTimeout(() => setShareStatus('idle'), 3000)
        }
      } else {
        setShareStatus('error')
        setTimeout(() => setShareStatus('idle'), 3000)
      }
    } catch (error) {
      console.error('Error sharing search:', error)
      setShareStatus('error')
      setTimeout(() => setShareStatus('idle'), 3000)
    } finally {
      setIsSharing(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-3xl mx-auto space-y-4">
          {/* Welcome message if no messages */}
          {messages.length === 0 && !isLoading && (
            <div className="text-center py-12">
              <h2 className="text-xl font-semibold text-[#1a1a1a] mb-2">
                Hej! Jag hjälper dig hitta den perfekta lokalen.
              </h2>
              <p className="text-[#78716c]">
                Beskriv vad du söker, så hittar jag matchande lokaler åt dig.
              </p>
            </div>
          )}

          {/* Message list */}
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}

          {/* Loading indicator */}
          {isLoading && <LoadingIndicator agentState={agentState} />}

          {/* Scroll anchor */}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Share button - shows when venues are found (not in demo mode) */}
      {hasVenues && !demoMode && (
        <div className="border-t border-[#e7e5e4] bg-[#faf9f7] px-4 py-3">
          <div className="max-w-3xl mx-auto flex items-center justify-between">
            <p className="text-sm text-[#78716c]">
              Dela dina sökresultat med andra
            </p>
            <button
              onClick={handleShareSearch}
              disabled={isSharing}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                shareStatus === 'success'
                  ? 'bg-green-100 text-green-700'
                  : shareStatus === 'error'
                  ? 'bg-red-100 text-red-700'
                  : 'bg-white border border-[#e7e5e4] text-[#57534e] hover:bg-[#f3f4f6]'
              } disabled:opacity-50`}
            >
              {isSharing ? (
                <>
                  <span className="w-4 h-4 border-2 border-[#78716c] border-t-transparent rounded-full animate-spin" />
                  Sparar...
                </>
              ) : shareStatus === 'success' ? (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Kopierad!
                </>
              ) : shareStatus === 'error' ? (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Något gick fel
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  Dela sökning
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Input area */}
      <div className="border-t border-[#e7e5e4] bg-white px-4 py-4">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
          <div className="flex gap-3 items-end">
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Skriv ett meddelande..."
                rows={1}
                disabled={isLoading}
                className="w-full resize-none rounded-2xl border border-[#e7e5e4] px-4 py-3 text-sm sm:text-base focus:outline-none focus:border-[#c45a3b] focus:ring-2 focus:ring-[#c45a3b]/20 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Meddelande"
              />
            </div>
            <Button
              type="submit"
              disabled={!inputValue.trim() || isLoading}
              size="lg"
              className="shrink-0"
            >
              {isLoading ? 'Skickar...' : 'Skicka'}
            </Button>
          </div>
          <p className="mt-2 text-xs text-[#a8a29e] text-center">
            Tryck Enter för att skicka, Shift+Enter för ny rad
          </p>
        </form>
      </div>
    </div>
  )
}
