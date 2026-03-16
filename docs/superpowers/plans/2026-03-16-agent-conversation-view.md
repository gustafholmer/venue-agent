# Agent Conversation View Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the action card pattern with a conversation list + detail view so venue owners can see full agent-customer conversations and reply inline.

**Architecture:** Two new server actions fetch conversations and handle owner replies. Two new components (ConversationList, ConversationDetail) replace the ActionFeed/ActionCard chain. Real-time updates via Supabase Realtime subscriptions on `agent_conversations`. Existing `replyToEscalation` and `declineAction` are reused for escalated conversations.

**Tech Stack:** Next.js App Router, Supabase (Postgres + Realtime), TypeScript, Tailwind CSS

---

## File Structure

### New files
- `src/actions/agent-conversations/get-venue-conversations.ts` — fetch conversation list with escalation status
- `src/actions/agent-conversations/get-conversation-messages.ts` — fetch single conversation messages
- `src/actions/agent-conversations/reply-to-conversation.ts` — owner reply for any conversation
- `src/actions/agent-conversations/get-pending-conversation-count.ts` — count conversations with pending escalations
- `src/components/agent/conversation-list.tsx` — conversation list with tabs
- `src/components/agent/conversation-detail.tsx` — message thread with reply input

### Modified files
- `src/app/(public)/dashboard/venue/[id]/actions/page.tsx` — use ConversationList
- `src/app/(public)/dashboard/actions/page.tsx` — use ConversationList
- `src/components/dashboard/dashboard-nav.tsx` — use new pending count action

### Deleted files
- `src/components/agent/action-feed.tsx`
- `src/components/agent/action-card-escalation.tsx`
- `src/components/agent/action-card.tsx`
- `src/components/agent/reply-dialog.tsx`
- `src/actions/agent-actions/get-actions.ts`
- `src/actions/agent-actions/get-pending-count.ts`

### Kept files (still needed)
- `src/actions/agent-actions/reply-to-escalation.ts` — used when replying to an escalated conversation
- `src/actions/agent-actions/decline-action.ts` — used to dismiss an escalation

---

## Chunk 1: Server Actions

### Task 1: Create getVenueConversations server action

**Files:**
- Create: `src/actions/agent-conversations/get-venue-conversations.ts`

- [ ] **Step 1: Create the server action**

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import type { AgentConversationMessage } from '@/types/agent-booking'

export interface ConversationListItem {
  id: string
  venue_id: string
  customer_id: string | null
  status: string
  messages: AgentConversationMessage[]
  created_at: string
  updated_at: string
  customer_name: string | null
  customer_email: string | null
  venue_name: string | null
  pending_escalation_id: string | null
  pending_escalation_reason: string | null
}

interface GetVenueConversationsOptions {
  venueId?: string
  limit?: number
}

