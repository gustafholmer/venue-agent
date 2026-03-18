'use client'

import { OverlayViewF, OVERLAY_MOUSE_TARGET } from '@react-google-maps/api'
import { useRef, useEffect, useState, type RefObject } from 'react'
import Link from 'next/link'
import type { VenueMarkerData } from './venue-marker'

interface MapInfoWindowProps {
  venue: VenueMarkerData
  onClose: () => void
  mapContainerRef: RefObject<HTMLDivElement | null>
}

const CARD_WIDTH = 240
const MARKER_GAP = 12
const PADDING = 24

function formatPrice(price: number | null | undefined): string {
  if (!price) return 'Pris på förfrågan'
  return `från ${price.toLocaleString('sv-SE')} kr`
}

export function MapInfoWindow({ venue, onClose, mapContainerRef }: MapInfoWindowProps) {
  const href = venue.slug ? `/venues/${venue.slug}` : `/venues/${venue.id}`
  const contentRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    setVisible(false)

    const timeout = setTimeout(() => {
        const el = contentRef.current
        const mapContainer = mapContainerRef.current
        if (!el || !mapContainer) return

        const cardHeight = el.offsetHeight
        const mapRect = mapContainer.getBoundingClientRect()
        const elRect = el.getBoundingClientRect()

        // Marker position relative to the map container
        const markerX = elRect.left - mapRect.left
        const markerY = elRect.top - mapRect.top

        const spaceAbove = markerY
        const spaceBelow = mapRect.height - markerY
        const spaceLeft = markerX
        const spaceRight = mapRect.width - markerX

        const spaces = [
          { dir: 'above' as const, space: spaceAbove },
          { dir: 'below' as const, space: spaceBelow },
          { dir: 'left' as const, space: spaceLeft },
          { dir: 'right' as const, space: spaceRight },
        ]

        const best = spaces.sort((a, b) => b.space - a.space)[0].dir

        let x = 0
        let y = 0

        switch (best) {
          case 'above':
            x = -(CARD_WIDTH / 2)
            y = -(cardHeight + MARKER_GAP)
            break
          case 'below':
            x = -(CARD_WIDTH / 2)
            y = MARKER_GAP
            break
          case 'left':
            x = -(CARD_WIDTH + MARKER_GAP)
            y = -(cardHeight / 2)
            break
          case 'right':
            x = MARKER_GAP
            y = -(cardHeight / 2)
            break
        }

        // Clamp so the card stays fully within the map
        const cardLeft = markerX + x
        const cardRight = cardLeft + CARD_WIDTH
        const cardTop = markerY + y
        const cardBottom = cardTop + cardHeight

        if (cardLeft < PADDING) {
          x += PADDING - cardLeft
        } else if (cardRight > mapRect.width - PADDING) {
          x -= cardRight - (mapRect.width - PADDING)
        }

        if (cardTop < PADDING) {
          y += PADDING - cardTop
        } else if (cardBottom > mapRect.height - PADDING) {
          y -= cardBottom - (mapRect.height - PADDING)
        }

        setPosition({ x, y })
        setVisible(true)
    }, 50)

    return () => clearTimeout(timeout)
  }, [venue.id, mapContainerRef])

  return (
    <OverlayViewF
      position={{ lat: venue.latitude, lng: venue.longitude }}
      mapPaneName={OVERLAY_MOUSE_TARGET}
      getPixelPositionOffset={() => ({ x: 0, y: 0 })}
    >
      <div
        ref={contentRef}
        style={{
          visibility: visible ? 'visible' : 'hidden',
          transform: `translate(${position.x}px, ${position.y}px)`,
          width: CARD_WIDTH,
        }}
      >
        <div className="relative bg-white rounded-lg shadow-lg overflow-hidden">
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClose() }}
            className="absolute top-2 right-2 z-10 w-6 h-6 flex items-center justify-center rounded-full bg-white shadow-md hover:bg-[#f5f5f4] transition-colors"
            aria-label="Stäng"
          >
            <svg className="w-3 h-3 text-[#1a1a1a]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <Link href={href} className="block group">
            {venue.imageUrl && (
              <div className="aspect-[3/2] w-full overflow-hidden">
                <img
                  src={venue.imageUrl}
                  alt={venue.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
            )}
            <div className="p-3">
              <h3 className="font-medium text-[#1a1a1a] group-hover:text-[#c45a3b] transition-colors text-sm">
                {venue.name}
              </h3>
              {venue.area && (
                <p className="text-xs text-[#78716c] mt-0.5">{venue.area}</p>
              )}
              <p className="text-xs text-[#1a1a1a] mt-1">{formatPrice(venue.price)}</p>
              <span className="inline-block mt-2 text-xs text-[#c45a3b] group-hover:underline">
                Visa lokal →
              </span>
            </div>
          </Link>
        </div>
      </div>
    </OverlayViewF>
  )
}
