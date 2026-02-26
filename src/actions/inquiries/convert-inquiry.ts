'use server'

import { logger } from '@/lib/logger'

import { createClient } from '@/lib/supabase/server'

// UUID format validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function convertInquiry(
  inquiryId: string,
  bookingRequestId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()

    // Validate UUID formats
    if (!UUID_REGEX.test(inquiryId)) {
      return { success: false, error: 'Ogiltigt förfrågnings-ID' }
    }
    if (!UUID_REGEX.test(bookingRequestId)) {
      return { success: false, error: 'Ogiltigt boknings-ID' }
    }

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Ej inloggad' }
    }

    // Get the inquiry
    const { data: inquiry, error: inquiryError } = await supabase
      .from('venue_inquiries')
      .select('*')
      .eq('id', inquiryId)
      .single()

    if (inquiryError || !inquiry) {
      return { success: false, error: 'Förfrågan hittades inte' }
    }

    // Verify the current user is the inquiry creator
    if (inquiry.user_id !== user.id) {
      return { success: false, error: 'Du har inte behörighet att konvertera denna förfrågan' }
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

    // Update inquiry status to converted with booking reference
    const { error: updateError } = await supabase
      .from('venue_inquiries')
      .update({
        status: 'converted',
        booking_request_id: bookingRequestId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', inquiryId)

    if (updateError) {
      logger.error('Error converting inquiry', { updateError })
      return { success: false, error: 'Kunde inte konvertera förfrågan' }
    }

    return { success: true }
  } catch (error) {
    logger.error('Unexpected error converting inquiry', { error })
    return {
      success: false,
      error: 'Ett oväntat fel uppstod',
    }
  }
}
