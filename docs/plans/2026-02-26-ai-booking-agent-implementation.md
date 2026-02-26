# AI Booking Agent Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a three-tier AI booking agent that handles customer conversations, assembles booking requests, and presents venue owners with an action feed for one-tap decisions.

**Architecture:** Tool-calling Gemini agent with 6 tools, persistent conversations in Supabase, real-time action feed via Supabase Broadcast, venue owner opt-in via `agent_enabled` flag. Parallel system — non-agent venues keep existing inquiry + messaging flow.

**Tech Stack:** Next.js 16 (App Router), TypeScript, Google Gemini (function calling), Supabase (PostgreSQL + Realtime + Edge Functions), Tailwind v4, Resend (email).

**Note:** This project has no test infrastructure. Task 1 sets up Vitest. Core logic (tools, server actions) uses TDD. UI components are tested manually.

---

### Task 1: Set Up Vitest

**Files:**
- Create: `vitest.config.ts`
- Create: `src/__tests__/setup.ts`
- Modify: `package.json` (add devDependencies + test script)

**Step 1: Install Vitest**

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

**Step 2: Create vitest config**

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts'],
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

**Step 3: Create setup file**

```ts
// src/__tests__/setup.ts
import '@testing-library/jest-dom/vitest'
```

**Step 4: Add test script to package.json**

Add to `"scripts"`: `"test": "vitest run"`, `"test:watch": "vitest"`

**Step 5: Verify setup**

```bash
npx vitest run
```

Expected: "No test files found" (passes with 0 tests).

**Step 6: Commit**

```bash
git add vitest.config.ts src/__tests__/setup.ts package.json package-lock.json
git commit -m "chore: set up Vitest test infrastructure"
```

---

### Task 2: Database Migration — `venue_agent_config`

**Files:**
- Create: `supabase/migrations/20260226130000_create_venue_agent_config.sql`

**Step 1: Write the migration**

```sql
-- Agent configuration per venue
CREATE TABLE IF NOT EXISTS venue_agent_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  pricing_rules jsonb NOT NULL DEFAULT '{}',
  booking_params jsonb NOT NULL DEFAULT '{}',
  event_types jsonb NOT NULL DEFAULT '{}',
  policies jsonb NOT NULL DEFAULT '{}',
  faq_entries jsonb NOT NULL DEFAULT '[]',
  agent_language text NOT NULL DEFAULT 'sv' CHECK (agent_language IN ('sv', 'en')),
  agent_enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT venue_agent_config_venue_unique UNIQUE (venue_id)
);

CREATE INDEX idx_venue_agent_config_venue_id ON venue_agent_config(venue_id);
CREATE INDEX idx_venue_agent_config_enabled ON venue_agent_config(venue_id) WHERE agent_enabled = true;

ALTER TABLE venue_agent_config ENABLE ROW LEVEL SECURITY;

-- Venue owners can manage their own config
CREATE POLICY "Venue owners can view own config"
  ON venue_agent_config FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM venues WHERE venues.id = venue_agent_config.venue_id AND venues.owner_id = auth.uid()
  ));

CREATE POLICY "Venue owners can insert own config"
  ON venue_agent_config FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM venues WHERE venues.id = venue_agent_config.venue_id AND venues.owner_id = auth.uid()
  ));

CREATE POLICY "Venue owners can update own config"
  ON venue_agent_config FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM venues WHERE venues.id = venue_agent_config.venue_id AND venues.owner_id = auth.uid()
  ));

-- Public can read config for published venues with agent enabled (needed for chat widget)
CREATE POLICY "Public can read enabled agent config"
  ON venue_agent_config FOR SELECT
  USING (
    agent_enabled = true AND EXISTS (
      SELECT 1 FROM venues WHERE venues.id = venue_agent_config.venue_id AND venues.status = 'published'
    )
  );

-- Trigger for updated_at
CREATE TRIGGER update_venue_agent_config_updated_at
  BEFORE UPDATE ON venue_agent_config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

**Step 2: Apply migration**

```bash
npx supabase db push
```

**Step 3: Commit**

```bash
git add supabase/migrations/20260226130000_create_venue_agent_config.sql
git commit -m "feat: add venue_agent_config table migration"
```

---

### Task 3: Database Migration — `agent_conversations`

**Files:**
- Create: `supabase/migrations/20260226130001_create_agent_conversations.sql`

**Step 1: Write the migration**

```sql
-- Agent conversation sessions (per-venue, persistent)
CREATE TABLE IF NOT EXISTS agent_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'waiting_for_owner', 'completed', 'expired')),
  messages jsonb NOT NULL DEFAULT '[]',
  collected_booking_data jsonb NOT NULL DEFAULT '{}',
  tier smallint CHECK (tier IS NULL OR tier IN (1, 2, 3)),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_agent_conversations_venue_id ON agent_conversations(venue_id);
CREATE INDEX idx_agent_conversations_customer_id ON agent_conversations(customer_id);
CREATE INDEX idx_agent_conversations_status ON agent_conversations(status) WHERE status = 'active';
CREATE INDEX idx_agent_conversations_expires_at ON agent_conversations(expires_at);

ALTER TABLE agent_conversations ENABLE ROW LEVEL SECURITY;

-- Customers can view their own conversations
CREATE POLICY "Customers can view own conversations"
  ON agent_conversations FOR SELECT
  USING (customer_id = auth.uid());

-- Customers can insert conversations
CREATE POLICY "Customers can create conversations"
  ON agent_conversations FOR INSERT
  WITH CHECK (customer_id = auth.uid() OR customer_id IS NULL);

-- Service role updates conversations (agent API route uses service client)
-- Anonymous conversations are created/updated via the API route with service role

-- Venue owners can view conversations for their venues
CREATE POLICY "Venue owners can view venue conversations"
  ON agent_conversations FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM venues WHERE venues.id = agent_conversations.venue_id AND venues.owner_id = auth.uid()
  ));

CREATE TRIGGER update_agent_conversations_updated_at
  BEFORE UPDATE ON agent_conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

**Step 2: Apply migration**

```bash
npx supabase db push
```

**Step 3: Commit**

```bash
git add supabase/migrations/20260226130001_create_agent_conversations.sql
git commit -m "feat: add agent_conversations table migration"
```

---

### Task 4: Database Migration — `agent_actions`

**Files:**
- Create: `supabase/migrations/20260226130002_create_agent_actions.sql`

**Step 1: Write the migration**

```sql
-- Action cards for venue owner action feed
CREATE TABLE IF NOT EXISTS agent_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL REFERENCES agent_conversations(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  action_type text NOT NULL CHECK (action_type IN ('booking_approval', 'escalation', 'counter_offer')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'declined', 'modified', 'expired')),
  summary jsonb NOT NULL DEFAULT '{}',
  owner_response jsonb,
  booking_request_id uuid REFERENCES booking_requests(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

CREATE INDEX idx_agent_actions_venue_id ON agent_actions(venue_id);
CREATE INDEX idx_agent_actions_conversation_id ON agent_actions(conversation_id);
CREATE INDEX idx_agent_actions_status ON agent_actions(venue_id, status) WHERE status = 'pending';
CREATE INDEX idx_agent_actions_created_at ON agent_actions(created_at DESC);

ALTER TABLE agent_actions ENABLE ROW LEVEL SECURITY;

-- Venue owners can view and update actions for their venues
CREATE POLICY "Venue owners can view own actions"
  ON agent_actions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM venues WHERE venues.id = agent_actions.venue_id AND venues.owner_id = auth.uid()
  ));

CREATE POLICY "Venue owners can update own actions"
  ON agent_actions FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM venues WHERE venues.id = agent_actions.venue_id AND venues.owner_id = auth.uid()
  ));

-- Customers can view their own actions (for counter-offers)
CREATE POLICY "Customers can view own actions"
  ON agent_actions FOR SELECT
  USING (customer_id = auth.uid());

-- Add new notification types
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'agent_booking_approval';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'agent_escalation';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'agent_counter_offer';

-- Add 'agent_action' entity type for notification routing
ALTER TYPE entity_type ADD VALUE IF NOT EXISTS 'agent_action';

CREATE TRIGGER update_agent_actions_updated_at
  BEFORE UPDATE ON agent_actions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

**Step 2: Apply migration**

```bash
npx supabase db push
```

**Step 3: Commit**

```bash
git add supabase/migrations/20260226130002_create_agent_actions.sql
git commit -m "feat: add agent_actions table and notification types"
```

---

### Task 5: Update TypeScript Types

**Files:**
- Modify: `src/types/database.ts`
- Create: `src/types/agent-booking.ts`

**Step 1: Regenerate Supabase types**

```bash
npx supabase gen types typescript --local > src/types/database.ts
```

If the project uses `supabase gen types` from a remote DB, use the appropriate command. Check the existing `database.ts` generation approach. Alternatively, manually add the new table types.

**Step 2: Create agent booking types**

```ts
// src/types/agent-booking.ts
import type { Tables } from './database'

