'use client'

import { memo } from 'react'
import type { ChatMessage } from '@/hooks/use-realtime-chat'

interface ChatBubbleProps {
  message: ChatMessage
  isOwnMessage: boolean
  showSender?: boolean
  showTimestamp?: boolean
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleTimeString('sv-SE', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const isToday = date.toDateString() === now.toDateString()

  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  const isYesterday = date.toDateString() === yesterday.toDateString()

  if (isToday) {
    return 'Idag'
  }

  if (isYesterday) {
    return 'Igår'
  }

  return date.toLocaleDateString('sv-SE', {
    day: 'numeric',
    month: 'short',
  })
}

function getInitials(name: string | null, email: string): string {
  if (name) {
    const parts = name.trim().split(/\s+/)
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    }
    return name.slice(0, 2).toUpperCase()
  }
  return email.slice(0, 2).toUpperCase()
}

export const ChatBubble = memo(function ChatBubble({
  message,
  isOwnMessage,
  showSender = false,
  showTimestamp = true,
}: ChatBubbleProps) {
  const senderName = message.sender?.full_name || message.sender?.email || 'Användare'
  const initials = getInitials(message.sender?.full_name || null, message.sender?.email || '')

  return (
    <div
      className={`flex gap-2.5 ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'}`}
    >
      {/* Avatar - only show for received messages */}
      {!isOwnMessage && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[var(--bg-warm)] border border-[var(--border)] flex items-center justify-center">
          <span className="text-xs font-medium text-[var(--text-muted)]">
            {initials}
          </span>
        </div>
      )}

      <div
        className={`flex flex-col max-w-[75%] ${isOwnMessage ? 'items-end' : 'items-start'}`}
      >
        {/* Sender name */}
        {showSender && !isOwnMessage && (
          <span className="text-xs text-[var(--text-muted)] mb-1 px-1">
            {senderName}
          </span>
        )}

        {/* Message bubble */}
        <div
          className={`
            px-3.5 py-2.5 rounded-2xl break-words
            ${isOwnMessage
              ? 'bg-[var(--accent)] text-white rounded-br-md'
              : 'bg-[var(--bg-soft)] text-[var(--text)] border border-[var(--border)] rounded-bl-md'
            }
          `}
        >
          <p className="text-sm whitespace-pre-wrap leading-relaxed">
            {message.content}
          </p>
        </div>

        {/* Timestamp */}
        {showTimestamp && (
          <span className="text-[10px] text-[var(--text-muted)] mt-1 px-1">
            {formatDate(message.created_at)} {formatTime(message.created_at)}
          </span>
        )}
      </div>
    </div>
  )
})
