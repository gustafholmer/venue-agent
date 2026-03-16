# Agent Conversation View — Design Spec

Replace the action card pattern in the AI-agent dashboard tab with a conversation list and detail view, so venue owners can see full agent-customer conversations and reply inline.

## Conversation List View

The AI-agent tab (`/dashboard/venue/[id]/actions` and `/dashboard/actions`) replaces the current `ActionFeed` with a `ConversationList`.

- **Two tabs:** "Att gora" (conversations with pending escalations) and "Alla" (all conversations).
- **Each row shows:** customer name/email or "Anonym", last message preview (truncated), relative timestamp, and a badge if an escalation is pending.
- **Sorting:** most recent activity first.
- **Clicking a row** opens the conversation detail view.
- **Real-time:** Supabase Realtime subscription on `agent_conversations` filtered by `venue_id`. On any change, refetch the list.
- **Global page** (`/dashboard/actions`): same component, no `venueId` filter — shows conversations across all owner venues. Each row includes the venue name.

## Conversation Detail View

When the owner selects a conversation:

- **Message thread** showing the full conversation history from `agent_conversations.messages`.
- **Message types rendered:**
  - `role: 'user'` — customer messages, styled as incoming bubbles.
  - `role: 'agent'` — AI agent messages, styled as outgoing/system bubbles.
  - `role: 'system'` — owner replies (prefixed with `[Svar fran lokalagaren]`), styled distinctly (e.g. highlighted background).
  - Messages with `tool_calls`/`tool_results` are **hidden** — only natural language shown.
- **Escalation banner:** if there is a pending escalation (`agent_actions` with `status = 'pending'` for this conversation), show a highlighted banner above the reply input with the escalation reason.
- **Reply input:** always visible at the bottom. Textarea + send button. Works for both escalated and non-escalated conversations.
- **Auto-scroll:** scrolls to bottom on new messages.
- **Real-time:** Supabase Realtime subscription on the specific `agent_conversations` row. On change, refetch messages and re-render.
- **Back navigation:** button to return to conversation list.

## Data Flow

### Fetching conversations

Query `agent_conversations` where `venue_id` matches (or all owner venues for global page), ordered by `updated_at DESC`. Join with `agent_actions` to determine if any pending escalation exists per conversation. Join with `profiles` on `customer_id` to get customer name/email.

### Owner reply (escalated conversation)

Reuse existing `replyToEscalation` server action:
1. Updates `agent_actions.status` to `'approved'`, sets `owner_response`.
2. Injects system message into `agent_conversations.messages`.
3. Sets conversation `status` back to `'active'`.
4. Broadcasts via Supabase Realtime.

### Owner reply (non-escalated conversation)

New `replyToConversation` server action:
1. Auth + ownership check.
2. Inject system message (`role: 'system'`, content: `[Svar fran lokalagaren]: ${response}`) into `agent_conversations.messages`.
3. Update `agent_conversations.updated_at`.
4. Broadcast via Supabase Realtime channel `agent:<conversationId>`.

### Customer-side real-time

The `VenueAgentChat` component already subscribes to Realtime on `agent:<conversationId>`. Owner messages will appear in the customer's chat automatically (rendered as system messages).

## Components

### New components

- `ConversationList` — replaces `ActionFeed`. Props: `venueId?: string`. Tabs, list rendering, real-time subscription.
- `ConversationDetail` — full thread view. Props: `conversationId: string, venueId: string`. Message rendering, reply input, real-time subscription, escalation banner.

### Removed components

- `ActionFeed`
- `ActionCardEscalation`
- `ActionCardCounterOffer` (already deleted)
- `ActionCardBooking` (already deleted)
- `ActionCard` (base card wrapper, check if used elsewhere)
- `ReplyDialog`

### Modified pages

- `/dashboard/venue/[id]/actions/page.tsx` — render `ConversationList` instead of `ActionFeed`.
- `/dashboard/actions/page.tsx` — render `ConversationList` instead of `ActionFeed`.

### Server actions

- New: `getVenueConversations({ venueId?, limit? })` — fetch conversations with escalation status and customer info.
- New: `getConversationMessages(conversationId)` — fetch single conversation with messages.
- New: `replyToConversation(conversationId, response)` — owner reply for non-escalated conversations.
- Keep: `replyToEscalation(actionId, response)` — owner reply for escalated conversations.
- Keep: `declineAction(actionId)` — dismiss an escalation.
- Remove: `getAgentActions` — replaced by `getVenueConversations`.
- Remove: `getPendingActionCount` — replaced by count of conversations with pending escalations.

## Edge Cases

- **Anonymous customers:** show "Anonym" in the list, no profile link.
- **Expired conversations:** filter out by default (7-day TTL). Could show in "Alla" tab with a faded style if useful later.
- **Empty state:** "Inga konversationer an" for "Alla", "Inga arenden att hantera" for "Att gora".
- **Multiple escalations per conversation:** show the most recent pending one in the banner. Resolved escalations are not shown.
