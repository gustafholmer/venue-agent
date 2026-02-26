'use server'

import { createClient } from '@/lib/supabase/server'
import type { VenueInquiry, VenuePhoto } from '@/types/database'

export interface InquiryDetail extends VenueInquiry {
  venue: {
    name: string
    slug: string | null
    city: string
    area: string | null
    owner_id: string
    primary_photo: VenuePhoto | null
  }
  profile: {
    full_name: string | null
    email: string
  }
}

// UUID format validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function getInquiry(inquiryId: string): Promise<{
  success: boolean
  inquiry?: InquiryDetail
  error?: string
}> {
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

    const { data: inquiry, error } = await supabase
      .from('venue_inquiries')
      .select(`
        *,
        venue:venues!inner(
          name,
          slug,
          city,
          area,
          owner_id
        ),
        profile:profiles!inner(
          full_name,
          email
        )
      `)
      .eq('id', inquiryId)
      .single()

    if (error || !inquiry) {
      return { success: false, error: 'Förfrågan hittades inte' }
    }

    // Authorization check: user must be the inquiry creator or the venue owner
    const venueData = inquiry.venue as unknown as { owner_id: string }
    const isInquiryUser = inquiry.user_id === user.id
    const isVenueOwner = venueData.owner_id === user.id

    if (!isInquiryUser && !isVenueOwner) {
      return { success: false, error: 'Du har inte behörighet att se denna förfrågan' }
    }

    // Get venue primary photo
    const { data: photos } = await supabase
      .from('venue_photos')
      .select('*')
      .eq('venue_id', inquiry.venue_id)
      .eq('is_primary', true)
      .limit(1)

    const primaryPhoto = photos?.[0] || null

    return {
      success: true,
      inquiry: {
        ...inquiry,
        venue: {
          ...(inquiry.venue as unknown as { name: string; slug: string | null; city: string; area: string | null; owner_id: string }),
          primary_photo: primaryPhoto,
        },
        profile: inquiry.profile as unknown as { full_name: string | null; email: string },
      },
    }
  } catch (error) {
    console.error('Error fetching inquiry:', error)
    return {
      success: false,
      error: 'Ett oväntat fel uppstod',
    }
  }
}
