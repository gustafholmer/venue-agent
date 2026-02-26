# AI Booking Agent — Design Document

**Date:** 2026-02-26
**Status:** Approved

## Overview

An AI agent that sits between the customer and venue owner during booking. The agent handles conversations autonomously — answering questions, checking availability, calculating pricing, assembling booking requests. The venue owner only gets involved when a human decision is needed, via a card-based action feed.

## Decisions

- **Scope:** Full build — all three tiers, action feed, configuration, cross-venue suggestions
- **Architecture:** Tool-calling agent using Gemini function calling
- **Streaming:** Complete messages (cheapest, simplest)
- **Migration:** Parallel systems — venues opt into the AI agent, others keep manual messaging/inquiries
- **Cross-venue:** Agent proactively suggests alternative Tryffle venues when current venue can't fulfill
- **Auto-approval:** Not in v1 — every booking requires venue owner approval
- **LLM:** Google Gemini (gemini-1.5-flash), consistent with existing infrastructure

## The Three Tiers

### Tier 1: Agent Answers Instantly

No venue owner involvement. The agent answers from venue data and configuration:

- Availability checks (calendar lookup, suggest nearest dates if taken)
- Capacity, amenities, equipment from venue profile
- Pricing calculated from venue's pricing rules
- Policies, FAQ entries from agent configuration
- Location info (parking, transit) from venue data

### Tier 2: Agent Assembles Booking, Owner Approves

Request is within normal parameters. Flow:

1. Agent collects through conversation: date, time, guest count, event type, duration, special needs
2. Agent confirms availability via `check_availability` tool
3. Agent calculates price via `calculate_price` tool
4. Agent presents summary to customer with "Send to venue?" prompt
5. Customer confirms → `propose_booking` tool creates an action card
6. Venue owner sees card: **[Approve] [Decline] [Modify]**
7. Approve → booking created via existing `createBookingRequest`. Decline → agent suggests alternatives. Modify → counter-offer flow.

### Tier 3: Agent Escalates to Owner

Request exceeds agent's authority:

- Guest count exceeds listed capacity
- Unlisted services (accommodation, custom catering, external DJ)
- Unspecified event type
- Price negotiation beyond authorized range
- Multi-day or complex events
- Customer explicitly asks for venue owner
- Agent lacks confidence in answer

Flow:

1. Agent tells customer: "I'll check with the venue"
2. `escalate_to_owner` tool creates escalation action card with reason
3. Venue owner replies or declines
4. Agent incorporates owner's response into conversation naturally
5. If resolved into standard booking → flows back to Tier 2

## Database Schema

### New Tables

**`venue_agent_config`**

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| venue_id | FK → venues | unique |
| pricing_rules | JSONB | base price, per-person rate, packages |
| booking_params | JSONB | min/max guests, min/max duration, advance window |
| event_types | JSONB | accepted/declined types with notes |
| policies | JSONB | cancellation, deposit, house rules |
| faq_entries | JSONB[] | array of { question, answer } |
| agent_language | text | 'sv' (default) or 'en' |
| agent_enabled | boolean | opt-in flag |
| created_at | timestamp | |
| updated_at | timestamp | |

**`agent_conversations`**

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| venue_id | FK → venues | |
| customer_id | FK → profiles | nullable (anonymous) |
| status | enum | 'active', 'waiting_for_owner', 'completed', 'expired' |
| messages | JSONB[] | role, content, tool_calls, timestamp |
| collected_booking_data | JSONB | progressively extracted booking details |
| tier | smallint | current classification (1, 2, 3), nullable |
| expires_at | timestamp | 7 days from creation |
| created_at | timestamp | |
| updated_at | timestamp | |

**`agent_actions`**

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| venue_id | FK → venues | |
| conversation_id | FK → agent_conversations | |
| customer_id | FK → profiles | nullable |
| action_type | enum | 'booking_approval', 'escalation', 'counter_offer' |
| status | enum | 'pending', 'approved', 'declined', 'modified', 'expired' |
| summary | JSONB | structured data for card rendering |
| owner_response | JSONB | modification details, notes, pricing |
| booking_request_id | FK → booking_requests | nullable, set on approval |
| created_at | timestamp | |
| updated_at | timestamp | |
| resolved_at | timestamp | |

### Existing Table Modifications

- **notifications:** New types: `agent_booking_approval`, `agent_escalation`, `agent_counter_offer`

## Agent Engine

### API Route

`POST /api/venue-agent`

- Request: `{ conversationId?, venueId, message }`
- Response: `{ conversationId, message, suggestions?, bookingSummary?, status }`

### System Prompt

Assembled from:

1. Venue profile data (name, address, capacity, pricing, amenities, types, vibes)
2. Agent config (pricing rules, booking params, event types, policies, FAQ)
3. Calendar data (blocked dates + existing bookings, next 3 months)
4. Behavioral instructions (tier classification, tone, language, guardrails)

### Tools (Gemini Function Calling)

