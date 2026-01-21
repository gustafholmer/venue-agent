'use server'

import { createClient } from '@/lib/supabase/server'
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
      console.error('Failed to create agent session:', error)
      return { success: false, error: 'Kunde inte skapa session' }
    }

    return { success: true, sessionId: data.id }
  } catch (error) {
    console.error('Error creating agent session:', error)
    return { success: false, error: 'Ett oväntat fel uppstod' }
  }
}

export async function getOrCreateSession(sessionId?: string): Promise<CreateSessionResult> {
  try {
    const supabase = await createClient()

    // If sessionId provided, try to fetch existing session
    if (sessionId) {
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
    console.error('Error in getOrCreateSession:', error)
    return { success: false, error: 'Ett oväntat fel uppstod' }
  }
}
