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
  blockedWeekdays?: number[]
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
