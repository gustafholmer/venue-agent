'use server'

import { logger } from '@/lib/logger'

import { createClient } from '@/lib/supabase/server'
import { parsePreferences } from '@/lib/gemini/parse-preferences'
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

function formatRequirementsMessage(preferences: ParsedPreferences): string {
  const parts: string[] = []
  const { filters, vibe_description } = preferences

  // Event type
  if (filters.event_type) {
    parts.push(`${filters.event_type}`)
  }

  // Guest count
  if (filters.guest_count) {
    parts.push(`${filters.guest_count} personer`)
  }

  // Areas
  if (filters.areas && filters.areas.length > 0) {
    parts.push(`i ${filters.areas.join(', ')}`)
  }

  // Budget
  if (filters.budget_min || filters.budget_max) {
    if (filters.budget_min && filters.budget_max) {
      parts.push(`budget ${filters.budget_min.toLocaleString('sv-SE')}-${filters.budget_max.toLocaleString('sv-SE')} kr`)
    } else if (filters.budget_max) {
      parts.push(`budget max ${filters.budget_max.toLocaleString('sv-SE')} kr`)
    } else if (filters.budget_min) {
      parts.push(`budget från ${filters.budget_min.toLocaleString('sv-SE')} kr`)
    }
  }

  // Dates
  if (filters.preferred_dates && filters.preferred_dates.length > 0) {
    const dateStr = filters.preferred_dates.length === 1
      ? filters.preferred_dates[0]
      : `${filters.preferred_dates.length} datum`
    parts.push(`önskat datum: ${dateStr}`)
  }

  // Time
  if (filters.preferred_time) {
    const timeMap: Record<string, string> = {
      morning: 'förmiddag',
      afternoon: 'eftermiddag',
      evening: 'kväll',
    }
    parts.push(timeMap[filters.preferred_time] || filters.preferred_time)
  }

  // Requirements
  if (filters.requirements && filters.requirements.length > 0) {
    parts.push(`med ${filters.requirements.join(', ')}`)
  }

  // Vibe
  if (vibe_description) {
    parts.push(`känsla: "${vibe_description}"`)
  }

  return parts.length > 0
    ? `Jag söker efter lokaler för ${parts.join(', ')}.\n\nJag letar efter matchande lokaler...`
    : 'Jag försöker förstå vad du söker. Kan du berätta mer om ditt event?'
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
    const supabase = await createClient()

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

    // Parse user preferences using Gemini
    let parsedPreferences: ParsedPreferences
    try {
      parsedPreferences = await parsePreferences(userMessage)
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

    // Merge new requirements with existing ones
    const existingRequirements = (session.requirements || {}) as Record<string, unknown>
    const newRequirements = {
      ...existingRequirements,
      ...parsedPreferences.filters,
      vibe_description: parsedPreferences.vibe_description || existingRequirements.vibe_description,
      flexible_dates: parsedPreferences.flexible_dates,
    }

    // Generate initial response message
    const searchingContent = formatRequirementsMessage(parsedPreferences)

    // Create searching message
    const searchingMsg: AgentMessage = {
      id: generateId(),
      role: 'agent',
      content: searchingContent,
      timestamp: new Date(),
    }

    // Update session to searching state
    await supabase
      .from('agent_sessions')
      .update({
        state: 'searching' as AgentState,
        requirements: newRequirements,
        messages: [...(session.messages || []), userMsg, searchingMsg],
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId)

    // Perform venue search
    const searchResult = await searchVenues({
      filters: parsedPreferences.filters,
      vibeDescription: parsedPreferences.vibe_description,
      limit: 10,
    })

    let venues: VenueResult[] = []
    let finalContent: string
    let finalState: AgentState

    if (!searchResult.success) {
      // Search failed - return error message
      finalContent = `${searchingContent}\n\nTyvärr uppstod ett fel vid sökningen. Försök igen senare.`
      finalState = 'idle'
    } else if (!searchResult.venues || searchResult.venues.length === 0) {
      // No venues found - provide helpful message
      finalContent = `${searchingContent}\n\nJag hittade tyvärr inga lokaler som matchar dina kriterier just nu. Prova att:\n- Utöka ditt sökområde\n- Justera budgeten\n- Vara mer flexibel med datum\n- Ändra antalet gäster`
      finalState = 'idle'
    } else {
      // Venues found - format success message
      venues = searchResult.venues
      const venueCount = venues.length
      finalContent = `${searchingContent}\n\nJag hittade ${venueCount} ${venueCount === 1 ? 'lokal' : 'lokaler'} som matchar dina kriterier:`
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
  try {
    const supabase = await createClient()

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
