import type { MetadataRoute } from 'next'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/server'
import { isDemoMode } from '@/lib/demo-mode'
import { MOCK_VENUES } from '@/lib/mock-data'

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://venue-agent.se'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/venues`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/faq`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/policy`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
  ]

  // Fetch published venues for dynamic pages
  let venuePages: MetadataRoute.Sitemap = []

  if (isDemoMode() || !isSupabaseConfigured()) {
    // Use mock venues in demo mode
    venuePages = MOCK_VENUES.map((venue) => ({
      url: `${BASE_URL}/venues/${venue.slug}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }))
  } else {
    try {
      const supabase = await createClient()
      const { data: venues } = await supabase
        .from('venues')
        .select('slug, updated_at')
        .eq('status', 'published')
        .not('slug', 'is', null)

      if (venues) {
        venuePages = venues.map((venue) => ({
          url: `${BASE_URL}/venues/${venue.slug}`,
          lastModified: venue.updated_at ? new Date(venue.updated_at) : new Date(),
          changeFrequency: 'weekly' as const,
          priority: 0.8,
        }))
      }
    } catch (error) {
      console.error('Error fetching venues for sitemap:', error)
    }
  }

  return [...staticPages, ...venuePages]
}