export type VenueAgentConfig = Tables<'venue_agent_config'>
export type AgentConversation = Tables<'agent_conversations'>
export type AgentAction = Tables<'agent_actions'>

export type AgentConversationStatus = 'active' | 'waiting_for_owner' | 'completed' | 'expired'
export type AgentActionType = 'booking_approval' | 'escalation' | 'counter_offer'
export type AgentActionStatus = 'pending' | 'approved' | 'declined' | 'modified' | 'expired'

export interface AgentConversationMessage {
  id: string
  role: 'user' | 'agent' | 'system'
  content: string
  tool_calls?: AgentToolCall[]
  tool_results?: AgentToolResult[]
  timestamp: string
}

export interface AgentToolCall {
  name: string
  args: Record<string, unknown>
}

export interface AgentToolResult {
  name: string
  result: unknown
}

export interface CollectedBookingData {
  date?: string
  startTime?: string
  endTime?: string
  guestCount?: number
  eventType?: string
  duration?: number
  extras?: string[]
  customerNote?: string
  calculatedPrice?: number
  priceBreakdown?: PriceBreakdown
}

export interface PriceBreakdown {
  basePrice: number
  perPersonCost?: number
  packageCost?: number
  totalBeforeFee: number
  platformFee: number
  totalPrice: number
}

export interface PricingRules {
  basePrice?: number
  perPersonRate?: number
  minimumSpend?: number
  packages?: PricingPackage[]
  notes?: string
}

export interface PricingPackage {
  name: string
  price: number
  description: string
  perPerson: boolean
}

export interface BookingParams {
  minGuests?: number
  maxGuests?: number
  minDurationHours?: number
  maxDurationHours?: number
  minAdvanceDays?: number
  maxAdvanceMonths?: number
  blockedWeekdays?: number[] // 0=Sunday, 1=Monday, etc.
}

export interface EventTypeConfig {
  type: string
  label: string
  status: 'welcome' | 'declined' | 'ask_owner'
  note?: string
}

export interface PolicyConfig {
  cancellation?: string
  deposit?: string
  houseRules?: string
}

export interface FaqEntry {
  question: string
  answer: string
}

export interface BookingApprovalSummary {
  eventType: string
  eventTypeLabel: string
  guestCount: number
  date: string
  startTime: string
  endTime: string
  price: number
  priceBreakdown: PriceBreakdown
  extras: string[]
  customerName?: string
  customerEmail?: string
  companyName?: string
  customerNote?: string
}

export interface EscalationSummary {
  customerRequest: string
  reasons: string[]
  context: Record<string, unknown>
  customerBudget?: number
}
```

**Step 3: Commit**

```bash
git add src/types/database.ts src/types/agent-booking.ts
git commit -m "feat: add TypeScript types for agent booking system"
```

---

### Task 6: Venue Agent Config Server Actions

**Files:**
- Create: `src/actions/agent-config/get-agent-config.ts`
- Create: `src/actions/agent-config/upsert-agent-config.ts`

**Step 1: Write tests for config actions**

Create `src/__tests__/actions/agent-config.test.ts` — test the validation and transformation logic (mock Supabase). Focus on:
- `validatePricingRules` rejects negative prices
- `validateBookingParams` rejects min > max
- `validateFaqEntries` rejects empty questions
- Config merge logic correctly deep-merges partial updates

**Step 2: Implement get-agent-config**

```ts
// src/actions/agent-config/get-agent-config.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import type { VenueAgentConfig } from '@/types/agent-booking'

interface GetConfigResult {
  success: boolean
  config?: VenueAgentConfig
  error?: string
}

export async function getAgentConfig(venueId: string): Promise<GetConfigResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Ej inloggad' }

  const { data, error } = await supabase
    .from('venue_agent_config')
    .select('*')
    .eq('venue_id', venueId)
    .single()

  if (error && error.code !== 'PGRST116') {
    return { success: false, error: 'Kunde inte hämta konfiguration' }
  }

  return { success: true, config: data ?? undefined }
}
```

**Step 3: Implement upsert-agent-config**

```ts
// src/actions/agent-config/upsert-agent-config.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import type {
  PricingRules, BookingParams, EventTypeConfig,
  PolicyConfig, FaqEntry
} from '@/types/agent-booking'

interface UpsertConfigInput {
  venueId: string
  pricingRules?: PricingRules
  bookingParams?: BookingParams
  eventTypes?: EventTypeConfig[]
  policies?: PolicyConfig
  faqEntries?: FaqEntry[]
  agentLanguage?: 'sv' | 'en'
  agentEnabled?: boolean
}

interface UpsertConfigResult {
  success: boolean
  error?: string
}

export async function upsertAgentConfig(input: UpsertConfigInput): Promise<UpsertConfigResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Ej inloggad' }

  // Verify ownership
  const { data: venue } = await supabase
    .from('venues')
    .select('owner_id')
    .eq('id', input.venueId)
    .single()

  if (!venue || venue.owner_id !== user.id) {
    return { success: false, error: 'Ingen behörighet' }
  }

  const record: Record<string, unknown> = { venue_id: input.venueId }
  if (input.pricingRules !== undefined) record.pricing_rules = input.pricingRules
  if (input.bookingParams !== undefined) record.booking_params = input.bookingParams
  if (input.eventTypes !== undefined) record.event_types = input.eventTypes
  if (input.policies !== undefined) record.policies = input.policies
  if (input.faqEntries !== undefined) record.faq_entries = input.faqEntries
  if (input.agentLanguage !== undefined) record.agent_language = input.agentLanguage
  if (input.agentEnabled !== undefined) record.agent_enabled = input.agentEnabled

  const { error } = await supabase
    .from('venue_agent_config')
    .upsert(record, { onConflict: 'venue_id' })

  if (error) {
    console.error('Failed to upsert agent config:', error)
    return { success: false, error: 'Kunde inte spara konfiguration' }
  }

  return { success: true }
}
```

**Step 4: Run tests, verify, commit**

```bash
npx vitest run src/__tests__/actions/agent-config.test.ts
git add src/actions/agent-config/ src/__tests__/actions/agent-config.test.ts
git commit -m "feat: add agent config server actions"
```

---

### Task 7: Agent Tool Implementations

**Files:**
- Create: `src/lib/agent/tools/check-availability.ts`
- Create: `src/lib/agent/tools/calculate-price.ts`
- Create: `src/lib/agent/tools/get-venue-info.ts`
- Create: `src/lib/agent/tools/propose-booking.ts`
- Create: `src/lib/agent/tools/escalate-to-owner.ts`
- Create: `src/lib/agent/tools/search-other-venues.ts`
- Create: `src/lib/agent/tools/index.ts`
- Create: `src/__tests__/lib/agent/tools/check-availability.test.ts`
- Create: `src/__tests__/lib/agent/tools/calculate-price.test.ts`

These are the 6 tools the Gemini agent can call. Each is a standalone function.

**Step 1: Write failing tests for `check-availability`**

Test cases:
- Returns `available: true` when date has no bookings or blocks
- Returns `available: false, reason: 'blocked'` when date is in `venue_blocked_dates`
- Returns `available: false, reason: 'booked'` when date has an accepted booking
- Returns `alternatives: [...]` with nearest 3 available dates when unavailable
- Rejects dates in the past

**Step 2: Implement `check-availability`**

```ts
// src/lib/agent/tools/check-availability.ts
import type { SupabaseClient } from '@supabase/supabase-js'

