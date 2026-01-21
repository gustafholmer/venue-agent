export type AgentState = 'idle' | 'parsing' | 'searching' | 'presenting' | 'refining' | 'booking'

export type SuggestionType = 'date' | 'startTime' | 'endTime' | 'eventType' | 'guestCount'

export interface Suggestion {
  type: SuggestionType
  value: string | number
  label: string  // Human-readable display text
}

export interface AgentMessage {
  id: string
  role: 'user' | 'agent'
  content: string
  venues?: VenueResult[]
  suggestions?: Suggestion[]
  timestamp: Date
}

export interface VenueResult {
  id: string
  name: string
  slug: string
  area: string
  price: number
  capacity: number
  availableDates?: string[]
  matchReason?: string
  imageUrl?: string
}

export interface AgentSession {
  id: string
  state: AgentState
  requirements: Record<string, unknown>
  messages: AgentMessage[]
}

export interface AgentResponse {
  message: string
  venues?: VenueResult[]
  state: AgentState
  requirements: Record<string, unknown>
}
