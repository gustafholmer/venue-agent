import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { genAI, isGeminiConfigured } from '@/lib/gemini/client'
import { withRetry } from '@/lib/gemini/retry'
import { rateLimit, RATE_LIMITS, RATE_LIMIT_ERROR } from '@/lib/rate-limit'
import { buildAgentSystemPrompt } from '@/lib/agent/build-system-prompt'
import type { CalendarData, VenueData } from '@/lib/agent/build-system-prompt'
import { getOrCreateConversation, updateConversation } from '@/lib/agent/conversation'
import { AGENT_TOOL_DECLARATIONS } from '@/lib/agent/tools'
import { executeAgentTool } from '@/lib/agent/tools/execute'
import type { AgentConversationMessage } from '@/types/agent-booking'
import type { Content, Part } from '@google/generative-ai'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface VenueAgentRequest {
  conversationId?: string
  venueId: string
  message: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MAX_TOOL_ITERATIONS = 5
const MAX_HISTORY_MESSAGES = 50

function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

/**
 * Convert conversation history messages into Gemini Content objects.
 * System messages are skipped; tool_calls/tool_results are omitted since
 * the model only sees the natural language conversation history.
 */
function buildGeminiContents(
  systemPrompt: string,
  messages: AgentConversationMessage[]
): Content[] {
  const contents: Content[] = []

  // Start with the system prompt as a user turn, followed by a model acknowledgement
  contents.push({ role: 'user', parts: [{ text: systemPrompt }] })
  contents.push({
    role: 'model',
    parts: [{ text: 'Förstått! Jag är redo att hjälpa kunder med frågor och bokningar.' }],
  })

  // Append the last N messages from conversation history
  const recent = messages.slice(-MAX_HISTORY_MESSAGES)

  for (const msg of recent) {
    if (msg.role === 'system') continue

    const role = msg.role === 'user' ? 'user' : 'model'
    contents.push({ role, parts: [{ text: msg.content }] })
  }

  return contents
}

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    // 1. Rate limit check
    const rateLimitResult = await rateLimit('venue-agent', RATE_LIMITS.venueAgent)
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: RATE_LIMIT_ERROR },
        {
          status: 429,
          headers: {
            'Retry-After': Math.ceil(
              (rateLimitResult.resetTime - Date.now()) / 1000
            ).toString(),
          },
        }
      )
    }

    // 2. Parse request
    const body: VenueAgentRequest = await request.json()
    const { venueId, message, conversationId: requestConversationId } = body

    if (!venueId || !message) {
      return NextResponse.json(
        { error: 'Saknade fält: venueId och message krävs.' },
        { status: 400 }
      )
    }

    // 3. Get current user (optional — anonymous allowed)
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    const customerId = user?.id ?? undefined

    // 4. Fetch venue (must be published) + agent config (must be enabled) + calendar data
    const serviceClient = createServiceClient()

    const { data: venue, error: venueError } = await serviceClient
      .from('venues')
      .select(
        'id, owner_id, name, description, area, city, address, capacity_standing, capacity_seated, capacity_conference, min_guests, amenities, venue_types, vibes, price_per_hour, price_half_day, price_full_day, price_evening, price_notes, website, contact_email, contact_phone, published'
      )
      .eq('id', venueId)
      .single()

    if (venueError || !venue) {
      return NextResponse.json(
        { error: 'Lokalen hittades inte.' },
        { status: 404 }
      )
    }

    if (!venue.published) {
      return NextResponse.json(
        { error: 'Lokalen är inte publicerad.' },
        { status: 404 }
      )
    }

    // Fetch agent config
    const { data: agentConfig } = await serviceClient
      .from('venue_agent_config')
      .select('*')
      .eq('venue_id', venueId)
      .maybeSingle()

    if (!agentConfig || !agentConfig.enabled) {
      return NextResponse.json(
        { error: 'Bokningsagenten är inte aktiverad för denna lokal.' },
        { status: 400 }
      )
    }

    // Check Gemini is configured
    if (!isGeminiConfigured() || !genAI) {
      console.error('[venue-agent] Gemini is not configured')
      return NextResponse.json(
        { error: 'AI-tjänsten är inte konfigurerad. Kontakta support.' },
        { status: 500 }
      )
    }

    // Fetch calendar data (next 3 months)
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

    const calendarData: CalendarData = {
      blockedDates: (blockedRes.data ?? []).map(
        (r: { date: string }) => r.date
      ),
      bookedDates: (bookedRes.data ?? []).map(
        (r: { event_date: string }) => r.event_date
      ),
    }

    // 5. Get or create conversation
    const { conversation } = await getOrCreateConversation(
      venueId,
      requestConversationId,
      customerId
    )

    // 6. Build system prompt
    const venueDataForPrompt: VenueData = {
      name: venue.name,
      description: venue.description,
      area: venue.area,
      city: venue.city,
      address: venue.address,
      capacity_standing: venue.capacity_standing,
      capacity_seated: venue.capacity_seated,
      capacity_conference: venue.capacity_conference,
      min_guests: venue.min_guests,
      amenities: venue.amenities,
      venue_types: venue.venue_types,
      vibes: venue.vibes,
      price_per_hour: venue.price_per_hour,
      price_half_day: venue.price_half_day,
      price_full_day: venue.price_full_day,
      price_evening: venue.price_evening,
      price_notes: venue.price_notes,
      website: venue.website,
      contact_email: venue.contact_email,
      contact_phone: venue.contact_phone,
    }

    const systemPrompt = buildAgentSystemPrompt(
      venueDataForPrompt,
      agentConfig,
      calendarData
    )

    // 7. Append user message to conversation history
    const existingMessages: AgentConversationMessage[] = Array.isArray(
      conversation.messages
    )
      ? (conversation.messages as unknown as AgentConversationMessage[])
      : []

    const userMessage: AgentConversationMessage = {
      id: generateMessageId(),
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
    }

    const allMessages = [...existingMessages, userMessage]

    // 8. Build Gemini contents
    let geminiContents = buildGeminiContents(systemPrompt, allMessages)

    // 9. Call Gemini with function calling tools
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      tools: [{ functionDeclarations: AGENT_TOOL_DECLARATIONS }],
    })

    let bookingSummary: Record<string, unknown> | undefined
    const newMessages: AgentConversationMessage[] = [userMessage]

    // 10. Tool call loop (up to MAX_TOOL_ITERATIONS)
    let response = await withRetry(() =>
      model.generateContent({ contents: geminiContents })
    )

    for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
      const parts: Part[] =
        response.response.candidates?.[0]?.content?.parts ?? []
      const functionCallPart = parts.find(
        (p): p is Part & { functionCall: { name: string; args: Record<string, unknown> } } =>
          'functionCall' in p && p.functionCall !== undefined
      )

      if (!functionCallPart || !('functionCall' in functionCallPart)) {
        // No more function calls — we have the final response
        break
      }

      const { name: toolName, args: toolArgs } =
        functionCallPart.functionCall

      // Execute the tool
      const toolResult = await executeAgentTool(toolName, toolArgs, {
        venueId,
        conversationId: conversation.id,
        customerId,
        serviceClient,
        venue: venue as unknown as Record<string, unknown>,
        config: agentConfig,
      })

      // Capture booking summary if propose_booking was called
      if (
        toolName === 'propose_booking' &&
        toolResult.success &&
        toolResult.summary
      ) {
        bookingSummary = toolResult.summary as Record<string, unknown>
      }

      // Record tool call/result in messages
      const toolMessage: AgentConversationMessage = {
        id: generateMessageId(),
        role: 'agent',
        content: `[Tool: ${toolName}]`,
        tool_calls: [{ name: toolName, args: toolArgs }],
        tool_results: [{ name: toolName, result: toolResult }],
        timestamp: new Date().toISOString(),
      }
      newMessages.push(toolMessage)

      // Send tool result back to Gemini for continuation
      geminiContents = [
        ...geminiContents,
        {
          role: 'model' as const,
          parts: parts,
        },
        {
          role: 'function' as const,
          parts: [
            {
              functionResponse: {
                name: toolName,
                response: toolResult,
              },
            },
          ],
        },
      ]

      // Call Gemini again with tool result
      response = await withRetry(() =>
        model.generateContent({ contents: geminiContents })
      )
    }

    // 11. Extract final text response
    const finalParts: Part[] =
      response.response.candidates?.[0]?.content?.parts ?? []
    const textPart = finalParts.find(
      (p): p is Part & { text: string } =>
        'text' in p && typeof p.text === 'string'
    )
    const agentResponseText =
      textPart?.text ?? 'Jag kunde tyvärr inte generera ett svar just nu.'

    // Record agent response in messages
    const agentMessage: AgentConversationMessage = {
      id: generateMessageId(),
      role: 'agent',
      content: agentResponseText,
      timestamp: new Date().toISOString(),
    }
    newMessages.push(agentMessage)

    // 12. Save all messages to conversation
    const updatedMessages = [...existingMessages, ...newMessages]
    await updateConversation(conversation.id, {
      messages: updatedMessages,
    })

    // 13. Return response
    return NextResponse.json({
      conversationId: conversation.id,
      message: agentResponseText,
      ...(bookingSummary ? { bookingSummary } : {}),
      status: 'ok',
    })
  } catch (error) {
    console.error('[venue-agent] Error:', error)
    return NextResponse.json(
      { error: 'Ett oväntat fel uppstod. Försök igen senare.' },
      { status: 500 }
    )
  }
}
