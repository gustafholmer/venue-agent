'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { getContactDetail, type ContactDetail, type TimelineItem } from '@/actions/contacts/get-contact-detail'
import { OutboundInquiryModal } from '@/components/contacts/outbound-inquiry-modal'

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    pending: { label: 'Ny', className: 'bg-yellow-100 text-yellow-700' },
    accepted: { label: 'Accepterad', className: 'bg-green-100 text-green-700' },
    declined: { label: 'Nekad', className: 'bg-red-100 text-red-600' },
    cancelled: { label: 'Avbokad', className: 'bg-gray-100 text-gray-600' },
    completed: { label: 'Genomförd', className: 'bg-green-100 text-green-700' },
    paid_out: { label: 'Utbetald', className: 'bg-green-100 text-green-700' },
    open: { label: 'Öppen', className: 'bg-green-100 text-green-700' },
    closed: { label: 'Stängd', className: 'bg-gray-100 text-gray-600' },
    converted: { label: 'Konverterad', className: 'bg-blue-100 text-blue-700' },
  }
  const { label, className } = config[status] || { label: status, className: 'bg-gray-100 text-gray-600' }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${className}`}>
      {label}
    </span>
  )
}

function TypeBadge({ type }: { type: 'booking' | 'inquiry' }) {
  if (type === 'booking') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
        Bokning
      </span>
    )
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
      Förfrågan
    </span>
  )
}

export default function ContactDetailPage() {
  const { id: venueId, contactId } = useParams<{ id: string; contactId: string }>()

  const [contact, setContact] = useState<ContactDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    async function fetchContact() {
      setIsLoading(true)
      const result = await getContactDetail(contactId)
      if (result.success && result.contact) {
        setContact(result.contact)
        setError(null)
      } else {
        setError(result.error || 'Kunde inte hämta kontaktdetaljer')
        setContact(null)
      }
      setIsLoading(false)
    }
    fetchContact()
  }, [contactId])

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('sv-SE').format(amount) + ' kr'

  function handleExport() {
    if (!contact) return
    const headers = [
      'Namn', 'E-post', 'Telefon', 'Företag',
      'Antal bokningar', 'Totalt spenderat (kr)', 'Eventtyper',
      'Första interaktion', 'Senaste aktivitet',
    ]
    const row = [
      contact.customer_name,
      contact.customer_email,
      contact.customer_phone || '',
      contact.company_name || '',
      String(contact.completed_bookings),
      String(contact.total_spend),
      (contact.event_types || []).join(', '),
      new Date(contact.first_interaction_at).toLocaleDateString('sv-SE'),
      new Date(contact.last_interaction_at).toLocaleDateString('sv-SE'),
    ].map(v => v.includes(',') || v.includes('"') ? `"${v.replace(/"/g, '""')}"` : v)

    const csv = [headers.join(','), row.join(',')].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `kontakt-${contact.customer_name.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Loading skeleton
  if (isLoading) {
    return (
      <div>
        <div className="mb-6">
          <div className="h-4 bg-[#e7e5e4] rounded w-24 animate-pulse" />
        </div>
        <div className="bg-white border border-[#e7e5e4] rounded-xl p-6 mb-6 animate-pulse">
          <div className="h-6 bg-[#e7e5e4] rounded w-48 mb-3" />
          <div className="h-4 bg-[#e7e5e4] rounded w-56 mb-2" />
          <div className="h-4 bg-[#e7e5e4] rounded w-36 mb-6" />
          <div className="grid grid-cols-3 gap-4">
            <div className="h-16 bg-[#e7e5e4] rounded" />
            <div className="h-16 bg-[#e7e5e4] rounded" />
            <div className="h-16 bg-[#e7e5e4] rounded" />
          </div>
        </div>
        <div className="flex gap-3 mb-6">
          <div className="h-10 bg-[#e7e5e4] rounded w-40 animate-pulse" />
          <div className="h-10 bg-[#e7e5e4] rounded w-32 animate-pulse" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-[#e7e5e4] rounded animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div>
        <Link
          href={`/dashboard/venue/${venueId}/contacts`}
          className="inline-flex items-center gap-1 text-sm text-[#78716c] hover:text-[#1a1a1a] transition-colors mb-6"
        >
          <span>&larr;</span> Kontakter
        </Link>
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    )
  }

  if (!contact) return null

  return (
    <div>
      {/* Back link */}
      <Link
        href={`/dashboard/venue/${venueId}/contacts`}
        className="inline-flex items-center gap-1 text-sm text-[#78716c] hover:text-[#1a1a1a] transition-colors mb-6"
      >
        <span>&larr;</span> Kontakter
      </Link>

      {/* 1. Summary Card */}
      <div className="bg-white border border-[#e7e5e4] rounded-xl p-6 mb-6">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-[#1a1a1a]">{contact.customer_name}</h1>
          <p className="text-sm text-[#78716c]">{contact.customer_email}</p>
          {contact.customer_phone && (
            <p className="text-sm text-[#78716c]">{contact.customer_phone}</p>
          )}
          {contact.company_name && (
            <p className="text-sm text-[#78716c]">{contact.company_name}</p>
          )}
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="bg-[#fafaf9] border border-[#e7e5e4] rounded-lg p-4 text-center">
            <p className="text-2xl font-semibold text-[#1a1a1a]">{contact.completed_bookings}</p>
            <p className="text-sm text-[#78716c]">Bokningar</p>
          </div>
          <div className="bg-[#fafaf9] border border-[#e7e5e4] rounded-lg p-4 text-center">
            <p className="text-2xl font-semibold text-[#1a1a1a]">{formatCurrency(contact.total_spend)}</p>
            <p className="text-sm text-[#78716c]">Totalt spenderat</p>
          </div>
          <div className="bg-[#fafaf9] border border-[#e7e5e4] rounded-lg p-4 text-center">
            <p className="text-2xl font-semibold text-[#1a1a1a]">{formatCurrency(contact.average_spend)}</p>
            <p className="text-sm text-[#78716c]">Snittbelopp</p>
          </div>
        </div>
      </div>

      {/* 2. Action Bar */}
      <div className="flex gap-3 mb-8">
        {contact.customer_id ? (
          <OutboundInquiryModal
            contactId={contactId}
            contactName={contact.customer_name}
            defaultEventType={contact.event_types[0]}
          >
            <button
              id="send-message-btn"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#c45a3b] rounded-lg hover:bg-[#b04e33] transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              Skicka meddelande
            </button>
          </OutboundInquiryModal>
        ) : (
          <button
            id="send-message-btn"
            disabled
            title="Kunden behöver ett Tryffle-konto"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#c45a3b] rounded-lg hover:bg-[#b04e33] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            Skicka meddelande
          </button>
        )}
        <button
          onClick={handleExport}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#1a1a1a] bg-white border border-[#e7e5e4] rounded-lg hover:bg-[#fafaf9] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Exportera CSV
        </button>
      </div>

      {/* 3. Activity Timeline */}
      <h2 className="text-lg font-semibold text-[#1a1a1a] mb-4">Aktivitet</h2>

      {contact.timeline.length === 0 ? (
        <div className="bg-white border border-[#e7e5e4] rounded-xl p-8 text-center">
          <p className="text-[#78716c]">Ingen aktivitet registrerad ännu.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {contact.timeline.map((item: TimelineItem) => (
            <Link
              key={`${item.type}-${item.id}`}
              href={item.href}
              className="block bg-white border border-[#e7e5e4] rounded-xl p-4 hover:bg-[#fafaf9] transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-sm text-[#78716c] whitespace-nowrap">
                    {new Date(item.eventDate).toLocaleDateString('sv-SE')}
                  </span>
                  <TypeBadge type={item.type} />
                  <StatusBadge status={item.status} />
                </div>
                <div className="flex items-center gap-4 flex-shrink-0">
                  {item.totalPrice !== null && (
                    <span className="text-sm font-medium text-[#1a1a1a]">
                      {formatCurrency(item.totalPrice)}
                    </span>
                  )}
                </div>
              </div>
              <div className="mt-2">
                <p className="text-sm text-[#1a1a1a]">
                  {item.eventType || 'Event'}
                  {item.guestCount !== null && ` \u00B7 ${item.guestCount} gäster`}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
