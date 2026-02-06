'use client'

import { useState, useEffect, useRef, useCallback, type FormEvent, type KeyboardEvent } from 'react'
import { processAgentMessage } from '@/actions/agent/process-message'
import type { AgentMessage, AgentState, VenueResult } from '@/types/agent'

interface SidebarChatProps {
  sessionId: string
  initialMessages?: AgentMessage[]
  initialState?: AgentState
  onVenuesFound?: (venues: VenueResult[]) => void
  isExpanded?: boolean
  onExpandedChange?: (expanded: boolean) => void
  demoMode?: boolean
  initialQuery?: string
}

// Demo mode mock responses
const DEMO_RESPONSES = [
  {
    message: 'Jag hittade några lokaler som kan passa! Kolla in förslagen i listan till höger.',
    venues: [
      { id: '1', name: 'Södra Teatern', slug: 'sodra-teatern', area: 'Södermalm', price: 18000, capacity: 300, imageUrl: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=800&h=600&fit=crop', matchReason: 'Historisk lokal med fantastisk atmosfär' },
      { id: '2', name: 'Fotografiska Event', slug: 'fotografiska', area: 'Södermalm', price: 35000, capacity: 500, imageUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&h=600&fit=crop', matchReason: 'Inspirerande miljö med utsikt' },
    ],
  },
  {
    message: 'Här är fler alternativ baserat på din sökning:',
    venues: [
      { id: '3', name: 'Berns Salonger', slug: 'berns-salonger', area: 'Norrmalm', price: 45000, capacity: 800, imageUrl: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=800&h=600&fit=crop', matchReason: 'Klassisk festlokal sedan 1863' },
      { id: '4', name: 'Clarion Sign Konferens', slug: 'clarion-sign-konferens', area: 'Norrmalm', price: 12000, capacity: 180, imageUrl: 'https://images.unsplash.com/photo-1431540015161-0bf868a2d407?w=800&h=600&fit=crop', matchReason: 'Modern och professionell' },
    ],
  },
]

function MessageBubble({ message }: { message: AgentMessage }) {
  const isUser = message.role === 'user'

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[90%] bg-[#c45a3b] text-white rounded-2xl rounded-br-md px-3 py-2">
          <p className="whitespace-pre-wrap text-sm">{message.content}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-3">
      <div className="max-w-[80%] bg-[#f5f3f0] text-[#1a1a1a] rounded-2xl rounded-tl-md px-3 py-2">
        <p className="whitespace-pre-wrap text-sm">{message.content}</p>
        {message.venues && message.venues.length > 0 && (
          <p className="text-xs mt-1 opacity-75">
            {message.venues.length} {message.venues.length === 1 ? 'lokal hittad' : 'lokaler hittade'}
          </p>
        )}
      </div>
    </div>
  )
}

function LoadingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="bg-[#f5f3f0] text-[#78716c] rounded-2xl rounded-bl-md px-3 py-2">
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <span className="w-1.5 h-1.5 bg-[#a8a29e] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1.5 h-1.5 bg-[#a8a29e] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1.5 h-1.5 bg-[#a8a29e] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
          <span className="text-xs">Söker...</span>
        </div>
      </div>
    </div>
  )
}

export function SidebarChat({
  sessionId,
  initialMessages = [],
  initialState = 'idle',
  onVenuesFound,
  isExpanded = true,
  onExpandedChange,
  demoMode = false,
  initialQuery,
}: SidebarChatProps) {
  const [messages, setMessages] = useState<AgentMessage[]>(initialMessages)
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [agentState, setAgentState] = useState<AgentState>(initialState)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const prevMessageCount = useRef(initialMessages.length)
  const demoResponseIndex = useRef(0)
  const hasProcessedInitialQuery = useRef(false)
  const skipScrollCount = useRef(initialQuery ? 2 : 0) // Skip first 2 messages if there's an initial query

  useEffect(() => {
    if (messages.length > prevMessageCount.current) {
      if (skipScrollCount.current > 0) {
        // Skip scrolling for initial query messages
        skipScrollCount.current--
      } else {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }
    }
    prevMessageCount.current = messages.length
  }, [messages])

  const handleSendMessage = useCallback(async (messageContent: string) => {
    const trimmedMessage = messageContent.trim()
    if (!trimmedMessage || isLoading) return

    // Expand chat when sending a message on mobile
    if (onExpandedChange && !isExpanded) {
      onExpandedChange(true)
    }

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

      if (demoResponse.venues && onVenuesFound) {
        onVenuesFound(demoResponse.venues)
      }

      setIsLoading(false)
      return
    }

    try {
      const result = await processAgentMessage(sessionId, trimmedMessage)

      if (result.success && result.response) {
        const agentMessage: AgentMessage = {
          id: `agent_${Date.now()}`,
          role: 'agent',
          content: result.response.message,
          venues: result.response.venues,
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
        setAgentState(result.response.state)

        // Notify parent about found venues
        if (result.response.venues && result.response.venues.length > 0 && onVenuesFound) {
          onVenuesFound(result.response.venues)
        }
      } else {
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
  }, [isLoading, sessionId, onVenuesFound, onExpandedChange, isExpanded, demoMode])

  // Auto-send initial query from URL params
  useEffect(() => {
    if (initialQuery && !hasProcessedInitialQuery.current && messages.length === 0) {
      hasProcessedInitialQuery.current = true
      handleSendMessage(initialQuery)
    }
  }, [initialQuery, messages.length, handleSendMessage])

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

  function handleInputFocus() {
    if (onExpandedChange && !isExpanded) {
      onExpandedChange(true)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages area - hidden when collapsed on mobile */}
      <div className={`flex-1 overflow-y-auto px-3 py-4 space-y-3 ${!isExpanded ? 'hidden lg:block' : ''}`}>
        {messages.length === 0 && !isLoading && (
          <div className="flex items-start gap-3 py-4">
            <div className="bg-[#f5f3f0] rounded-2xl rounded-tl-md px-3 py-2 flex-1">
              <p className="text-sm text-[#1a1a1a]">
                Hej! Beskriv ditt event så hittar jag din eventlokal åt dig.
              </p>
            </div>
          </div>
        )}

        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}

        {isLoading && <LoadingIndicator />}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-[#e7e5e4] p-3">
        <form onSubmit={handleSubmit}>
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={handleInputFocus}
              placeholder="Beskriv ditt event..."
              disabled={isLoading}
              className="flex-1 h-10 px-3 text-sm border border-[#e7e5e4] rounded-full focus:outline-none focus:border-[#c45a3b] disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || isLoading}
              className="w-10 h-10 flex items-center justify-center bg-[#c45a3b] text-white rounded-full hover:bg-[#a84832] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              aria-label="Skicka"
            >
              {isLoading ? (
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 2L11 13M22 2L15 22L11 13L2 9L22 2Z" />
                </svg>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
