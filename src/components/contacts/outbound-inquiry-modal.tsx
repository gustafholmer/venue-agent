'use client'

import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { useRouter } from 'next/navigation'
import { createOutboundInquiry } from '@/actions/contacts/create-outbound-inquiry'
import { EVENT_TYPES } from '@/lib/constants'

interface OutboundInquiryModalProps {
  contactId: string
  contactName: string
  defaultEventType?: string
  defaultGuestCount?: number
  children: React.ReactNode
}

function getTomorrow(): string {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toISOString().split('T')[0]
}

export function OutboundInquiryModal({
  contactId,
  contactName,
  defaultEventType,
  defaultGuestCount,
  children,
}: OutboundInquiryModalProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [eventDate, setEventDate] = useState('')
  const [eventType, setEventType] = useState(defaultEventType ?? '')
  const [guestCount, setGuestCount] = useState(defaultGuestCount?.toString() ?? '')
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function resetForm() {
    setEventDate('')
    setEventType(defaultEventType ?? '')
    setGuestCount(defaultGuestCount?.toString() ?? '')
    setMessage('')
    setError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    const result = await createOutboundInquiry({
      contactId,
      eventDate,
      eventType,
      guestCount: Number(guestCount),
      message,
    })

    if (result.success && result.inquiryId) {
      setOpen(false)
      resetForm()
      router.push(`/dashboard/inquiries/${result.inquiryId}`)
    } else {
      setError(result.error ?? 'Något gick fel')
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={(value) => { setOpen(value); if (!value) resetForm() }}>
      <Dialog.Trigger asChild>
        {children}
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl p-6 w-full max-w-md z-50 shadow-xl">
          <div className="flex items-start justify-between mb-4">
            <Dialog.Title className="text-lg font-semibold text-[#1a1a1a]">
              Skicka meddelande till {contactName}
            </Dialog.Title>
            <Dialog.Close className="text-[#78716c] hover:text-[#1a1a1a] transition-colors p-1 -mr-1 -mt-1">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="oim-date" className="block text-sm font-medium text-[#1a1a1a] mb-1">
                Datum
              </label>
              <input
                id="oim-date"
                type="date"
                required
                min={getTomorrow()}
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="w-full border border-[#e7e5e4] rounded-lg px-3 py-2 text-sm text-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-[#c45a3b]/30 focus:border-[#c45a3b]"
              />
            </div>

            <div>
              <label htmlFor="oim-event-type" className="block text-sm font-medium text-[#1a1a1a] mb-1">
                Eventtyp
              </label>
              <select
                id="oim-event-type"
                required
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
                className="w-full border border-[#e7e5e4] rounded-lg px-3 py-2 text-sm text-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-[#c45a3b]/30 focus:border-[#c45a3b]"
              >
                <option value="" disabled>Välj eventtyp</option>
                {EVENT_TYPES.map((et) => (
                  <option key={et.value} value={et.value}>{et.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="oim-guests" className="block text-sm font-medium text-[#1a1a1a] mb-1">
                Antal gäster
              </label>
              <input
                id="oim-guests"
                type="number"
                required
                min={1}
                value={guestCount}
                onChange={(e) => setGuestCount(e.target.value)}
                className="w-full border border-[#e7e5e4] rounded-lg px-3 py-2 text-sm text-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-[#c45a3b]/30 focus:border-[#c45a3b]"
              />
            </div>

            <div>
              <label htmlFor="oim-message" className="block text-sm font-medium text-[#1a1a1a] mb-1">
                Meddelande
              </label>
              <textarea
                id="oim-message"
                required
                rows={4}
                placeholder="Skriv ditt meddelande..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full border border-[#e7e5e4] rounded-lg px-3 py-2 text-sm text-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-[#c45a3b]/30 focus:border-[#c45a3b] resize-none"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full px-4 py-2 text-sm font-medium text-white bg-[#c45a3b] rounded-lg hover:bg-[#b04e33] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Skickar...' : 'Skicka meddelande'}
            </button>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
