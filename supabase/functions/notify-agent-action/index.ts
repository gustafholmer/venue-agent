import { getSupabaseClient, getUserEmail } from '../_shared/supabase.ts'
import { sendEmail } from '../_shared/resend.ts'
import { agentBookingApprovalEmail, agentEscalationEmail } from '../_shared/email-templates.ts'

interface WebhookPayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE'
  table: string
  schema: string
  record: Record<string, unknown>
  old_record: Record<string, unknown> | null
}

Deno.serve(async (req) => {
  try {
    const payload: WebhookPayload = await req.json()

    // Only process new actions
    if (payload.type !== 'INSERT') {
      return new Response(JSON.stringify({ message: 'Skipped: not an INSERT' }), { status: 200 })
    }

    const action = payload.record
    const supabase = getSupabaseClient()

    // Get the venue and its owner
    const { data: venue } = await supabase
      .from('venues')
      .select('name, owner_id')
      .eq('id', action.venue_id)
      .single()

    if (!venue) {
      return new Response(JSON.stringify({ error: 'Venue not found' }), { status: 404 })
    }

    const ownerEmail = await getUserEmail(venue.owner_id)
    if (!ownerEmail) {
      return new Response(JSON.stringify({ error: 'Owner email not found' }), { status: 404 })
    }

    const baseUrl = Deno.env.get('SITE_URL') || 'https://venue-agent.se'
    const actionUrl = `${baseUrl}/dashboard/actions`

    let subject: string
    let html: string
    const summary = action.summary as Record<string, unknown>

    if (action.action_type === 'booking_approval') {
      subject = `Ny bokningsförfrågan: ${summary.eventTypeLabel || summary.eventType} för ${summary.guestCount} gäster`
      html = agentBookingApprovalEmail({
        venueName: venue.name,
        eventType: String(summary.eventTypeLabel || summary.eventType || ''),
        guestCount: Number(summary.guestCount || 0),
        date: String(summary.date || ''),
        price: `${Number(summary.price || 0).toLocaleString('sv-SE')} kr`,
        actionUrl,
      })
    } else if (action.action_type === 'escalation') {
      subject = `Behöver ditt svar — ${venue.name}`
      html = agentEscalationEmail({
        venueName: venue.name,
        customerRequest: String(summary.customerRequest || ''),
        reasons: (summary.reasons as string[]) || [],
        actionUrl,
      })
    } else {
      return new Response(JSON.stringify({ message: 'Skipped: unsupported action type' }), { status: 200 })
    }

    const result = await sendEmail({ to: ownerEmail, subject, html })

    if (!result.success) {
      console.error('Failed to send email:', result.error)
      return new Response(JSON.stringify({ error: result.error }), { status: 500 })
    }

    return new Response(JSON.stringify({ message: 'Email sent' }), { status: 200 })
  } catch (error) {
    console.error('notify-agent-action error:', error)
    return new Response(JSON.stringify({ error: 'Internal error' }), { status: 500 })
  }
})