export async function getVenueConversations(
  options: GetVenueConversationsOptions = {}
): Promise<{ success: boolean; conversations?: ConversationListItem[]; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Ej inloggad' }

    // Get owner's venue IDs
    let venueIds: string[]
    if (options.venueId) {
      // Verify ownership
      const { data: venue } = await supabase
        .from('venues')
        .select('id')
        .eq('id', options.venueId)
        .eq('owner_id', user.id)
        .single()
      if (!venue) return { success: false, error: 'Lokal hittades inte' }
      venueIds = [venue.id]
    } else {
      const { data: venues } = await supabase
        .from('venues')
        .select('id')
        .eq('owner_id', user.id)
      if (!venues || venues.length === 0) return { success: true, conversations: [] }
      venueIds = venues.map(v => v.id)
    }

    // Fetch conversations
    const { data: conversations, error } = await supabase
      .from('agent_conversations')
      .select('id, venue_id, customer_id, status, messages, created_at, updated_at, venues!inner(name), profiles(full_name, email)')
      .in('venue_id', venueIds)
      .neq('status', 'expired')
      .order('updated_at', { ascending: false })
      .limit(options.limit ?? 50)

    if (error) {
      console.error('[get-venue-conversations]', error)
      return { success: false, error: 'Kunde inte hämta konversationer' }
    }

    // Fetch pending escalations for these conversations
    const conversationIds = (conversations ?? []).map(c => c.id)
    const { data: pendingActions } = conversationIds.length > 0
      ? await supabase
          .from('agent_actions')
          .select('id, conversation_id, summary')
          .in('conversation_id', conversationIds)
          .eq('status', 'pending')
          .eq('action_type', 'escalation')
      : { data: [] }

    const escalationMap = new Map<string, { id: string; reason: string }>()
    for (const action of pendingActions ?? []) {
      const summary = action.summary as Record<string, unknown>
      escalationMap.set(action.conversation_id, {
        id: action.id,
        reason: (summary?.customerRequest as string) ?? '',
      })
    }

    const items: ConversationListItem[] = (conversations ?? []).map(c => {
      const venue = c.venues as unknown as { name: string } | null
      const profile = c.profiles as unknown as { full_name: string | null; email: string } | null
      const escalation = escalationMap.get(c.id)
      return {
        id: c.id,
        venue_id: c.venue_id,
        customer_id: c.customer_id,
        status: c.status,
        messages: (c.messages ?? []) as unknown as AgentConversationMessage[],
        created_at: c.created_at,
        updated_at: c.updated_at,
        customer_name: profile?.full_name ?? null,
        customer_email: profile?.email ?? null,
        venue_name: venue?.name ?? null,
        pending_escalation_id: escalation?.id ?? null,
        pending_escalation_reason: escalation?.reason ?? null,
      }
    })

    return { success: true, conversations: items }
  } catch (error) {
    console.error('[get-venue-conversations]', error)
    return { success: false, error: 'Ett oväntat fel uppstod' }
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/actions/agent-conversations/get-venue-conversations.ts
git commit -m "feat: add getVenueConversations server action"
```

---

### Task 2: Create getConversationMessages server action

**Files:**
- Create: `src/actions/agent-conversations/get-conversation-messages.ts`

- [ ] **Step 1: Create the server action**

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import type { AgentConversationMessage } from '@/types/agent-booking'

export interface ConversationWithMessages {
  id: string
  venue_id: string
  customer_id: string | null
  status: string
  messages: AgentConversationMessage[]
  created_at: string
  updated_at: string
  customer_name: string | null
  customer_email: string | null
  venue_name: string
  pending_escalation_id: string | null
  pending_escalation_summary: {
    customerRequest: string
    reasons: string[]
  } | null
}

export async function getConversationMessages(
  conversationId: string
): Promise<{ success: boolean; conversation?: ConversationWithMessages; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Ej inloggad' }

    // Fetch conversation with venue ownership check
    const { data: conversation, error } = await supabase
      .from('agent_conversations')
      .select('id, venue_id, customer_id, status, messages, created_at, updated_at, venues!inner(name, owner_id), profiles(full_name, email)')
      .eq('id', conversationId)
      .single()

    if (error || !conversation) {
      return { success: false, error: 'Konversation hittades inte' }
    }

    const venue = conversation.venues as unknown as { name: string; owner_id: string }
    if (venue.owner_id !== user.id) {
      return { success: false, error: 'Behörighet saknas' }
    }

    const profile = conversation.profiles as unknown as { full_name: string | null; email: string } | null

    // Check for pending escalation
    const { data: pendingAction } = await supabase
      .from('agent_actions')
      .select('id, summary')
      .eq('conversation_id', conversationId)
      .eq('status', 'pending')
      .eq('action_type', 'escalation')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    let escalationSummary: ConversationWithMessages['pending_escalation_summary'] = null
    if (pendingAction) {
      const summary = pendingAction.summary as Record<string, unknown>
      escalationSummary = {
        customerRequest: (summary?.customerRequest as string) ?? '',
        reasons: (summary?.reasons as string[]) ?? [],
      }
    }

    return {
      success: true,
      conversation: {
        id: conversation.id,
        venue_id: conversation.venue_id,
        customer_id: conversation.customer_id,
        status: conversation.status,
        messages: (conversation.messages ?? []) as unknown as AgentConversationMessage[],
        created_at: conversation.created_at,
        updated_at: conversation.updated_at,
        customer_name: profile?.full_name ?? null,
        customer_email: profile?.email ?? null,
        venue_name: venue.name,
        pending_escalation_id: pendingAction?.id ?? null,
        pending_escalation_summary: escalationSummary,
      },
    }
  } catch (error) {
    console.error('[get-conversation-messages]', error)
    return { success: false, error: 'Ett oväntat fel uppstod' }
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/actions/agent-conversations/get-conversation-messages.ts
git commit -m "feat: add getConversationMessages server action"
```

---

### Task 3: Create replyToConversation server action

**Files:**
- Create: `src/actions/agent-conversations/reply-to-conversation.ts`

- [ ] **Step 1: Create the server action**

This action handles owner replies to any conversation. For conversations with a pending escalation, it delegates to `replyToEscalation`. For non-escalated conversations, it injects the owner message directly.

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { replyToEscalation } from '@/actions/agent-actions/reply-to-escalation'
import type { AgentConversationMessage } from '@/types/agent-booking'

interface ReplyResult {
  success: boolean
  error?: string
}

export async function replyToConversation(
  conversationId: string,
  response: string,
  pendingEscalationId?: string
): Promise<ReplyResult> {
  try {
    const trimmed = response.trim()
    if (!trimmed) return { success: false, error: 'Meddelandet kan inte vara tomt' }
    if (trimmed.length > 2000) return { success: false, error: 'Meddelandet är för långt (max 2000 tecken)' }

    // If there's a pending escalation, use the existing reply flow
    if (pendingEscalationId) {
      return replyToEscalation(pendingEscalationId, trimmed)
    }

    // Otherwise, inject owner message directly
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Ej inloggad' }

    // Fetch conversation with ownership check
    const { data: conversation, error } = await supabase
      .from('agent_conversations')
      .select('id, venue_id, messages, venues!inner(owner_id)')
      .eq('id', conversationId)
      .single()

    if (error || !conversation) {
      return { success: false, error: 'Konversation hittades inte' }
    }

    const venue = conversation.venues as unknown as { owner_id: string }
    if (venue.owner_id !== user.id) {
      return { success: false, error: 'Behörighet saknas' }
    }

    // Append owner message
    const existingMessages = (conversation.messages ?? []) as unknown as AgentConversationMessage[]
    const ownerMessage: AgentConversationMessage = {
      id: `owner_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      role: 'system',
      content: `[Svar från lokalägaren]: ${trimmed}`,
      timestamp: new Date().toISOString(),
    }

    const serviceClient = createServiceClient()
    const { error: updateError } = await serviceClient
      .from('agent_conversations')
      .update({
        messages: [...existingMessages, ownerMessage] as unknown as Record<string, unknown>[],
        status: 'active',
        updated_at: new Date().toISOString(),
      })
      .eq('id', conversationId)

    if (updateError) {
      console.error('[reply-to-conversation] Update error:', updateError)
      return { success: false, error: 'Kunde inte skicka meddelandet' }
    }

    // Broadcast via Realtime
    await serviceClient.channel(`agent:${conversationId}`).send({
      type: 'broadcast',
      event: 'action_update',
      payload: { status: 'owner_reply', ownerResponse: trimmed },
    })

    return { success: true }
  } catch (error) {
    console.error('[reply-to-conversation]', error)
    return { success: false, error: 'Ett oväntat fel uppstod' }
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/actions/agent-conversations/reply-to-conversation.ts
git commit -m "feat: add replyToConversation server action"
```

---

### Task 4: Create getPendingConversationCount server action

**Files:**
- Create: `src/actions/agent-conversations/get-pending-conversation-count.ts`

- [ ] **Step 1: Create the server action**

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'

export async function getPendingConversationCount(): Promise<number> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return 0

    const { data: venues } = await supabase
      .from('venues')
      .select('id')
      .eq('owner_id', user.id)

    if (!venues || venues.length === 0) return 0

    const venueIds = venues.map(v => v.id)

    // Count distinct conversations that have pending escalations
    const { count } = await supabase
      .from('agent_actions')
      .select('conversation_id', { count: 'exact', head: true })
      .in('venue_id', venueIds)
      .eq('status', 'pending')
      .eq('action_type', 'escalation')

    return count ?? 0
  } catch {
    return 0
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/actions/agent-conversations/get-pending-conversation-count.ts
git commit -m "feat: add getPendingConversationCount server action"
```

---

## Chunk 2: UI Components

### Task 5: Create ConversationList component

**Files:**
- Create: `src/components/agent/conversation-list.tsx`

- [ ] **Step 1: Create the component**

```typescript
'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getVenueConversations, type ConversationListItem } from '@/actions/agent-conversations/get-venue-conversations'
import { ConversationDetail } from './conversation-detail'
import type { AgentConversationMessage } from '@/types/agent-booking'

interface ConversationListProps {
  venueId?: string
}

type TabKey = 'pending' | 'all'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'pending', label: 'Att göra' },
  { key: 'all', label: 'Alla' },
]

function getLastUserMessage(messages: AgentConversationMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === 'user') {
      return messages[i].content
    }
  }
  return ''
}