interface CheckAvailabilityArgs {
  date: string // YYYY-MM-DD
  startTime?: string
  endTime?: string
}

interface AvailabilityResult {
  available: boolean
  reason?: 'blocked' | 'booked' | 'past_date' | 'too_soon' | 'too_far'
  alternatives?: string[] // nearest available dates
}

export async function checkAvailability(
  supabase: SupabaseClient,
  venueId: string,
  args: CheckAvailabilityArgs
): Promise<AvailabilityResult> {
  const { date } = args

  // Check if date is in the past
  const today = new Date().toISOString().split('T')[0]
  if (date < today) {
    return { available: false, reason: 'past_date' }
  }

  // Check blocked dates
  const { data: blocked } = await supabase
    .from('venue_blocked_dates')
    .select('id')
    .eq('venue_id', venueId)
    .eq('date', date)
    .limit(1)

  if (blocked && blocked.length > 0) {
    const alternatives = await findAlternatives(supabase, venueId, date)
    return { available: false, reason: 'blocked', alternatives }
  }

  // Check existing accepted/pending bookings
  const { data: bookings } = await supabase
    .from('booking_requests')
    .select('id')
    .eq('venue_id', venueId)
    .eq('event_date', date)
    .in('status', ['pending', 'accepted'])
    .limit(1)

  if (bookings && bookings.length > 0) {
    const alternatives = await findAlternatives(supabase, venueId, date)
    return { available: false, reason: 'booked', alternatives }
  }

  return { available: true }
}

async function findAlternatives(
  supabase: SupabaseClient,
  venueId: string,
  targetDate: string,
  count: number = 3
): Promise<string[]> {
  // Check dates around the target (±14 days), excluding blocked/booked
  const alternatives: string[] = []
  const target = new Date(targetDate)

  for (let offset = 1; offset <= 30 && alternatives.length < count; offset++) {
    for (const dir of [1, -1]) {
      if (alternatives.length >= count) break
      const candidate = new Date(target)
      candidate.setDate(candidate.getDate() + offset * dir)
      const candidateStr = candidate.toISOString().split('T')[0]

      if (candidateStr < new Date().toISOString().split('T')[0]) continue

      const { data: blocked } = await supabase
        .from('venue_blocked_dates')
        .select('id')
        .eq('venue_id', venueId)
        .eq('date', candidateStr)
        .limit(1)

      const { data: booked } = await supabase
        .from('booking_requests')
        .select('id')
        .eq('venue_id', venueId)
        .eq('event_date', candidateStr)
        .in('status', ['pending', 'accepted'])
        .limit(1)

      if ((!blocked || blocked.length === 0) && (!booked || booked.length === 0)) {
        alternatives.push(candidateStr)
      }
    }
  }

  return alternatives.sort()
}
```

**Step 3: Write failing tests for `calculate-price`**

Test cases:
- Calculates base price from hourly rate × duration
- Adds per-person cost when per-person rate is set
- Applies minimum spend
- Returns breakdown with platform fee (12%)
- Uses package price when package is selected
- Falls back to venue's existing price fields when no pricing rules configured

**Step 4: Implement `calculate-price`**

```ts
// src/lib/agent/tools/calculate-price.ts
import type { PricingRules, PriceBreakdown } from '@/types/agent-booking'
import { PLATFORM_FEE_RATE } from '@/lib/pricing'

interface CalculatePriceArgs {
  guestCount: number
  durationHours: number
  eventType: string
  packageName?: string
}

interface VenuePricing {
  price_per_hour: number | null
  price_half_day: number | null
  price_full_day: number | null
  price_evening: number | null
}

export function calculateAgentPrice(
  args: CalculatePriceArgs,
  pricingRules: PricingRules,
  venuePricing: VenuePricing
): PriceBreakdown {
  let basePrice = 0
  let perPersonCost = 0
  let packageCost = 0

  // Check if a specific package was requested
  if (args.packageName && pricingRules.packages) {
    const pkg = pricingRules.packages.find(
      p => p.name.toLowerCase() === args.packageName!.toLowerCase()
    )
    if (pkg) {
      packageCost = pkg.perPerson ? pkg.price * args.guestCount : pkg.price
    }
  }

  // Calculate base price from rules or venue defaults
  if (pricingRules.basePrice) {
    basePrice = pricingRules.basePrice
  } else {
    // Fall back to venue's existing price fields
    if (args.durationHours <= 4 && venuePricing.price_per_hour) {
      basePrice = venuePricing.price_per_hour * args.durationHours
    } else if (args.durationHours <= 5 && venuePricing.price_half_day) {
      basePrice = venuePricing.price_half_day
    } else if (args.durationHours <= 10 && venuePricing.price_full_day) {
      basePrice = venuePricing.price_full_day
    } else if (venuePricing.price_evening) {
      basePrice = venuePricing.price_evening
    } else if (venuePricing.price_per_hour) {
      basePrice = venuePricing.price_per_hour * args.durationHours
    }
  }

  // Per-person rate
  if (pricingRules.perPersonRate) {
    perPersonCost = pricingRules.perPersonRate * args.guestCount
  }

  let totalBeforeFee = basePrice + perPersonCost + packageCost

  // Apply minimum spend
  if (pricingRules.minimumSpend && totalBeforeFee < pricingRules.minimumSpend) {
    totalBeforeFee = pricingRules.minimumSpend
  }

  const platformFee = Math.round(totalBeforeFee * PLATFORM_FEE_RATE)
  const totalPrice = totalBeforeFee + platformFee

  return {
    basePrice,
    perPersonCost: perPersonCost || undefined,
    packageCost: packageCost || undefined,
    totalBeforeFee,
    platformFee,
    totalPrice,
  }
}
```

**Step 5: Implement remaining tools**

`get-venue-info.ts` — Looks up venue data + config FAQ entries by topic. Returns structured answer.

`propose-booking.ts` — Creates `agent_actions` row (type: `booking_approval`), updates conversation status to `waiting_for_owner`, dispatches notification.

`escalate-to-owner.ts` — Creates `agent_actions` row (type: `escalation`), updates conversation status to `waiting_for_owner`, dispatches notification.

`search-other-venues.ts` — Calls `parsePreferences` + `searchVenues` from existing pipeline, filters out current venue, returns top 3 with `generateExplanationsBatch`.

`index.ts` — Exports tool definitions in Gemini function declaration format + execution dispatcher.

```ts
// src/lib/agent/tools/index.ts
import type { FunctionDeclaration } from '@google/generative-ai'

