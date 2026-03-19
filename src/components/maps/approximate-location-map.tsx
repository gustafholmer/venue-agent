'use client'

import { GoogleMap, Circle } from '@react-google-maps/api'
import { useGoogleMaps } from './google-maps-provider'
import { MapPlaceholder } from './map-placeholder'

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

interface ApproximateLocationMapProps {
  latitude: number
  longitude: number
}

export function ApproximateLocationMap({ latitude, longitude }: ApproximateLocationMapProps) {
  const { isLoaded, loadError } = useGoogleMaps()

  if (loadError) return null
  if (!isLoaded) return <MapPlaceholder height="250px" />

  const center = { lat: latitude, lng: longitude }

  return (
    <div className="rounded-xl overflow-hidden">
      <GoogleMap
        mapContainerStyle={{ width: '100%', height: '250px' }}
        center={center}
        zoom={14}
        options={{
          disableDefaultUI: true,
          zoomControl: true,
          styles: mapStyles,
          gestureHandling: 'cooperative',
        }}
      >
        <Circle
          center={center}
          radius={500}
          options={{
            fillColor: '#c45a3b',
            fillOpacity: 0.12,
            strokeColor: '#c45a3b',
            strokeOpacity: 0.4,
            strokeWeight: 1.5,
          }}
        />
      </GoogleMap>
    </div>
  )
}