function formatRelativeTime(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffMinutes = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMinutes < 1) return 'just nu'
  if (diffMinutes < 60) return `${diffMinutes} min sedan`
  if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'timme' : 'timmar'} sedan`
  if (diffDays < 7) return `${diffDays} ${diffDays === 1 ? 'dag' : 'dagar'} sedan`

  const months = ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec']
  return `${date.getDate()} ${months[date.getMonth()]}`
}

export function ConversationList({ venueId }: ConversationListProps) {
  const [conversations, setConversations] = useState<ConversationListItem[]>([])
  const [activeTab, setActiveTab] = useState<TabKey>('pending')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchConversations = useCallback(async () => {
    const result = await getVenueConversations({ venueId, limit: 50 })
    if (result.success && result.conversations) {
      setConversations(result.conversations)
    }
    setIsLoading(false)
  }, [venueId])

  useEffect(() => {
    fetchConversations()
  }, [fetchConversations])

  // Realtime subscription on agent_conversations
  useEffect(() => {
    const supabase = createClient()
    const channelName = venueId ? `conv-list:${venueId}` : 'conv-list:all'

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'agent_conversations',
          ...(venueId ? { filter: `venue_id=eq.${venueId}` } : {}),
        },
        () => {
          fetchConversations()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [venueId, fetchConversations])

  // If a conversation is selected, show detail view
  if (selectedId) {
    return (
      <ConversationDetail
        conversationId={selectedId}
        onBack={() => {
          setSelectedId(null)
          fetchConversations()
        }}
      />
    )
  }

  const filtered = activeTab === 'pending'
    ? conversations.filter(c => c.pending_escalation_id !== null)
    : conversations

  const pendingCount = conversations.filter(c => c.pending_escalation_id !== null).length

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-1 border-b border-[#e7e5e4] mb-4">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-2 text-sm font-medium transition-colors relative ${
              activeTab === tab.key
                ? 'text-[#1a1a1a]'
                : 'text-[#78716c] hover:text-[#1a1a1a]'
            }`}
          >
            {tab.label}
            {tab.key === 'pending' && pendingCount > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-xs font-medium bg-[#c45a3b] text-white rounded-full">
                {pendingCount}
              </span>
            )}
            {activeTab === tab.key && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#1a1a1a] rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex justify-center py-12">
          <svg className="h-6 w-6 animate-spin text-[#78716c]" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <svg className="w-12 h-12 text-[#e7e5e4] mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <p className="text-sm text-[#78716c]">
            {activeTab === 'pending'
              ? 'Inga ärenden att hantera'
              : 'Inga konversationer än'}
          </p>
        </div>
      )}

      {/* Conversation rows */}
      {!isLoading && filtered.length > 0 && (
        <div className="bg-white border border-[#e7e5e4] rounded-xl overflow-hidden divide-y divide-[#e7e5e4]">
          {filtered.map((conv) => {
            const lastMessage = getLastUserMessage(conv.messages)
            const displayName = conv.customer_name || conv.customer_email || 'Anonym'

            return (
              <button
                key={conv.id}
                onClick={() => setSelectedId(conv.id)}
                className="w-full flex items-center justify-between px-4 sm:px-6 py-4 hover:bg-[#fafaf9] transition-colors text-left"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-medium text-[#1a1a1a] truncate">
                      {displayName}
                    </span>
                    {conv.pending_escalation_id && (
                      <span className="flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[#c45a3b]/10 text-[#c45a3b]">
                        Behöver svar
                      </span>
                    )}
                    {!venueId && conv.venue_name && (
                      <span className="flex-shrink-0 text-xs text-[#a8a29e]">
                        {conv.venue_name}
                      </span>
                    )}
                  </div>
                  {lastMessage && (
                    <p className="text-sm text-[#78716c] truncate">
                      {lastMessage}
                    </p>
                  )}
                </div>
                <div className="flex-shrink-0 ml-4">
                  <span className="text-xs text-[#a8a29e]">
                    {formatRelativeTime(conv.updated_at)}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors (ConversationDetail does not exist yet — create a stub first if needed, or create both components before checking)

---

### Task 6: Create ConversationDetail component

**Files:**
- Create: `src/components/agent/conversation-detail.tsx`

- [ ] **Step 1: Create the component**

```typescript
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
    // Owner reply — strip prefix for display
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
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit both components**

```bash
git add src/components/agent/conversation-list.tsx src/components/agent/conversation-detail.tsx
git commit -m "feat: add ConversationList and ConversationDetail components"
```

---

## Chunk 3: Wire Up Pages and Clean Up

### Task 7: Update page files to use ConversationList

**Files:**
- Modify: `src/app/(public)/dashboard/venue/[id]/actions/page.tsx`
- Modify: `src/app/(public)/dashboard/actions/page.tsx`

- [ ] **Step 1: Rewrite venue actions page**

Replace the entire file with:

```typescript
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ConversationList } from '@/components/agent/conversation-list'

export default async function VenueActionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: venueId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/sign-in')

  // Verify ownership
  const { data: venue } = await supabase
    .from('venues')
    .select('id, name, owner_id')
    .eq('id', venueId)
    .single()

  if (!venue || venue.owner_id !== user.id) redirect('/dashboard')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1a1a1a]">AI-agent</h1>
        <p className="text-[#78716c] mt-1">Konversationer mellan AI-agenten och kunder</p>
      </div>
      <ConversationList venueId={venueId} />
    </div>
  )
}
```

- [ ] **Step 2: Rewrite global actions page**

Replace the entire file with:

```typescript
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ConversationList } from '@/components/agent/conversation-list'

export default async function DashboardActionsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/sign-in')

  // Verify owner has venues
  const { data: venues } = await supabase
    .from('venues')
    .select('id')
    .eq('owner_id', user.id)

  if (!venues || venues.length === 0) redirect('/dashboard')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1a1a1a]">AI-agent</h1>
        <p className="text-[#78716c] mt-1">Konversationer från AI-agenten för alla dina lokaler</p>
      </div>
      <ConversationList />
    </div>
  )
}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/app/\(public\)/dashboard/venue/\[id\]/actions/page.tsx src/app/\(public\)/dashboard/actions/page.tsx
git commit -m "feat: wire conversation list into dashboard pages"
```

---

### Task 8: Update dashboard nav pending count

**Files:**
- Modify: `src/components/dashboard/dashboard-nav.tsx`

- [ ] **Step 1: Replace import and usage**

Change the import from `getPendingActionCount` to `getPendingConversationCount`:

Replace line 7:
```typescript
import { getPendingActionCount } from '@/actions/agent-actions/get-pending-count'
```
with:
```typescript
import { getPendingConversationCount } from '@/actions/agent-conversations/get-pending-conversation-count'
```

Replace the `useEffect` call (find `getPendingActionCount` and replace with `getPendingConversationCount`).

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/dashboard-nav.tsx
git commit -m "refactor: use getPendingConversationCount in dashboard nav"
```