export const AGENT_TOOL_DECLARATIONS: FunctionDeclaration[] = [
  {
    name: 'check_availability',
    description: 'Check if a specific date is available for booking at this venue. Returns availability status and alternative dates if unavailable.',
    parameters: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'Date to check in YYYY-MM-DD format' },
        startTime: { type: 'string', description: 'Optional start time in HH:MM format' },
        endTime: { type: 'string', description: 'Optional end time in HH:MM format' },
      },
      required: ['date'],
    },
  },
  {
    name: 'calculate_price',
    description: 'Calculate the price for an event at this venue based on guest count, duration, and event type.',
    parameters: {
      type: 'object',
      properties: {
        guestCount: { type: 'number', description: 'Number of guests' },
        durationHours: { type: 'number', description: 'Event duration in hours' },
        eventType: { type: 'string', description: 'Type of event (aw, konferens, fest, etc.)' },
        packageName: { type: 'string', description: 'Optional package name if the venue offers packages' },
      },
      required: ['guestCount', 'durationHours', 'eventType'],
    },
  },
  {
    name: 'get_venue_info',
    description: 'Look up specific information about this venue: parking, amenities, policies, FAQ, etc.',
    parameters: {
      type: 'object',
      properties: {
        topic: { type: 'string', description: 'What to look up: parking, amenities, policies, cancellation, catering, equipment, accessibility, location, or any specific question' },
      },
      required: ['topic'],
    },
  },
  {
    name: 'propose_booking',
    description: 'Send a complete booking proposal to the venue owner for approval. Only call this when you have all required information AND the customer has confirmed they want to proceed.',
    parameters: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'Event date YYYY-MM-DD' },
        startTime: { type: 'string', description: 'Start time HH:MM' },
        endTime: { type: 'string', description: 'End time HH:MM' },
        guestCount: { type: 'number', description: 'Number of guests' },
        eventType: { type: 'string', description: 'Event type' },
        price: { type: 'number', description: 'Calculated total price including platform fee' },
        extras: { type: 'array', items: { type: 'string' }, description: 'Any additional services or equipment requested' },
        customerNote: { type: 'string', description: 'Optional note from the customer' },
      },
      required: ['date', 'startTime', 'endTime', 'guestCount', 'eventType', 'price'],
    },
  },
  {
    name: 'escalate_to_owner',
    description: 'Escalate the conversation to the venue owner when the request is outside your authority or you are not confident in the answer.',
    parameters: {
      type: 'object',
      properties: {
        reason: { type: 'string', description: 'Why this needs owner input' },
        customerRequest: { type: 'string', description: 'Summary of what the customer wants' },
        context: { type: 'object', description: 'Additional context (budget, special requirements, etc.)' },
      },
      required: ['reason', 'customerRequest'],
    },
  },
  {
    name: 'search_other_venues',
    description: 'Search for alternative venues on Tryffle that match the customer needs. Use when the current venue cannot fulfill the request.',
    parameters: {
      type: 'object',
      properties: {
        requirements: { type: 'string', description: 'Natural language description of what the customer needs' },
      },
      required: ['requirements'],
    },
  },
]
```

**Step 6: Run tests, commit**

```bash
npx vitest run src/__tests__/lib/agent/tools/
git add src/lib/agent/tools/ src/__tests__/lib/agent/tools/
git commit -m "feat: implement agent tool definitions and logic"
```

---

### Task 8: Agent System Prompt Builder

**Files:**
- Create: `src/lib/agent/build-system-prompt.ts`

**Step 1: Implement the system prompt builder**

This function assembles the full system prompt from venue data, agent config, and calendar data.

```ts
// src/lib/agent/build-system-prompt.ts
import type { VenueAgentConfig } from '@/types/agent-booking'
import type {
  PricingRules, BookingParams, EventTypeConfig,
  PolicyConfig, FaqEntry
} from '@/types/agent-booking'

interface VenueData {
  name: string
  description: string | null
  area: string | null
  city: string
  address: string
  capacity_standing: number | null
  capacity_seated: number | null
  capacity_conference: number | null
  min_guests: number
  amenities: string[]
  venue_types: string[]
  vibes: string[]
  price_per_hour: number | null
  price_half_day: number | null
  price_full_day: number | null
  price_evening: number | null
  price_notes: string | null
  website: string | null
  contact_email: string | null
  contact_phone: string | null
}

interface CalendarData {
  blockedDates: string[]
  bookedDates: string[]
}

