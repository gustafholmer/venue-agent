'use server'

import { logger } from '@/lib/logger'

import { createClient } from '@/lib/supabase/server'
import { dispatchNotification } from '@/lib/notifications/create-notification'

// UUID format validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function closeInquiry(inquiryId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()

    // Validate UUID format to prevent injection
    if (!UUID_REGEX.test(inquiryId)) {
      return { success: false, error: 'Ogiltigt förfrågnings-ID' }
    }

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Ej inloggad' }
    }

    // Get the inquiry with venue info to verify ownership
    const { data: inquiry, error: inquiryError } = await supabase
      .from('venue_inquiries')
      .select(`
        *,
        venue:venues!inner(
          id,
          name,
          owner_id
        )
      `)
      .eq('id', inquiryId)
      .single()

    if (inquiryError || !inquiry) {
      return { success: false, error: 'Förfrågan hittades inte' }
    }

    // Verify the current user owns this venue
    const venue = inquiry.venue as { id: string; name: string; owner_id: string }
    if (venue.owner_id !== user.id) {
      return { success: false, error: 'Du har inte behörighet att stänga denna förfrågan' }
    }

    // Validate inquiry is still open
    if (inquiry.status !== 'open') {
      const statusMap: Record<string, string> = {
        closed: 'redan stängd',
        converted: 'redan konverterad till bokning',
      }
      return {
        success: false,
        error: `Denna förfrågan är ${statusMap[inquiry.status] || inquiry.status}`,
      }
    }

    // Update inquiry status to closed
    const { error: updateError } = await supabase
      .from('venue_inquiries')
      .update({
        status: 'closed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', inquiryId)

    if (updateError) {
      logger.error('Error closing inquiry', { updateError })
      return { success: false, error: 'Kunde inte stänga förfrågan' }
    }

    // Notify the inquiry creator that the inquiry was closed
    await dispatchNotification({
      recipient: inquiry.user_id,
      category: 'new_inquiry',
      headline: 'Förfrågan avslutad',
      body: `Din förfrågan om ${venue.name} har avslutats av lokalägaren.`,
      reference: { kind: 'inquiry', id: inquiry.id },
      author: user.id,
      extra: {
        venue_name: venue.name,
        event_date: inquiry.event_date,
      },
    })

    return { success: true }
  } catch (error) {
    logger.error('Unexpected error closing inquiry', { error })
    return {
      success: false,
      error: 'Ett oväntat fel uppstod',
    }
  }
}