| Tool | Purpose | Tier |
|------|---------|------|
| `check_availability` | Check venue calendar for a date, return status + alternatives | 1 |
| `calculate_price` | Compute price from pricing rules, return breakdown | 1 |
| `get_venue_info` | Look up specific venue info (parking, amenities, policies) | 1 |
| `propose_booking` | Create booking approval action card, notify owner | 2 |
| `escalate_to_owner` | Create escalation action card, notify owner | 3 |
| `search_other_venues` | Find alternative venues via existing semantic search | Cross-venue |

### Conversation Flow

1. Customer message → load/create `agent_conversation`, load venue + config
2. System prompt + history + tools → Gemini `generateContent`
3. If tool call: execute tool, append result, send back to Gemini for natural language response
4. Save to `agent_conversations.messages`, return to customer
5. If `propose_booking` or `escalate_to_owner`: dispatch notification to venue owner

### Owner Response Flow

- **Approve (Tier 2):** Call `createBookingRequest` → booking enters existing lifecycle → agent tells customer "booking confirmed"
- **Decline:** Agent conversation updated → agent relays decline + suggests alternatives
- **Modify:** New `agent_actions` row (counter_offer) → agent presents counter-offer to customer
- **Reply (Tier 3):** Owner response injected into agent context → agent incorporates naturally

### Guardrails

- Never confirms a booking without owner approval
- Never invents information — escalates when uncertain
- Conversation history capped at 50 messages sent to LLM
- Rate limit: 30 messages/hour per conversation

## Customer Chat UI

### Component: `VenueAgentChat`

Replaces `VenueAssistant` for agent-enabled venues. Key features:

- Persistent conversations stored in `agent_conversations` (7-day TTL)
- Resumes existing conversation on return to venue page
- Agent messages appear as venue (venue name + logo)
- Reuses existing `ChatBubble` component
- Inline booking summary card when agent proposes booking (Tier 2)
- Status indicator when waiting for owner response
- Real-time updates via Supabase Broadcast on channel `agent:{conversationId}`

### Anonymous → Authenticated

- Anonymous users can ask Tier 1 questions freely
- Tier 2 (booking proposal) requires sign-in
- Anonymous conversation linked to `customer_id` on auth

## Venue Owner Action Feed

### Pages

- `/dashboard/venue/[id]/actions` — per-venue feed
- `/dashboard/actions` — aggregated feed across all venues (default home)
- Badge count in dashboard nav

### Card Types

**Booking Approval** (Tier 2): Event details, pricing, customer info. Actions: Approve / Decline / Modify.

**Escalation** (Tier 3): Customer request summary, escalation reasons, budget. Actions: Reply / Decline.

**Counter-Offer Response**: Shows counter-offer and customer's response. Action: Approve booking.

### Interactions

- Approve: single tap → `createBookingRequest` → card resolves
- Decline: optional reason → card resolves
- Modify: inline form (adjust price, date/time, add note) → counter-offer sent
- Reply: text area → response injected into agent context

### Filtering

Tabs: Att göra (pending) | Alla | Godkända | Avböjda. Filter by venue in aggregated view.

### Real-time

New cards via Supabase Realtime on channel `actions:{venueId}`. Badge count updates across dashboard.

### Notifications

- In-app via existing `dispatchNotification`
- Email via new Edge Function `notify-agent-action`
- Email links directly to action card

## Venue Configuration

### Page: `/dashboard/venue/[id]/agent`

Progressive disclosure sections:

1. **Prissättning** (required) — base prices (pre-filled from venue), per-person rate, minimum spend, up to 5 named packages, pricing notes
2. **Bokningsregler** (required) — min/max guests (pre-filled), min/max duration, advance booking window, blocked weekdays
3. **Eventtyper** (optional) — toggle per type: Välkomna / Avböjs / Fråga mig (escalate). Pre-filled from venue types.
4. **Policyer** (optional) — cancellation terms, deposit, house rules
5. **Vanliga frågor** (optional) — Q&A pairs, pre-populated suggestions from venue data
6. **Agentinställningar** — language (sv/en), enable/disable toggle

Saves to `venue_agent_config`. Pre-populated from existing venue data.

## Cross-Venue Suggestions

When current venue can't fulfill (unavailable, declined, capacity mismatch):

1. Uses collected requirements from conversation
2. Calls existing `searchVenues` + pgvector semantic search
3. Returns top 3 matches with explanation via `generateExplanationsBatch`
4. Agent presents as mini venue cards in chat (name, photo, capacity, price, match reason)
5. Clicking opens venue page for new conversation

Does NOT trigger for Tier 3 escalations (custom requests worth waiting for).

## Integration with Existing Systems

- **Booking lifecycle:** Agent creates bookings via existing `createBookingRequest` — enters same pending → accepted → completed flow
- **Notifications:** Extends existing notification system with new types
- **Messaging:** Parallel — agent-enabled venues use agent conversations; non-agent venues keep inquiry + direct messaging
- **Search:** Cross-venue suggestions reuse existing `searchVenues` + `parsePreferences` + `generateEmbedding` pipeline
- **Stripe:** Booking payment flow unchanged — authorize on request, capture before event
