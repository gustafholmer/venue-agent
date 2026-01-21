'use client'

import { VenueMap, VenueMarkerData } from './index'

interface HomeMapSectionProps {
  venues: VenueMarkerData[]
}

export function HomeMapSection({ venues }: HomeMapSectionProps) {
  return (
    <section className="border-t border-[#e7e5e4]">
      <div className="px-4 sm:px-6 py-12 sm:py-16">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="text-sm uppercase tracking-widest text-[#78716c] mb-2">
              Karta
            </h2>
            <p className="text-xl sm:text-2xl text-[#1a1a1a]">
              Utforska lokaler i Stockholm
            </p>
          </div>
        </div>
        <VenueMap
          venues={venues}
          height="400px"
          className="w-full"
        />
      </div>
    </section>
  )
}
