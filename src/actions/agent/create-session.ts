'use server'

import { logger } from '@/lib/logger'

import { createClient } from '@/lib/supabase/server'
import { uuidSchema } from '@/lib/validation/schemas'
import type { AgentState } from '@/types/agent'

interface CreateSessionResult {
  success: boolean
  sessionId?: string
  error?: string
}

export async function createAgentSession(): Promise<CreateSessionResult> {
  try {
    const supabase = await createClient()

    // Check if user is authenticated (optional - sessions can be anonymous)
    const { data: { user } } = await supabase.auth.getUser()

    // Create new session with default state
    const { data, error } = await supabase
      .from('agent_sessions')
      .insert({
        customer_id: user?.id || null,
        state: 'idle' as AgentState,
        requirements: {},
        messages: [],
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
      })
      .select('id')
      .single()

    if (error) {
      logger.error('Failed to create agent session', { error })
      return { success: false, error: 'Kunde inte skapa session' }
    }

    return { success: true, sessionId: data.id }
  } catch (error) {
    logger.error('Error creating agent session', { error })
    return { success: false, error: 'Ett oväntat fel uppstod' }
  }
}

export async function getOrCreateSession(sessionId?: string): Promise<CreateSessionResult> {
  try {
    const supabase = await createClient()

    // If sessionId provided, validate and try to fetch existing session
    if (sessionId) {
      const parsed = uuidSchema.safeParse(sessionId)
      if (!parsed.success) {
        return { success: false, error: 'Ogiltigt sessions-ID' }
      }

      const { data: existingSession, error: fetchError } = await supabase
        .from('agent_sessions')
        .select('id')
        .eq('id', sessionId)
        .gt('expires_at', new Date().toISOString())
        .single()

      if (!fetchError && existingSession) {
        return { success: true, sessionId: existingSession.id }
      }
    }

    // Create new session if none exists or expired
    return createAgentSession()
  } catch (error) {
    logger.error('Error in getOrCreateSession', { error })
    return { success: false, error: 'Ett oväntat fel uppstod' }
  }
}