export function buildAgentSystemPrompt(
  venue: VenueData,
  config: VenueAgentConfig | null,
  calendar: CalendarData
): string {
  const language = config?.agent_language === 'en' ? 'en' : 'sv'
  const today = new Date().toISOString().split('T')[0]

  const pricingRules = (config?.pricing_rules ?? {}) as PricingRules
  const bookingParams = (config?.booking_params ?? {}) as BookingParams
  const eventTypes = (config?.event_types ?? []) as EventTypeConfig[]
  const policies = (config?.policies ?? {}) as PolicyConfig
  const faqEntries = (config?.faq_entries ?? []) as FaqEntry[]

  const sections: string[] = []

  // Identity and behavior
  if (language === 'sv') {
    sections.push(`Du är en AI-assistent för eventlokalen "${venue.name}" på Tryffle. Du svarar alltid på svenska.

BETEENDEREGLER:
- Du ska vara varm, kompetent och professionell — som en hjälpsam person på lokalen.
- Håll svar korta och koncisa. Överförklara inte.
- Bekräfta ALDRIG en bokning själv. Alla bokningar kräver godkännande från lokalägaren.
- Hitta ALDRIG på information. Om du inte vet svaret, eskalera till ägaren.
- Extrahera bokningsintention progressivt. Spåra vad du vet (antal gäster, datum, eventtyp) och föreslå bokning när du har tillräckligt.
- Om ett datum inte är tillgängligt eller en bokning nekas, föreslå alternativ.
- Pusha mot bokning när det är lämpligt, men var aldrig påträngande.

Dagens datum: ${today}`)
  } else {
    sections.push(`You are an AI assistant for the event venue "${venue.name}" on Tryffle. Always respond in English.

BEHAVIOR RULES:
- Be warm, competent, and professional — like a helpful person at the venue.
- Keep responses short and concise.
- NEVER confirm a booking yourself. All bookings require venue owner approval.
- NEVER invent information. If you don't know, escalate to the owner.
- Extract booking intent progressively. Track what you know and suggest a booking when you have enough.
- If a date is unavailable or a booking is declined, suggest alternatives.
- Nudge toward booking when appropriate but never be pushy.

Today's date: ${today}`)
  }

  // Venue profile
  const venueInfo = [
    `Namn: ${venue.name}`,
    `Plats: ${venue.area ? `${venue.area}, ` : ''}${venue.city}`,
    `Adress: ${venue.address}`,
  ]
  if (venue.description) venueInfo.push(`Beskrivning: ${venue.description}`)

  const capacities: string[] = []
  if (venue.capacity_standing) capacities.push(`${venue.capacity_standing} stående`)
  if (venue.capacity_seated) capacities.push(`${venue.capacity_seated} sittande`)
  if (venue.capacity_conference) capacities.push(`${venue.capacity_conference} konferens`)
  if (capacities.length > 0) venueInfo.push(`Kapacitet: ${capacities.join(', ')}`)
  if (venue.min_guests > 1) venueInfo.push(`Minsta antal gäster: ${venue.min_guests}`)

  if (venue.amenities?.length) venueInfo.push(`Faciliteter: ${venue.amenities.join(', ')}`)
  if (venue.venue_types?.length) venueInfo.push(`Passar för: ${venue.venue_types.join(', ')}`)
  if (venue.vibes?.length) venueInfo.push(`Känsla: ${venue.vibes.join(', ')}`)

  sections.push(`\nLOKALINFORMATION:\n${venueInfo.join('\n')}`)

  // Pricing
  const priceLines: string[] = []
  if (pricingRules.basePrice) priceLines.push(`Grundpris: ${pricingRules.basePrice} kr`)
  if (pricingRules.perPersonRate) priceLines.push(`Per person: ${pricingRules.perPersonRate} kr`)
  if (pricingRules.minimumSpend) priceLines.push(`Minimibelopp: ${pricingRules.minimumSpend} kr`)
  if (pricingRules.packages?.length) {
    priceLines.push('Paket:')
    for (const pkg of pricingRules.packages) {
      priceLines.push(`  - ${pkg.name}: ${pkg.price} kr${pkg.perPerson ? '/person' : ''} — ${pkg.description}`)
    }
  }
  // Fallback to venue prices
  if (priceLines.length === 0) {
    if (venue.price_per_hour) priceLines.push(`${venue.price_per_hour} kr/timme`)
    if (venue.price_half_day) priceLines.push(`${venue.price_half_day} kr halvdag`)
    if (venue.price_full_day) priceLines.push(`${venue.price_full_day} kr heldag`)
    if (venue.price_evening) priceLines.push(`${venue.price_evening} kr kväll`)
  }
  if (venue.price_notes) priceLines.push(`OBS: ${venue.price_notes}`)
  if (pricingRules.notes) priceLines.push(`OBS: ${pricingRules.notes}`)
  if (priceLines.length > 0) sections.push(`\nPRISER:\n${priceLines.join('\n')}\nPlattformsavgift (12%) tillkommer på alla priser.`)

  // Booking parameters
  if (Object.keys(bookingParams).length > 0) {
    const paramLines: string[] = []
    if (bookingParams.minGuests) paramLines.push(`Min gäster: ${bookingParams.minGuests}`)
    if (bookingParams.maxGuests) paramLines.push(`Max gäster: ${bookingParams.maxGuests}`)
    if (bookingParams.minDurationHours) paramLines.push(`Min bokningstid: ${bookingParams.minDurationHours}h`)
    if (bookingParams.maxDurationHours) paramLines.push(`Max bokningstid: ${bookingParams.maxDurationHours}h`)
    if (bookingParams.minAdvanceDays) paramLines.push(`Boka minst ${bookingParams.minAdvanceDays} dagar i förväg`)
    if (bookingParams.maxAdvanceMonths) paramLines.push(`Boka max ${bookingParams.maxAdvanceMonths} månader i förväg`)
    if (paramLines.length > 0) sections.push(`\nBOKNINGSREGLER:\n${paramLines.join('\n')}`)
  }

  // Event types
  if (eventTypes.length > 0) {
    const typeLines = eventTypes.map(t => {
      const statusMap = { welcome: '✓ Välkomna', declined: '✗ Avböjs', ask_owner: '? Fråga ägaren' }
      return `  ${t.label}: ${statusMap[t.status]}${t.note ? ` (${t.note})` : ''}`
    })
    sections.push(`\nEVENTTYPER:\n${typeLines.join('\n')}\nOm eventtypen har status "Fråga ägaren" — eskalera med escalate_to_owner.`)
  }

  // Policies
  const policyLines: string[] = []
  if (policies.cancellation) policyLines.push(`Avbokning: ${policies.cancellation}`)
  if (policies.deposit) policyLines.push(`Deposition: ${policies.deposit}`)
  if (policies.houseRules) policyLines.push(`Regler: ${policies.houseRules}`)
  if (policyLines.length > 0) sections.push(`\nPOLICYER:\n${policyLines.join('\n')}`)

  // FAQ
  if (faqEntries.length > 0) {
    const faqLines = faqEntries.map(f => `F: ${f.question}\nS: ${f.answer}`)
    sections.push(`\nVANLIGA FRÅGOR:\n${faqLines.join('\n\n')}`)
  }

  // Calendar
  const blockedStr = calendar.blockedDates.length > 0
    ? calendar.blockedDates.join(', ')
    : 'Inga blockerade datum'
  const bookedStr = calendar.bookedDates.length > 0
    ? calendar.bookedDates.join(', ')
    : 'Inga bokade datum'
  sections.push(`\nKALENDER (kommande 3 månader):\nBlockerade: ${blockedStr}\nBokade: ${bookedStr}\nAnvänd check_availability-verktyget för att verifiera tillgänglighet.`)

  // Escalation rules
  sections.push(`\nESKALERINGSREGLER — Använd escalate_to_owner om:
- Antal gäster överstiger listad kapacitet
- Kunden vill ha något lokalen inte erbjuder (t.ex. boende, specialcatering)
- Eventtyp som inte finns listad eller har status "Fråga ägaren"
- Kunden förhandlar pris utanför dina ramar
- Flerdags- eller ovanligt komplexa event
- Kunden uttryckligen ber om att prata med ägaren
- Du är inte säker på svaret`)

  return sections.join('\n')
}
```

**Step 2: Commit**

```bash
git add src/lib/agent/build-system-prompt.ts
git commit -m "feat: implement agent system prompt builder"
```

---

### Task 9: Agent Conversation Management

**Files:**
- Create: `src/lib/agent/conversation.ts`

Server-side functions for managing agent conversations. These use the service-role Supabase client since conversations may be created by anonymous users via the API route.

**Step 1: Implement conversation management**

```ts
// src/lib/agent/conversation.ts
import { createServiceClient } from '@/lib/supabase/service'
import type { AgentConversation, AgentConversationMessage } from '@/types/agent-booking'

