import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { sendEmail } from '../_shared/resend.ts'
import {
  modificationProposedEmail,
  modificationAcceptedEmail,
} from '../_shared/email-templates.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

Deno.serve(async (req) => {
  try {
    const payload = await req.json()
    const { type, record, old_record } = payload

    // Handle new modification proposed (INSERT)
    if (type === 'INSERT' && record.status === 'pending') {
      const { data: booking } = await supabase
        .from('booking_requests')
        .select(`
          *,
          venue:venues!inner(name, owner_id)
        `)
        .eq('id', record.booking_request_id)
        .single()

      if (!booking) {
        return new Response(JSON.stringify({ error: 'Booking not found' }), { status: 404 })
      }

      const venue = booking.venue as { name: string; owner_id: string }

      const isProposedByCustomer = record.proposed_by === booking.customer_id
      let toEmail: string | null = isProposedByCustomer ? null : booking.customer_email

      if (!toEmail) {
        const recipientId = isProposedByCustomer ? venue.owner_id : booking.customer_id
        if (!recipientId) {
          return new Response(JSON.stringify({ skipped: 'No recipient' }), { status: 200 })
        }
        const { data: profile } = await supabase
          .from('profiles')
          .select('email')
          .eq('id', recipientId)
          .single()
        toEmail = profile?.email
      }

      if (!toEmail) {
        return new Response(JSON.stringify({ skipped: 'No email' }), { status: 200 })
      }

      const eventDate = new Date(booking.event_date).toLocaleDateString('sv-SE', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })

      const changes: string[] = []
      if (record.proposed_event_date) {
        const newDate = new Date(record.proposed_event_date).toLocaleDateString('sv-SE', {
          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        })
        changes.push(`<p>Nytt datum: ${newDate}</p>`)
      }
      if (record.proposed_guest_count !== null) {
        changes.push(`<p>Antal gäster: ${record.proposed_guest_count}</p>`)
      }
      if (record.proposed_total_price !== null) {
        changes.push(`<p>Nytt totalpris: ${record.proposed_total_price} kr</p>`)
      }
      if (record.proposed_start_time) {
        changes.push(`<p>Ny starttid: ${record.proposed_start_time.slice(0, 5)}</p>`)
      }
      if (record.proposed_end_time) {
        changes.push(`<p>Ny sluttid: ${record.proposed_end_time.slice(0, 5)}</p>`)
      }

      const html = modificationProposedEmail(
        venue.name,
        eventDate,
        changes.join('')
      )

      await sendEmail({
        to: toEmail,
        subject: `Ändringsförslag för din bokning av ${venue.name}`,
        html,
      })

      return new Response(JSON.stringify({ success: true, status: 'proposed' }), { status: 200 })
    }

    // Handle modification accepted (UPDATE)
    if (type === 'UPDATE' && record.status === 'accepted' && old_record?.status === 'pending') {
      const { data: booking } = await supabase
        .from('booking_requests')
        .select(`
          *,
          venue:venues!inner(name)
        `)
        .eq('id', record.booking_request_id)
        .single()

      if (!booking) {
        return new Response(JSON.stringify({ error: 'Booking not found' }), { status: 404 })
      }

      const venue = booking.venue as { name: string }

      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', record.proposed_by)
        .single()

      if (!profile?.email) {
        return new Response(JSON.stringify({ skipped: 'No proposer email' }), { status: 200 })
      }

      const eventDate = new Date(booking.event_date).toLocaleDateString('sv-SE', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })

      const html = modificationAcceptedEmail(venue.name, eventDate)

      await sendEmail({
        to: profile.email,
        subject: `Ändringsförslaget för din bokning av ${venue.name} har godkänts`,
        html,
      })

      return new Response(JSON.stringify({ success: true, status: 'accepted' }), { status: 200 })
    }

    return new Response(JSON.stringify({ skipped: 'No action needed' }), { status: 200 })
  } catch (error) {
    console.error('Error in notify-booking-modification:', error)
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 })
  }
})
