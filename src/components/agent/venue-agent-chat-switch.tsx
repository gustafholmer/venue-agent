'use client'

import { useState, useEffect } from 'react'
import { VenueAgentChat } from './venue-agent-chat'

interface VenueAgentChatSwitchProps {
  venue: {
    id: string
    name: string
    slug: string
    description?: string | null
    area?: string | null
    city: string
    capacity_standing?: number | null
    capacity_seated?: number | null
    capacity_conference?: number | null
    min_guests: number
    amenities?: string[] | null
    venue_types?: string[] | null
    price_per_hour?: number | null
    price_half_day?: number | null
    price_full_day?: number | null
    price_evening?: number | null
  }
}

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(false)

  useEffect(() => {
    const mql = window.matchMedia('(min-width: 1024px)')
    setIsDesktop(mql.matches)

    function handleChange(e: MediaQueryListEvent) {
      setIsDesktop(e.matches)
    }

    mql.addEventListener('change', handleChange)
    return () => mql.removeEventListener('change', handleChange)
  }, [])

  return isDesktop
}

export function VenueAgentChatSwitch({ venue }: VenueAgentChatSwitchProps) {
  const isDesktop = useIsDesktop()

  if (isDesktop) {
    return null // Embedded chat is rendered in the sidebar by the page
  }

  return <VenueAgentChat venue={venue} />
}