export async function getOrCreateConversation(
  venueId: string,
  conversationId?: string,
  customerId?: string
): Promise<{ conversation: AgentConversation; isNew: boolean }> {
  const supabase = createServiceClient()

  // Try to resume existing conversation
  if (conversationId) {
    const { data } = await supabase
      .from('agent_conversations')
      .select('*')
      .eq('id', conversationId)
      .eq('venue_id', venueId)
      .gt('expires_at', new Date().toISOString())
      .neq('status', 'expired')
      .single()

    if (data) return { conversation: data, isNew: false }
  }

  // Check for existing active conversation for this customer+venue
  if (customerId) {
    const { data } = await supabase
      .from('agent_conversations')
      .select('*')
      .eq('venue_id', venueId)
      .eq('customer_id', customerId)
      .eq('status', 'active')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (data) return { conversation: data, isNew: false }
  }

  // Create new conversation
  const { data, error } = await supabase
    .from('agent_conversations')
    .insert({
      venue_id: venueId,
      customer_id: customerId ?? null,
      status: 'active',
      messages: [],
      collected_booking_data: {},
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .select('*')
    .single()

  if (error || !data) throw new Error('Failed to create conversation')
  return { conversation: data, isNew: true }
}

export async function updateConversation(
  conversationId: string,
  updates: {
    messages?: AgentConversationMessage[]
    status?: string
    collectedBookingData?: Record<string, unknown>
    tier?: number | null
  }
): Promise<void> {
  const supabase = createServiceClient()

  const record: Record<string, unknown> = {}
  if (updates.messages !== undefined) record.messages = updates.messages
  if (updates.status !== undefined) record.status = updates.status
  if (updates.collectedBookingData !== undefined) record.collected_booking_data = updates.collectedBookingData
  if (updates.tier !== undefined) record.tier = updates.tier

  const { error } = await supabase
    .from('agent_conversations')
    .update(record)
    .eq('id', conversationId)

  if (error) throw new Error('Failed to update conversation')
}

export async function linkConversationToCustomer(
  conversationId: string,
  customerId: string
): Promise<void> {
  const supabase = createServiceClient()
  await supabase
    .from('agent_conversations')
    .update({ customer_id: customerId })
    .eq('id', conversationId)
    .is('customer_id', null)
}
```

**Step 2: Commit**

```bash
git add src/lib/agent/conversation.ts
git commit -m "feat: add agent conversation management"
```

---

### Task 10: Venue Agent API Route

**Files:**
- Create: `src/app/api/venue-agent/route.ts`

This is the main API endpoint for the AI booking agent.

**Step 1: Implement the API route**

```ts
// src/app/api/venue-agent/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { genAI } from '@/lib/gemini/client'
import { withRetry } from '@/lib/gemini/retry'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { buildAgentSystemPrompt } from '@/lib/agent/build-system-prompt'
import { getOrCreateConversation, updateConversation } from '@/lib/agent/conversation'
import { AGENT_TOOL_DECLARATIONS } from '@/lib/agent/tools'
import { executeAgentTool } from '@/lib/agent/tools/execute'
import type { AgentConversationMessage } from '@/types/agent-booking'

const RATE_LIMIT_CONFIG = { limit: 30, windowMs: 60 * 60 * 1000 } // 30/hour

interface VenueAgentRequest {
  conversationId?: string
  venueId: string
  message: string
}

export async function POST(request: NextRequest) {
  try {
    // Rate limit
    const rateLimitResult = await rateLimit('venue-agent', RATE_LIMIT_CONFIG)
    if (!rateLimitResult.success) {
      return NextResponse.json({ error: 'För många meddelanden. Försök igen om en stund.' }, { status: 429 })
    }

    const body: VenueAgentRequest = await request.json()
    const { venueId, message, conversationId: inputConversationId } = body

    if (!venueId || !message || message.length > 5000) {
      return NextResponse.json({ error: 'Ogiltigt meddelande' }, { status: 400 })
    }

    // Get current user (optional — anonymous allowed)
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const serviceClient = createServiceClient()

    // Fetch venue + config + calendar
    const { data: venue } = await serviceClient
      .from('venues')
      .select('*')
      .eq('id', venueId)
      .eq('status', 'published')
      .single()

    if (!venue) {
      return NextResponse.json({ error: 'Lokal hittades inte' }, { status: 404 })
    }

    const { data: config } = await serviceClient
      .from('venue_agent_config')
      .select('*')
      .eq('venue_id', venueId)
      .eq('agent_enabled', true)
      .single()

    if (!config) {
      return NextResponse.json({ error: 'AI-agent ej aktiverad för denna lokal' }, { status: 400 })
    }

    // Get calendar data (next 3 months)
    const threeMonthsFromNow = new Date()
    threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3)
    const calendarEnd = threeMonthsFromNow.toISOString().split('T')[0]
    const today = new Date().toISOString().split('T')[0]

    const [blockedRes, bookedRes] = await Promise.all([
      serviceClient
        .from('venue_blocked_dates')
        .select('date')
        .eq('venue_id', venueId)
        .gte('date', today)
        .lte('date', calendarEnd),
      serviceClient
        .from('booking_requests')
        .select('event_date')
        .eq('venue_id', venueId)
        .in('status', ['pending', 'accepted'])
        .gte('event_date', today)
        .lte('event_date', calendarEnd),
    ])

    const calendar = {
      blockedDates: (blockedRes.data ?? []).map(d => d.date),
      bookedDates: (bookedRes.data ?? []).map(d => d.event_date),
    }

    // Get or create conversation
    const { conversation, isNew } = await getOrCreateConversation(
      venueId, inputConversationId, user?.id
    )

    // Build system prompt
    const systemPrompt = buildAgentSystemPrompt(venue, config, calendar)

    // Append user message
    const existingMessages = (conversation.messages ?? []) as AgentConversationMessage[]
    const userMsg: AgentConversationMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
    }
    const updatedMessages = [...existingMessages, userMsg]

    // Build Gemini contents from conversation history
    const geminiContents = [
      { role: 'user' as const, parts: [{ text: systemPrompt }] },
      { role: 'model' as const, parts: [{ text: 'Förstått. Jag hjälper gärna till.' }] },
      ...updatedMessages
        .filter(m => m.role !== 'system')
        .slice(-50) // Cap at last 50 messages
        .map(m => ({
          role: (m.role === 'user' ? 'user' : 'model') as 'user' | 'model',
          parts: [{ text: m.content }],
        })),
    ]

    // Call Gemini with tools
    if (!genAI) {
      return NextResponse.json({ error: 'AI ej konfigurerad' }, { status: 500 })
    }

    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      tools: [{ functionDeclarations: AGENT_TOOL_DECLARATIONS }],
    })

    let result = await withRetry(() => model.generateContent({ contents: geminiContents }))
    let response = result.response
    let responseText = ''
    let bookingSummary = null
    const allMessages = [...updatedMessages]

    // Handle tool calls (may chain multiple)
    let maxToolCalls = 5
    while (maxToolCalls > 0) {
      const candidate = response.candidates?.[0]
      const parts = candidate?.content?.parts ?? []

      const functionCall = parts.find(p => 'functionCall' in p)?.functionCall
      if (!functionCall) {
        // No tool call — extract text response
        responseText = parts.map(p => ('text' in p ? p.text : '')).join('')
        break
      }

      // Execute tool
      const toolResult = await executeAgentTool(
        functionCall.name,
        functionCall.args as Record<string, unknown>,
        { venueId, conversationId: conversation.id, customerId: user?.id, serviceClient, venue, config }
      )

      // Record tool call and result in messages
      const toolMsg: AgentConversationMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        role: 'system',
        content: `Tool: ${functionCall.name}`,
        tool_calls: [{ name: functionCall.name, args: functionCall.args as Record<string, unknown> }],
        tool_results: [{ name: functionCall.name, result: toolResult }],
        timestamp: new Date().toISOString(),
      }
      allMessages.push(toolMsg)

      // Check for booking summary in tool result
      if (functionCall.name === 'propose_booking' && toolResult.success) {
        bookingSummary = toolResult.summary
      }

      // Send tool result back to Gemini
      const toolResponseContents = [
        ...geminiContents,
        { role: 'model' as const, parts },
        {
          role: 'user' as const,
          parts: [{
            functionResponse: {
              name: functionCall.name,
              response: toolResult,
            },
          }],
        },
      ]

      result = await withRetry(() => model.generateContent({ contents: toolResponseContents }))
      response = result.response
      maxToolCalls--
    }

    // Build agent response message
    const agentMsg: AgentConversationMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      role: 'agent',
      content: responseText,
      timestamp: new Date().toISOString(),
    }
    allMessages.push(agentMsg)

    // Update conversation in DB
    await updateConversation(conversation.id, { messages: allMessages })

    return NextResponse.json({
      conversationId: conversation.id,
      message: responseText,
      bookingSummary,
      status: conversation.status,
    })
  } catch (error) {
    console.error('Venue agent error:', error)
    return NextResponse.json({ error: 'Ett oväntat fel uppstod' }, { status: 500 })
  }
}
```

**Step 2: Create tool executor**

```ts
// src/lib/agent/tools/execute.ts
import type { SupabaseClient } from '@supabase/supabase-js'
import { checkAvailability } from './check-availability'
import { calculateAgentPrice } from './calculate-price'
import { getVenueInfo } from './get-venue-info'
import { proposeBooking } from './propose-booking'
import { escalateToOwner } from './escalate-to-owner'
import { searchOtherVenues } from './search-other-venues'
import type { VenueAgentConfig } from '@/types/agent-booking'
import type { PricingRules } from '@/types/agent-booking'

interface ToolContext {
  venueId: string
  conversationId: string
  customerId?: string
  serviceClient: SupabaseClient
  venue: Record<string, unknown>
  config: VenueAgentConfig
}

