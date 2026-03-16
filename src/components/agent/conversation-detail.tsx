'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getConversationMessages, type ConversationWithMessages } from '@/actions/agent-conversations/get-conversation-messages'
import { replyToConversation } from '@/actions/agent-conversations/reply-to-conversation'
import { declineAction } from '@/actions/agent-actions/decline-action'
import type { AgentConversationMessage } from '@/types/agent-booking'

interface ConversationDetailProps {
  conversationId: string
  onBack: () => void
}

function formatTime(timestamp: string): string {
  const date = new Date(timestamp)
  return date.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })
}

function formatDate(timestamp: string): string {
  const date = new Date(timestamp)
  return date.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' })
}

function shouldShowDate(current: string, previous?: string): boolean {
  if (!previous) return true
  const currentDate = new Date(current).toDateString()
  const previousDate = new Date(previous).toDateString()
  return currentDate !== previousDate
}

function MessageBubble({ message }: { message: AgentConversationMessage }) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%]">
          <div className="bg-[#f3f4f6] text-[#1a1a1a] rounded-2xl rounded-tr-md px-3 py-2">
            <p className="whitespace-pre-wrap text-sm">{message.content}</p>
          </div>
          <p className="text-[10px] text-[#a8a29e] mt-0.5 text-right">{formatTime(message.timestamp)}</p>
        </div>
      </div>
    )
  }

  if (message.role === 'system') {
    const displayContent = message.content.replace(/^\[Svar från lokalägaren\]: /, '')
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%]">
          <div className="bg-[#c45a3b] text-white rounded-2xl rounded-tr-md px-3 py-2">
            <p className="text-[10px] font-medium opacity-80 mb-0.5">Du svarade</p>
            <p className="whitespace-pre-wrap text-sm">{displayContent}</p>
          </div>
          <p className="text-[10px] text-[#a8a29e] mt-0.5 text-right">{formatTime(message.timestamp)}</p>
        </div>
      </div>
    )
  }

  // Agent message
  return (
    <div className="flex justify-start">
      <div className="max-w-[80%]">
        <div className="bg-white border border-[#e7e5e4] text-[#1a1a1a] rounded-2xl rounded-tl-md px-3 py-2">
          <p className="whitespace-pre-wrap text-sm">{message.content}</p>
        </div>
        <p className="text-[10px] text-[#a8a29e] mt-0.5">AI-agent · {formatTime(message.timestamp)}</p>
      </div>
    </div>
  )
}

export function ConversationDetail({ conversationId, onBack }: ConversationDetailProps) {
  const [conversation, setConversation] = useState<ConversationWithMessages | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [replyText, setReplyText] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [isDeclining, setIsDeclining] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const fetchConversation = useCallback(async () => {
    const result = await getConversationMessages(conversationId)
    if (result.success && result.conversation) {
      setConversation(result.conversation)
    }
    setIsLoading(false)
  }, [conversationId])

  useEffect(() => {
    fetchConversation()
  }, [fetchConversation])

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [conversation?.messages])

  // Realtime subscription for this conversation
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`conv-detail:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'agent_conversations',
          filter: `id=eq.${conversationId}`,
        },
        () => {
          fetchConversation()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversationId, fetchConversation])

  async function handleReply() {
    if (!replyText.trim() || isSending) return
    setIsSending(true)
    setError(null)

    const result = await replyToConversation(
      conversationId,
      replyText.trim(),
      conversation?.pending_escalation_id ?? undefined
    )

    if (result.success) {
      setReplyText('')
      await fetchConversation()
    } else {
      setError(result.error ?? 'Kunde inte skicka meddelandet')
    }
    setIsSending(false)
  }

  async function handleDecline() {
    if (!conversation?.pending_escalation_id || isDeclining) return
    setIsDeclining(true)
    setError(null)

    const result = await declineAction(conversation.pending_escalation_id)
    if (result.success) {
      await fetchConversation()
    } else {
      setError(result.error ?? 'Kunde inte avböja')
    }
    setIsDeclining(false)
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <svg className="h-6 w-6 animate-spin text-[#78716c]" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    )
  }

  if (!conversation) {
    return (
      <div className="text-center py-12 text-[#78716c]">
        <p className="text-sm">Konversationen hittades inte</p>
        <button onClick={onBack} className="mt-2 text-sm text-[#c45a3b] hover:text-[#a84832] font-medium">
          Tillbaka
        </button>
      </div>
    )
  }

  const displayName = conversation.customer_name || conversation.customer_email || 'Anonym'
  const visibleMessages = conversation.messages.filter(m => !m.tool_calls && !m.tool_results)

  return (
    <div className="flex flex-col h-[calc(100vh-280px)] min-h-[400px]">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-[#e7e5e4]">
        <button
          onClick={onBack}
          className="w-8 h-8 flex items-center justify-center text-[#78716c] hover:text-[#1a1a1a] hover:bg-[#f5f5f4] rounded-lg transition-colors"
          aria-label="Tillbaka"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h2 className="text-sm font-semibold text-[#1a1a1a]">{displayName}</h2>
          <p className="text-xs text-[#a8a29e]">{conversation.venue_name}</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-4 space-y-3">
        {visibleMessages.map((message, index) => (
          <div key={message.id}>
            {shouldShowDate(message.timestamp, visibleMessages[index - 1]?.timestamp) && (
              <p className="text-center text-xs text-[#a8a29e] my-3">
                {formatDate(message.timestamp)}
              </p>
            )}
            <MessageBubble message={message} />
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Escalation banner */}
      {conversation.pending_escalation_id && conversation.pending_escalation_summary && (
        <div className="px-4 py-3 bg-[#fef3c7] border border-[#f59e0b]/30 rounded-lg mb-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-medium text-[#92400e]">Agenten behöver ditt svar</p>
              {conversation.pending_escalation_summary.reasons.length > 0 && (
                <p className="text-xs text-[#92400e]/80 mt-0.5">
                  {conversation.pending_escalation_summary.reasons.join(', ')}
                </p>
              )}
            </div>
            <button
              onClick={handleDecline}
              disabled={isDeclining}
              className="flex-shrink-0 text-xs text-[#92400e]/60 hover:text-[#92400e] font-medium disabled:opacity-50"
            >
              {isDeclining ? 'Avböjer...' : 'Avböj'}
            </button>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="text-xs text-red-600 mb-2 px-1">{error}</p>
      )}

      {/* Reply input */}
      <div className="border-t border-[#e7e5e4] pt-3">
        <div className="flex gap-2">
          <textarea
            ref={textareaRef}
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleReply()
              }
            }}
            placeholder="Skriv ett svar till kunden..."
            rows={2}
            disabled={isSending}
            className="flex-1 px-3 py-2 text-sm border border-[#e7e5e4] rounded-lg resize-none focus:outline-none focus:border-[#c45a3b] disabled:opacity-50"
          />
          <button
            onClick={handleReply}
            disabled={!replyText.trim() || isSending}
            className="self-end h-10 px-4 text-sm font-medium bg-[#c45a3b] text-white rounded-lg hover:bg-[#a84832] disabled:opacity-40 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-2"
          >
            {isSending && (
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            Skicka
          </button>
        </div>
      </div>
    </div>
  )
}
