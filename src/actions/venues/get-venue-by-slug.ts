'use server'

import { createClient, isSupabaseConfigured } from '@/lib/supabase/server'
import { isDemoMode } from '@/lib/demo-mode'
import { getMockVenueBySlug, getMockPhotosForVenue } from '@/lib/mock-data'
import type { Venue, VenuePhoto, Review } from '@/types/database'
import { trackEvent } from '@/lib/analytics'

export interface VenueWithDetails extends Venue {
  photos: VenuePhoto[]
  reviews: ReviewWithProfile[]
  averageRating: number | null
  reviewCount: number
}

interface ReviewWithProfile extends Review {
  profile: {
    full_name: string | null
  } | null
}

export interface GetVenueResult {
  success: boolean
  venue?: VenueWithDetails
  error?: string
}

export async function getVenueBySlug(slugOrId: string): Promise<GetVenueResult> {
  try {
    // Check if we're in demo mode or Supabase is not configured
    if (isDemoMode() || !isSupabaseConfigured()) {
      const mockVenue = getMockVenueBySlug(slugOrId)

      if (!mockVenue) {
        return {
          success: false,
          error: 'Lokalen hittades inte',
        }
      }

      const mockPhotos = getMockPhotosForVenue(mockVenue.id)

      return {
        success: true,
        venue: {
          ...mockVenue,
          photos: mockPhotos,
          reviews: [],
          averageRating: null,
          reviewCount: 0,
        },
      }
    }

    const supabase = await createClient()

    // First try to find by slug
    let { data: venue, error } = await supabase
      .from('venues')
      .select('*')
      .eq('slug', slugOrId)
      .eq('status', 'published')
      .single()

    // If not found by slug, try by ID
    if (!venue) {
      const { data: venueById, error: idError } = await supabase
        .from('venues')
        .select('*')
        .eq('id', slugOrId)
        .eq('status', 'published')
        .single()

      venue = venueById
      error = idError
    }

    if (error || !venue) {
      return {
        success: false,
        error: 'Lokalen hittades inte',
      }
    }

    // Fetch photos
    const { data: photos } = await supabase
      .from('venue_photos')
      .select('*')
      .eq('venue_id', venue.id)
      .order('is_primary', { ascending: false })
      .order('sort_order', { ascending: true })

    // Fetch reviews with profile information
    const { data: reviews } = await supabase
      .from('reviews')
      .select(`
        *,
        profile:profiles!reviews_customer_id_fkey(full_name)
      `)
      .eq('venue_id', venue.id)
      .order('created_at', { ascending: false })

    // Calculate average rating
    let averageRating: number | null = null
    const reviewCount = reviews?.length || 0

    if (reviews && reviews.length > 0) {
      const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0)
      averageRating = Math.round((totalRating / reviews.length) * 10) / 10
    }

    trackEvent('venue_viewed', { venue_id: venue.id, slug: slugOrId })

    return {
      success: true,
      venue: {
        ...venue,
        photos: photos || [],
        reviews: (reviews as ReviewWithProfile[]) || [],
        averageRating,
        reviewCount,
      },
    }
  } catch (error) {
    console.error('Error fetching venue:', error)
    return {
      success: false,
      error: 'Ett ovantat fel uppstod',
    }
  }
}