export async function executeAgentTool(
  name: string,
  args: Record<string, unknown>,
  context: ToolContext
): Promise<Record<string, unknown>> {
  switch (name) {
    case 'check_availability':
      return checkAvailability(context.serviceClient, context.venueId, args as any)

    case 'calculate_price':
      return calculateAgentPrice(
        args as any,
        (context.config.pricing_rules ?? {}) as PricingRules,
        context.venue as any
      )

    case 'get_venue_info':
      return getVenueInfo(context.venue, context.config, args as any)

    case 'propose_booking':
      return proposeBooking(context.serviceClient, {
        venueId: context.venueId,
        conversationId: context.conversationId,
        customerId: context.customerId,
        args: args as any,
      })

    case 'escalate_to_owner':
      return escalateToOwner(context.serviceClient, {
        venueId: context.venueId,
        conversationId: context.conversationId,
        customerId: context.customerId,
        args: args as any,
      })

    case 'search_other_venues':
      return searchOtherVenues(args.requirements as string, context.venueId)

    default:
      return { error: `Unknown tool: ${name}` }
  }
}
```

**Step 3: Commit**

```bash
git add src/app/api/venue-agent/ src/lib/agent/tools/execute.ts
git commit -m "feat: implement venue agent API route with tool execution"
```

---

### Task 11: Agent Action Server Actions

**Files:**
- Create: `src/actions/agent-actions/approve-action.ts`
- Create: `src/actions/agent-actions/decline-action.ts`
- Create: `src/actions/agent-actions/modify-action.ts`
- Create: `src/actions/agent-actions/reply-to-escalation.ts`
- Create: `src/actions/agent-actions/get-actions.ts`

These are the server actions for the venue owner action feed.

**Step 1: Implement `get-actions`**

Fetches action cards for a venue or across all venues for an owner. Supports status filtering.

**Step 2: Implement `approve-action`**

1. Load the action + conversation
2. Call `createBookingRequest` with the collected booking data from the action summary
3. Update action status to 'approved', set `booking_request_id` and `resolved_at`
4. Update conversation status to 'completed'
5. Dispatch notification to customer
6. Broadcast update on Supabase Realtime channel `agent:{conversationId}`

**Step 3: Implement `decline-action`**

1. Update action status to 'declined', set `resolved_at`
2. Optionally store decline reason in `owner_response`
3. Update conversation status back to 'active'
4. Broadcast update so agent can relay to customer

**Step 4: Implement `modify-action`**

1. Create new `agent_actions` row with type 'counter_offer'
2. Store modification details in summary (new price, new date, note)
3. Update original action status to 'modified'
4. Dispatch notification to customer
5. Broadcast update on agent channel

**Step 5: Implement `reply-to-escalation`**

1. Store owner's response text in `owner_response`
2. Update action status to 'approved' (responded)
3. Update conversation — inject owner response into context
4. Set conversation status back to 'active'
5. Broadcast update so agent has new context for next customer message

**Step 6: Commit**

```bash
git add src/actions/agent-actions/
git commit -m "feat: add agent action server actions (approve/decline/modify/reply)"
```

---

### Task 12: Venue Agent Chat Component

**Files:**
- Create: `src/components/agent/venue-agent-chat.tsx`
- Create: `src/components/agent/booking-summary-card.tsx`
- Create: `src/components/agent/agent-status-indicator.tsx`
- Create: `src/hooks/use-agent-chat.ts`

**Step 1: Create the `useAgentChat` hook**

Similar pattern to `useRealtimeChat` but calls `/api/venue-agent` instead. Manages conversation ID, message history, loading state, and Supabase Broadcast subscription for owner responses.

```ts
// src/hooks/use-agent-chat.ts
// Key differences from useRealtimeChat:
// - Calls /api/venue-agent POST for each message
// - Stores conversationId in state + localStorage for persistence
// - Subscribes to Supabase Broadcast channel `agent:{conversationId}` for owner responses
// - Handles booking summary cards in message stream
```

**Step 2: Create `VenueAgentChat` component**

Based on the existing `VenueAssistant` layout (floating bottom-right, same styling). Key additions:
- Persistent: restores conversation from `agent_conversations` on mount
- Booking summary card renders inline when agent proposes booking
- Status indicator when waiting for owner response
- Auth prompt when booking requires sign-in

**Step 3: Create `BookingSummaryCard` component**

Inline card showing event details + price + "Skicka till lokalen" / "Ändra något" buttons.

**Step 4: Commit**

```bash
git add src/components/agent/ src/hooks/use-agent-chat.ts
git commit -m "feat: add VenueAgentChat component and useAgentChat hook"
```

---

### Task 13: Integrate Agent Chat on Venue Page

**Files:**
- Modify: `src/app/(public)/venues/[slug]/page.tsx`

**Step 1: Conditionally render `VenueAgentChat` or `VenueAssistant`**

In `VenueDetailContent`, fetch the venue's agent config. If `agent_enabled` is true, render `VenueAgentChat`. Otherwise, keep the existing `VenueAssistant`.

```tsx
// In the venue detail page query, add:
const { data: agentConfig } = await supabase
  .from('venue_agent_config')
  .select('agent_enabled')
  .eq('venue_id', venue.id)
  .eq('agent_enabled', true)
  .single()

// In the render:
{agentConfig?.agent_enabled ? (
  <VenueAgentChat venue={venueContext} />
) : (
  <VenueAssistant venue={venueContext} />
)}
```

**Step 2: Commit**

```bash
git add src/app/(public)/venues/[slug]/page.tsx
git commit -m "feat: conditionally render AI agent chat on venue pages"
```

---

### Task 14: Action Feed Components

**Files:**
- Create: `src/components/agent/action-card.tsx`
- Create: `src/components/agent/action-card-booking.tsx`
- Create: `src/components/agent/action-card-escalation.tsx`
- Create: `src/components/agent/action-card-counter-offer.tsx`
- Create: `src/components/agent/action-feed.tsx`
- Create: `src/components/agent/modify-dialog.tsx`
- Create: `src/components/agent/reply-dialog.tsx`

**Step 1: Create base `ActionCard` component**

Shared card wrapper with status badge, timestamp, venue name (for aggregated view).

**Step 2: Create `ActionCardBooking`**

Renders Tier 2 approval card: event details, pricing, customer info, Approve/Decline/Modify buttons. Calls `approveAction`, `declineAction`, or opens `ModifyDialog`.

**Step 3: Create `ActionCardEscalation`**

Renders Tier 3 escalation card: customer request, escalation reasons, Reply/Decline buttons. Opens `ReplyDialog` on Reply.

**Step 4: Create `ActionCardCounterOffer`**

Renders counter-offer response card: shows what was proposed and customer's response. Approve booking button if customer accepted.

**Step 5: Create `ActionFeed`**

List component with tab filtering (Att göra / Alla / Godkända / Avböjda), venue filter for aggregated view. Real-time subscription on Supabase Broadcast channel `actions:{venueId}`.

**Step 6: Commit**

```bash
git add src/components/agent/
git commit -m "feat: add action feed components (cards, feed, dialogs)"
```

---

### Task 15: Action Feed Pages

**Files:**
- Create: `src/app/(public)/dashboard/venue/[id]/actions/page.tsx`
- Create: `src/app/(public)/dashboard/actions/page.tsx`

**Step 1: Create per-venue action feed page**

Server component that fetches venue ownership, initial actions, renders `ActionFeed` with `venueId` prop.

**Step 2: Create aggregated action feed page**

Server component that fetches all venues for owner, initial actions across all venues, renders `ActionFeed` with venue filter.

**Step 3: Commit**

```bash
git add src/app/(public)/dashboard/venue/[id]/actions/ src/app/(public)/dashboard/actions/
git commit -m "feat: add action feed pages (per-venue and aggregated)"
```

---

### Task 16: Update Dashboard Navigation

**Files:**
- Modify: `src/components/dashboard/nav-items.ts`
- Modify: `src/components/dashboard/venue-nav.tsx`

**Step 1: Add "Åtgärder" to top-level nav**

```ts
// nav-items.ts — add before Inkorg:
{ href: '/dashboard/actions', label: 'Åtgärder' },
```

**Step 2: Add "Agent" and "Åtgärder" to venue sub-nav**

```ts
// venue-nav.tsx — add to NAV_ITEMS:
{ path: '/actions', label: 'Åtgärder' },
{ path: '/agent', label: 'Agent' },
```

**Step 3: Commit**

```bash
git add src/components/dashboard/nav-items.ts src/components/dashboard/venue-nav.tsx
git commit -m "feat: add agent and actions to dashboard navigation"
```

---

### Task 17: Venue Agent Configuration Page

**Files:**
- Create: `src/app/(public)/dashboard/venue/[id]/agent/page.tsx`

**Step 1: Build the configuration page**

Client component with progressive disclosure sections matching the design:
1. Prissättning (pricing) — pre-filled from venue data
2. Bokningsregler (booking params) — pre-filled from venue data
3. Eventtyper — pre-filled from venue types
4. Policyer — free text fields
5. Vanliga frågor — add/remove Q&A pairs
6. Agentinställningar — language toggle, enable/disable

Calls `getAgentConfig` on mount to load existing config. Calls `upsertAgentConfig` on save. Pre-populates from venue data when config doesn't exist yet.

**Step 2: Commit**

```bash
git add src/app/(public)/dashboard/venue/[id]/agent/
git commit -m "feat: add venue agent configuration page"
```

---

### Task 18: Action Feed Badge Count

**Files:**
- Modify: `src/components/dashboard/dashboard-nav.tsx` (or wherever the nav badge is rendered)

**Step 1: Add pending action count to nav badge**

Create a server action `getPendingActionCount(ownerVenueIds)` that counts `agent_actions` with `status = 'pending'`. Display as a badge next to "Åtgärder" in the nav. Use Supabase Realtime to update in real-time.

**Step 2: Commit**

```bash
git add src/components/dashboard/ src/actions/agent-actions/
git commit -m "feat: add pending action badge count to dashboard nav"
```

---

### Task 19: Notification Types and Routing

**Files:**
- Modify: `src/lib/notifications/create-notification.ts` (if needed)
- Modify: `src/components/notifications/notification-bell.tsx` — add routing for `agent_action` entity type

**Step 1: Add notification routing**

In `getNotificationUrl`, add routing for `agent_action` entity type:
- Route to `/dashboard/actions` (or per-venue if venue context available from metadata)

**Step 2: Commit**

```bash
git add src/components/notifications/ src/lib/notifications/
git commit -m "feat: add agent action notification routing"
```

---

### Task 20: Agent Action Email Notifications

**Files:**
- Create: `supabase/functions/notify-agent-action/index.ts`
- Modify: `supabase/functions/_shared/email-templates.ts`

**Step 1: Create email template**

Add `agentBookingApprovalEmail` and `agentEscalationEmail` templates to `email-templates.ts`. Short, actionable emails with a direct link to the action card.

**Step 2: Create edge function**

Follow the existing pattern (`notify-booking-request` as reference):
- Deno.serve
- Parse webhook payload (INSERT on `agent_actions` table)
- Fetch venue owner email
- Send email via Resend
- Link to `/dashboard/actions`

**Step 3: Register the webhook trigger in Supabase**

Note: This requires setting up a database webhook or trigger in Supabase dashboard pointing to the new edge function for `agent_actions` INSERT events.

**Step 4: Commit**

```bash
git add supabase/functions/notify-agent-action/ supabase/functions/_shared/email-templates.ts
git commit -m "feat: add agent action email notification edge function"
```

---

### Task 21: Conversation Cleanup Cron

**Files:**
- Modify: `src/app/api/cron/cleanup-sessions/route.ts`

**Step 1: Add agent conversation cleanup**

Extend the existing session cleanup cron to also expire `agent_conversations` where `expires_at < now()`:

```ts
// Add to existing cleanup-sessions route:
await supabase
  .from('agent_conversations')
  .update({ status: 'expired' })
  .lt('expires_at', new Date().toISOString())
  .neq('status', 'expired')

