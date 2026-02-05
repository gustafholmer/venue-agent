import { createServiceClient } from '@/lib/supabase/service'

export function trackEvent(
  eventName: string,
  properties?: Record<string, unknown>,
  userId?: string
) {
  try {
    const supabase = createServiceClient()
    supabase
      .from('analytics_events')
      .insert({
        event_name: eventName,
        user_id: userId || null,
        properties: properties || {},
      })
      .then(({ error }) => {
        if (error) console.warn('Analytics tracking failed:', error)
      })
  } catch (error) {
    console.warn('Analytics tracking failed:', error)
  }
}
