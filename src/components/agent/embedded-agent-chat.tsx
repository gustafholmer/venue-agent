'use client'

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type FormEvent,
  type KeyboardEvent,
  type PointerEvent,
} from 'react'
import { useAgentChat, type AgentChatMessage } from '@/hooks/use-agent-chat'
import { AgentStatusIndicator } from './agent-status-indicator'

interface EmbeddedAgentChatProps {
  venue: {
    id: string
    name: string
    slug: string
  }
}

function MessageBubble({ message }: { message: AgentChatMessage }) {
  const isUser = message.role === 'user'

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] bg-[#c45a3b] text-white rounded-2xl rounded-br-md px-3 py-2 inverted-selection">
          <p className="whitespace-pre-wrap text-sm">{message.content}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-2">
      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#c45a3b] to-[#d4704f] flex-shrink-0 flex items-center justify-center">
        <span className="text-white text-xs font-semibold">T</span>
      </div>
      <div className="max-w-[85%]">
        <div className="bg-[#f3f4f6] text-[#1a1a1a] rounded-2xl rounded-tl-md px-3 py-2">
          <p className="whitespace-pre-wrap text-sm">{message.content}</p>
        </div>
      </div>
    </div>
  )
}

const QUICK_ACTIONS = [
  { label: 'Kolla tillgänglighet', message: 'Kan du kolla vilka datum som är lediga?' },
  { label: 'Få prisförslag', message: 'Vad kostar det att boka lokalen?' },
  { label: 'Vad ingår?', message: 'Vad ingår i priset?' },
]

const DEFAULT_HEIGHT = 200
const MIN_HEIGHT = 120
const MAX_HEIGHT = 500

export function EmbeddedAgentChat({ venue }: EmbeddedAgentChatProps) {
  const [inputValue, setInputValue] = useState('')
  const [chatHeight, setChatHeight] = useState(DEFAULT_HEIGHT)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const isDragging = useRef(false)
  const dragStartY = useRef(0)
  const dragStartHeight = useRef(0)

  const { messages, sendMessage, isLoading } = useAgentChat({
    venueId: venue.id,
    venueName: venue.name,
  })

  const hasConversationStarted = messages.length > 0

  // Auto-scroll to bottom on new messages (skip initial mount)
  const hasScrolled = useRef(false)
  useEffect(() => {
    if (!hasScrolled.current) {
      hasScrolled.current = true
      return
    }
    const container = messagesContainerRef.current
    if (container) {
      container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' })
    }
  }, [messages, isLoading])

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

  function handleChipClick(message: string) {
    handleSendMessage(message)
  }

  // Drag-to-resize handlers
  function handleDragStart(e: PointerEvent) {
    isDragging.current = true
    dragStartY.current = e.clientY
    dragStartHeight.current = chatHeight
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }

  function handleDragMove(e: PointerEvent) {
    if (!isDragging.current) return
    const delta = e.clientY - dragStartY.current
    const newHeight = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, dragStartHeight.current + delta))
    setChatHeight(newHeight)
  }

  function handleDragEnd() {
    isDragging.current = false
  }

  const greeting = `Hej! Jag kan hjälpa dig planera ditt event här på ${venue.name}. Berätta vad du har i åtanke!`

  return (
    <div className="bg-white border-2 border-[#c45a3b] rounded-2xl overflow-hidden shadow-sm">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#c45a3b] to-[#d4704f] px-4 py-3 text-white">
        <h3 className="font-semibold text-sm">Planera ditt event</h3>
        <p className="text-xs opacity-90 mt-0.5">
          Fråga om tillgänglighet, priser, eller berätta om ditt event
        </p>
      </div>

      {/* Quick-action chips */}
      {!hasConversationStarted && (
        <div className="px-4 pt-3 pb-1 flex flex-wrap gap-1.5">
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action.label}
              onClick={() => handleChipClick(action.message)}
              disabled={isLoading}
              className="text-xs px-3 py-1.5 rounded-full bg-[#faf5f3] text-[#c45a3b] border border-[#f0ddd7] hover:bg-[#f5ebe7] transition-colors disabled:opacity-50"
            >
              {action.label}
            </button>
          ))}
        </div>
      )}

      {/* Scrollable message area */}
      <div
        ref={messagesContainerRef}
        className="overflow-y-auto px-4 py-3 space-y-3"
        style={{ height: chatHeight }}
      >
        {/* Welcome message */}
        {!hasConversationStarted && !isLoading && (
          <div className="flex items-start gap-2">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#c45a3b] to-[#d4704f] flex-shrink-0 flex items-center justify-center">
              <span className="text-white text-xs font-semibold">T</span>
            </div>
            <div className="bg-[#f3f4f6] text-[#1a1a1a] rounded-2xl rounded-tl-md px-3 py-2">
              <p className="text-sm">{greeting}</p>
            </div>
          </div>
        )}

        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}

        {isLoading && <AgentStatusIndicator status="typing" />}
      </div>

      {/* Drag handle */}
      <div
        className="flex justify-center py-1 cursor-ns-resize hover:bg-[#f9f9f9] transition-colors"
        onPointerDown={handleDragStart}
        onPointerMove={handleDragMove}
        onPointerUp={handleDragEnd}
        onPointerCancel={handleDragEnd}
      >
        <div className="w-8 h-1 bg-[#d4d4d4] rounded-full" />
      </div>

      {/* Input */}
      <div className="px-4 pb-3">
        <form onSubmit={handleSubmit}>
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Skriv ett meddelande..."
              disabled={isLoading}
              className="flex-1 h-9 px-3 text-sm border border-[#e7e5e4] rounded-full focus:outline-none focus:border-[#c45a3b] disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || isLoading}
              className="w-9 h-9 flex items-center justify-center bg-[#c45a3b] text-white rounded-full hover:bg-[#a84832] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
  )
}