---

### Task 9: Delete old components and actions

**Files:**
- Delete: `src/components/agent/action-feed.tsx`
- Delete: `src/components/agent/action-card-escalation.tsx`
- Delete: `src/components/agent/action-card.tsx`
- Delete: `src/components/agent/reply-dialog.tsx`
- Delete: `src/actions/agent-actions/get-actions.ts`
- Delete: `src/actions/agent-actions/get-pending-count.ts`

- [ ] **Step 1: Delete all files**

```bash
rm src/components/agent/action-feed.tsx \
   src/components/agent/action-card-escalation.tsx \
   src/components/agent/action-card.tsx \
   src/components/agent/reply-dialog.tsx \
   src/actions/agent-actions/get-actions.ts \
   src/actions/agent-actions/get-pending-count.ts
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors. If there are import errors, fix them.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "refactor: remove old action feed components and server actions"
```

---

### Task 10: Verify the app builds

- [ ] **Step 1: Run full build**

```bash
npm run build
```

Expected: Build completes with no errors.

- [ ] **Step 2: Manual smoke test**

Navigate to:
- `http://localhost:3000/dashboard/actions` — should show conversation list (empty if no conversations)
- `http://localhost:3000/dashboard/venue/<id>/actions` — should show conversation list for that venue

- [ ] **Step 3: Final commit if any fixes were needed**

```bash
git add -A
git commit -m "fix: resolve build issues from conversation view migration"
```