// Also expire pending agent_actions older than 14 days
await supabase
  .from('agent_actions')
  .update({ status: 'expired' })
  .eq('status', 'pending')
  .lt('created_at', new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString())
```

**Step 2: Commit**

```bash
git add src/app/api/cron/cleanup-sessions/
git commit -m "feat: add agent conversation and action cleanup to cron"
```

---

### Task 22: Cross-Venue Suggestion Cards

**Files:**
- Create: `src/components/agent/venue-suggestion-card.tsx`

**Step 1: Create mini venue card**

Small card for inline chat display: venue name, primary photo (thumbnail), capacity range, price range, match reason. Clicking opens venue in new tab.

**Step 2: Integrate with `VenueAgentChat`**

When agent response includes venue suggestions (from `search_other_venues` tool), render suggestion cards inline in the chat.

**Step 3: Commit**

```bash
git add src/components/agent/venue-suggestion-card.tsx
git commit -m "feat: add cross-venue suggestion cards for agent chat"
```

---

### Task 23: Rate Limiting Updates

**Files:**
- Modify: `src/lib/rate-limit.ts`

**Step 1: Add venue agent rate limit config**

```ts
// Add to RATE_LIMITS:
venueAgent: { limit: 30, windowMs: 60 * 60 * 1000 }, // 30 messages/hour
```

**Step 2: Commit**

```bash
git add src/lib/rate-limit.ts
git commit -m "feat: add venue agent rate limit configuration"
```

---

### Task 24: Integration Testing & Polish

**Files:**
- Create: `src/__tests__/lib/agent/build-system-prompt.test.ts`
- Create: `src/__tests__/lib/agent/conversation.test.ts`

**Step 1: Write integration tests for system prompt builder**

Test that the prompt correctly includes/excludes sections based on config completeness.

**Step 2: Write integration tests for conversation management**

Test get/create/update/link flows.

**Step 3: Manual end-to-end testing checklist**

- [ ] Agent answers Tier 1 questions (availability, pricing, amenities)
- [ ] Agent assembles booking → action card appears
- [ ] Venue owner approves → booking created
- [ ] Venue owner declines → agent suggests alternatives
- [ ] Venue owner modifies → counter-offer sent
- [ ] Tier 3 escalation → owner replies → agent continues
- [ ] Cross-venue suggestions render in chat
- [ ] Anonymous → authenticated transition works
- [ ] Conversation persists on page refresh
- [ ] Action feed real-time updates work
- [ ] Email notifications sent for new actions
- [ ] Agent config page saves and loads correctly
- [ ] Non-agent venues still show old VenueAssistant

**Step 4: Commit**

```bash
git add src/__tests__/
git commit -m "test: add agent system prompt and conversation tests"
```

---

## Task Dependencies

```
Task 1 (Vitest) → independent, do first
Tasks 2-4 (Migrations) → sequential (each depends on previous for FK references)
Task 5 (Types) → depends on Tasks 2-4
Task 6 (Config actions) → depends on Task 5
Task 7 (Tool implementations) → depends on Task 5
Task 8 (System prompt) → depends on Task 5
Task 9 (Conversation mgmt) → depends on Task 5
Task 10 (API route) → depends on Tasks 7, 8, 9
Task 11 (Action server actions) → depends on Tasks 5, 10
Task 12 (Chat component) → depends on Task 10
Task 13 (Venue page integration) → depends on Task 12
Task 14 (Action feed components) → depends on Task 11
Task 15 (Action feed pages) → depends on Task 14
Task 16 (Nav updates) → depends on Tasks 15, 17
Task 17 (Config page) → depends on Task 6
Task 18 (Badge count) → depends on Tasks 14, 16
Task 19 (Notification routing) → depends on Task 11
Task 20 (Email edge function) → depends on Task 4
Task 21 (Cron cleanup) → depends on Tasks 2, 3, 4
Task 22 (Venue suggestion cards) → depends on Task 12
Task 23 (Rate limiting) → independent
Task 24 (Testing) → depends on all above
```

## Parallelizable Groups

These tasks can be worked on simultaneously by independent subagents:

**Group A (Infrastructure):** Tasks 1, 2, 3, 4, 23
**Group B (After migrations):** Tasks 5, 20, 21
**Group C (Core engine):** Tasks 6, 7, 8, 9 (after Task 5)
**Group D (API + Actions):** Tasks 10, 11 (after Group C)
**Group E (Customer UI):** Tasks 12, 13, 22 (after Task 10)
**Group F (Owner UI):** Tasks 14, 15, 16, 17, 18 (after Task 11)
**Group G (Notifications):** Task 19 (after Task 11)
**Group H (Testing):** Task 24 (after all)
