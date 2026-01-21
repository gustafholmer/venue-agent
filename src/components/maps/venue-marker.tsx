'use client'

import { MarkerF } from '@react-google-maps/api'
import { useCallback } from 'react'

export interface VenueMarkerData {
  id: string
  name: string
  slug: string | null
  area: string | null
  latitude: number
  longitude: number
  price?: number | null
  imageUrl?: string | null
}

interface VenueMarkerProps {
  venue: VenueMarkerData
  isHovered?: boolean
  isActive?: boolean
  onClick?: (venue: VenueMarkerData) => void
  onMouseOver?: (venue: VenueMarkerData) => void
  onMouseOut?: () => void
}

export function VenueMarker({
  venue,
  isHovered = false,
  isActive = false,
  onClick,
  onMouseOver,
  onMouseOut,
}: VenueMarkerProps) {
  const handleClick = useCallback(() => {
    onClick?.(venue)
  }, [onClick, venue])

  const handleMouseOver = useCallback(() => {
    onMouseOver?.(venue)
  }, [onMouseOver, venue])

  // Custom marker icon - larger when hovered or active
  const scale = isHovered || isActive ? 1.3 : 1
  const fillColor = isHovered || isActive ? '#c45a3b' : '#1a1a1a'
  const strokeColor = '#ffffff'

  const icon = {
    path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
    fillColor,
    fillOpacity: 1,
    strokeColor,
    strokeWeight: 2,
    scale,
    anchor: { x: 12, y: 22 } as google.maps.Point,
  }

  return (
    <MarkerF
      position={{ lat: venue.latitude, lng: venue.longitude }}
      icon={icon}
      onClick={handleClick}
      onMouseOver={handleMouseOver}
      onMouseOut={onMouseOut}
      title={venue.name}
      zIndex={isHovered || isActive ? 1000 : 1}
    />
  )
}
