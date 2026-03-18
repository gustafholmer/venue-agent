'use server'

import { logger } from '@/lib/logger'

import { createServiceClient } from '@/lib/supabase/service'
import { parsePreferences } from '@/lib/gemini/parse-preferences'
import { generateEmbedding } from '@/lib/gemini/embeddings'
import { searchVenues } from '@/actions/venues/search-venues'
import type { AgentState, AgentMessage, AgentResponse, VenueResult } from '@/types/agent'
import type { ParsedPreferences } from '@/types/preferences'

interface ProcessMessageResult {
  success: boolean
  response?: AgentResponse
  error?: string
}

// UUID regex pattern
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function generateId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

function formatSearchSummary(preferences: ParsedPreferences): string {
  const parts: string[] = []
  const { filters } = preferences

  if (filters.event_type) {
    parts.push(filters.event_type)
  }

  if (filters.guest_count) {
    parts.push(`${filters.guest_count} personer`)
  }

  if (filters.areas && filters.areas.length > 0) {
    parts.push(`i ${filters.areas.join(', ')}`)
  }

  if (filters.budget_max) {
    parts.push(`max ${filters.budget_max.toLocaleString('sv-SE')} kr`)
  }

  return parts.join(', ')
}

export async function processAgentMessage(
  sessionId: string,
  userMessage: string
): Promise<ProcessMessageResult> {
  // Validate sessionId format
  if (!uuidRegex.test(sessionId)) {
    return {
      success: false,
      error: 'Ogiltig session',
    }
  }

  // Validate message length
  const MAX_MESSAGE_LENGTH = 5000
  if (!userMessage || userMessage.length > MAX_MESSAGE_LENGTH) {
    return {
      success: false,
      error: 'Meddelandet är för långt',
    }
  }

  try {
    const supabase = createServiceClient()

    // Fetch existing session
    const { data: session, error: sessionError } = await supabase
      .from('agent_sessions')
      .select('*')
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      return { success: false, error: 'Session hittades inte' }
    }

    // Create user message
    const userMsg: AgentMessage = {
      id: generateId(),
      role: 'user',
      content: userMessage,
      timestamp: new Date(),
    }

    // Update state to parsing
    await supabase
      .from('agent_sessions')
      .update({
        state: 'parsing',
        messages: [...(session.messages || []), userMsg],
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId)

    // Parse preferences and generate embedding in parallel
    let parsedPreferences: ParsedPreferences
    let embedding: number[] | undefined
    try {
      const [parseResult, embeddingResult] = await Promise.allSettled([
        parsePreferences(userMessage),
        generateEmbedding(userMessage),
      ])

      if (parseResult.status === 'rejected') throw parseResult.reason
      parsedPreferences = parseResult.value
      embedding = embeddingResult.status === 'fulfilled' ? embeddingResult.value : undefined
    } catch (parseError) {
      logger.error('Failed to parse preferences', { parseError })

      // Return a helpful error message
      const errorMsg: AgentMessage = {
        id: generateId(),
        role: 'agent',
        content: 'Jag kunde inte tolka din förfrågan. Kan du beskriva vad du söker lite mer detaljerat? Till exempel: typ av event, antal gäster, önskat område och budget.',
        timestamp: new Date(),
      }

      await supabase
        .from('agent_sessions')
        .update({
          state: 'idle',
          messages: [...(session.messages || []), userMsg, errorMsg],
          updated_at: new Date().toISOString(),
        })
        .eq('id', sessionId)

      return {
        success: true,
        response: {
          message: errorMsg.content,
          state: 'idle',
          requirements: session.requirements as Record<string, unknown>,
        },
      }
    }

    // Check if we got anything meaningful to search on
    const { filters } = parsedPreferences
    const hasFilters = filters.event_type || filters.guest_count || filters.areas?.length || filters.budget_max || filters.budget_min || parsedPreferences.vibe_description

    if (!hasFilters) {
      const clarifyMsg: AgentMessage = {
        id: generateId(),
        role: 'agent',
        content: 'Berätta lite mer om vad du letar efter! Till exempel typ av event, antal gäster, område eller budget.',
        timestamp: new Date(),
      }

      await supabase
        .from('agent_sessions')
        .update({
          state: 'idle',
          messages: [...(session.messages || []), userMsg, clarifyMsg],
          updated_at: new Date().toISOString(),
        })
        .eq('id', sessionId)

      return {
        success: true,
        response: {
          message: clarifyMsg.content,
          state: 'idle',
          requirements: session.requirements as Record<string, unknown>,
        },
      }
    }

    // Merge new requirements with existing ones
    const existingRequirements = (session.requirements || {}) as Record<string, unknown>
    const newRequirements = {
      ...existingRequirements,
      ...filters,
      vibe_description: parsedPreferences.vibe_description || existingRequirements.vibe_description,
      flexible_dates: parsedPreferences.flexible_dates,
    }

    const summary = formatSearchSummary(parsedPreferences)

    // Update session to searching state
    await supabase
      .from('agent_sessions')
      .update({
        state: 'searching' as AgentState,
        requirements: newRequirements,
        messages: [...(session.messages || []), userMsg],
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId)

    // Perform venue search (embedding already generated in parallel)
    const searchResult = await searchVenues({
      filters: parsedPreferences.filters,
      vibeDescription: parsedPreferences.vibe_description,
      embedding,
      limit: 10,
    })

    let venues: VenueResult[] = []
    let finalContent: string
    let finalState: AgentState

    if (!searchResult.success) {
      finalContent = 'Tyvärr uppstod ett fel vid sökningen. Försök igen senare.'
      finalState = 'idle'
    } else if (!searchResult.venues || searchResult.venues.length === 0) {
      finalContent = 'Jag hittade tyvärr inga lokaler som matchar just nu. Prova att utöka ditt sökområde, justera budgeten eller ändra antalet gäster.'
      finalState = 'idle'
    } else {
      venues = searchResult.venues
      const venueCount = venues.length
      finalContent = summary
        ? `Här är ${venueCount} ${venueCount === 1 ? 'lokal' : 'lokaler'} som passar för ${summary}`
        : `Här är ${venueCount} ${venueCount === 1 ? 'lokal som kan passa' : 'lokaler som kan passa'}`
      finalState = 'presenting'
    }

    // Create final agent message with venues
    const agentMsg: AgentMessage = {
      id: generateId(),
      role: 'agent',
      content: finalContent,
      venues: venues.length > 0 ? venues : undefined,
      timestamp: new Date(),
    }

    // Update session with final results
    const { error: updateError } = await supabase
      .from('agent_sessions')
      .update({
        state: finalState,
        requirements: newRequirements,
        matched_venues: venues.length > 0 ? venues : null,
        messages: [...(session.messages || []), userMsg, agentMsg],
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId)

    if (updateError) {
      logger.error('Failed to update session', { updateError })
      return { success: false, error: 'Kunde inte uppdatera session' }
    }

    return {
      success: true,
      response: {
        message: finalContent,
        state: finalState,
        requirements: newRequirements,
        venues,
      },
    }
  } catch (error) {
    logger.error('Error processing agent message', { error })
    return { success: false, error: 'Ett oväntat fel uppstod' }
  }
}

export async function getSessionMessages(
  sessionId: string
): Promise<{ success: boolean; messages?: AgentMessage[]; state?: AgentState; error?: string }> {
  if (!uuidRegex.test(sessionId)) {
    return { success: false, error: 'Ogiltig session' }
  }

  try {
    const supabase = createServiceClient()

    const { data: session, error } = await supabase
      .from('agent_sessions')
      .select('messages, state')
      .eq('id', sessionId)
      .single()

    if (error || !session) {
      return { success: false, error: 'Session hittades inte' }
    }

    // Convert JSON messages to AgentMessage type with proper Date objects
    const messages = ((session.messages || []) as unknown[]).map((msg: unknown) => {
      const m = msg as Record<string, unknown>
      return {
        id: m.id as string,
        role: m.role as 'user' | 'agent',
        content: m.content as string,
        venues: m.venues as VenueResult[] | undefined,
        timestamp: new Date(m.timestamp as string),
      }
    })

    return {
      success: true,
      messages,
      state: session.state as AgentState,
    }
  } catch (error) {
    logger.error('Error fetching session messages', { error })
    return { success: false, error: 'Ett oväntat fel uppstod' }
  }
}
