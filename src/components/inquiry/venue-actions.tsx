'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { InquiryModal } from '@/components/inquiry/inquiry-modal'

interface VenueActionsProps {
  venueId: string
  venueSlug: string
  venueName: string
  bookingSlug: string
  minCapacity?: number
  maxCapacity?: number
}

export function VenueActions({
  venueId,
  venueSlug,
  venueName,
  bookingSlug,
  minCapacity,
  maxCapacity,
}: VenueActionsProps) {
  const [showInquiryModal, setShowInquiryModal] = useState(false)

  return (
    <>
      <div className="space-y-3">
        <Link href={`/book/${bookingSlug}`} className="block">
          <Button variant="primary" size="lg" className="w-full">
            Skicka bokningsförfrågan
          </Button>
        </Link>
        <Button
          variant="outline"
          size="lg"
          className="w-full"
          onClick={() => setShowInquiryModal(true)}
        >
          Ställ en fråga
        </Button>
      </div>

      <InquiryModal
        venueId={venueId}
        venueSlug={venueSlug}
        venueName={venueName}
        minCapacity={minCapacity}
        maxCapacity={maxCapacity}
        isOpen={showInquiryModal}
        onClose={() => setShowInquiryModal(false)}
      />
    </>
  )
}
