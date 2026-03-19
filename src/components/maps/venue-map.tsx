'use client'

import { GoogleMap } from '@react-google-maps/api'
import { useState, useCallback, useMemo, useRef } from 'react'
import { useGoogleMaps } from './google-maps-provider'
import { MapPlaceholder } from './map-placeholder'
import { VenueMarker, VenueMarkerData } from './venue-marker'
import { MapInfoWindow } from './map-info-window'

// Custom map styles for warm color palette
const mapStyles: google.maps.MapTypeStyle[] = [
  {
    featureType: 'all',
    elementType: 'geometry',
    stylers: [{ saturation: -20 }],
  },
  {
    featureType: 'poi',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'transit',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'road',
    elementType: 'labels.icon',
    stylers: [{ visibility: 'off' }],
  },
]

// Default center: Stockholm
const defaultCenter = { lat: 59.3293, lng: 18.0686 }

interface VenueMapProps {
  venues: VenueMarkerData[]
  height?: string
  className?: string
  hoveredVenueId?: string | null
  onVenueHover?: (venueId: string | null) => void
  singleVenue?: boolean
  zoom?: number
}

export function VenueMap({
  venues,
  height = '400px',
  className = '',
  hoveredVenueId,
  onVenueHover,
  singleVenue = false,
  zoom,
}: VenueMapProps) {
  const { isLoaded, loadError } = useGoogleMaps()
  const [activeVenue, setActiveVenue] = useState<VenueMarkerData | null>(null)
  const [map, setMap] = useState<google.maps.Map | null>(null)
  const mapWrapperRef = useRef<HTMLDivElement>(null)

  // Calculate bounds when map loads (can't use google.maps during SSR)
  const fitMapToBounds = useCallback(
    (map: google.maps.Map) => {
      if (venues.length <= 1) return

      const bounds = new google.maps.LatLngBounds()
      venues.forEach((venue) => {
        bounds.extend({ lat: venue.latitude, lng: venue.longitude })
      })
      map.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 })
    },
    [venues]
  )

  // Calculate center
  const center = useMemo(() => {
    if (venues.length === 0) return defaultCenter
    if (venues.length === 1) {
      return { lat: venues[0].latitude, lng: venues[0].longitude }
    }
    // For multiple venues, the bounds will handle positioning
    return defaultCenter
  }, [venues])

  // Calculate appropriate zoom level
  const mapZoom = useMemo(() => {
    if (zoom) return zoom
    if (singleVenue || venues.length === 1) return 15
    return 12
  }, [zoom, singleVenue, venues.length])

  const onLoad = useCallback(
    (map: google.maps.Map) => {
      setMap(map)
      // Fit to bounds if we have multiple venues
      fitMapToBounds(map)
    },
    [fitMapToBounds]
  )

  const onUnmount = useCallback(() => {
    setMap(null)
  }, [])

  const handleMarkerClick = useCallback((venue: VenueMarkerData) => {
    setActiveVenue(venue)
  }, [])

  const handleMarkerHover = useCallback(
    (venue: VenueMarkerData) => {
      onVenueHover?.(venue.id)
    },
    [onVenueHover]
  )

  const handleMarkerLeave = useCallback(() => {
    onVenueHover?.(null)
  }, [onVenueHover])

  const handleInfoWindowClose = useCallback(() => {
    setActiveVenue(null)
  }, [])

  // Show placeholder if not loaded or error
  if (!isLoaded) {
    return <MapPlaceholder height={height} className={className} />
  }

  if (loadError) {
    return <MapPlaceholder height={height} className={className} />
  }

  return (
    <div ref={mapWrapperRef} className={`rounded-lg overflow-hidden ${className}`} style={{ height }}>
      <GoogleMap
        mapContainerStyle={{ width: '100%', height: '100%' }}
        center={center}
        zoom={mapZoom}
        onLoad={onLoad}
        onUnmount={onUnmount}
        onClick={handleInfoWindowClose}
        options={{
          styles: mapStyles,
          disableDefaultUI: true,
          zoomControl: true,
        }}
      >
        {venues.map((venue) => (
          <VenueMarker
            key={venue.id}
            venue={venue}
            isHovered={hoveredVenueId === venue.id}
            isActive={activeVenue?.id === venue.id}
            onClick={singleVenue ? undefined : handleMarkerClick}
            onMouseOver={singleVenue ? undefined : handleMarkerHover}
            onMouseOut={singleVenue ? undefined : handleMarkerLeave}
          />
        ))}

        {activeVenue && !singleVenue && (
          <MapInfoWindow venue={activeVenue} onClose={handleInfoWindowClose} mapContainerRef={mapWrapperRef} />
        )}
      </GoogleMap>
    </div>
  )
}
