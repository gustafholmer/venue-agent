'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { getInboxItems, type InboxItem, type InboxFilters } from '@/actions/inbox/get-inbox-items'
import { formatTimestamp } from '@/components/notifications/notification-utils'

const TYPE_FILTERS = [
  { value: 'all', label: 'Alla' },
  { value: 'inquiry', label: 'Förfrågningar' },
  { value: 'booking', label: 'Bokningar' },
] as const

function TypeBadge({ type }: { type: 'inquiry' | 'booking' }) {
  if (type === 'inquiry') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
        Förfrågan
      </span>
    )
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
      Bokning
    </span>
  )
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    open: { label: 'Öppen', className: 'bg-green-100 text-green-700' },
    closed: { label: 'Stängd', className: 'bg-gray-100 text-gray-600' },
    converted: { label: 'Konverterad', className: 'bg-blue-100 text-blue-700' },
    pending: { label: 'Ny', className: 'bg-yellow-100 text-yellow-700' },
    accepted: { label: 'Accepterad', className: 'bg-green-100 text-green-700' },
    declined: { label: 'Nekad', className: 'bg-red-100 text-red-600' },
    cancelled: { label: 'Avbokad', className: 'bg-gray-100 text-gray-600' },
  }
  const { label, className } = config[status] || { label: status, className: 'bg-gray-100 text-gray-600' }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${className}`}>
      {label}
    </span>
  )
}

function InboxCard({ item }: { item: InboxItem }) {
  const href = item.type === 'inquiry'
    ? `/dashboard/inquiries/${item.id}`
    : `/dashboard/venue/${item.venueId}/bookings/${item.id}`

  return (
    <Link
      href={href}
      className="flex items-start gap-4 px-4 sm:px-6 py-4 hover:bg-[#fafaf9] transition-colors border-b border-[#e7e5e4] last:border-b-0"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <TypeBadge type={item.type} />
          <StatusBadge status={item.status} />
          {item.unreadCount > 0 && (
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#c45a3b] text-white text-xs font-medium">
              {item.unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-baseline gap-2">
          <span className={`text-sm font-medium ${item.unreadCount > 0 ? 'text-[#1a1a1a]' : 'text-[#57534e]'}`}>
            {item.customerName || item.customerEmail}
          </span>
          <span className="text-xs text-[#a8a29e]">—</span>
          <span className="text-xs text-[#78716c]">{item.venueName}</span>
        </div>
        {item.lastMessagePreview && (
          <p className="text-sm text-[#78716c] truncate mt-0.5">
            {item.lastMessagePreview}
          </p>
        )}
        <div className="flex items-center gap-3 mt-1 text-xs text-[#a8a29e]">
          {item.eventDate && (
            <span>{new Date(item.eventDate).toLocaleDateString('sv-SE')}</span>
          )}
          {item.guestCount != null && item.guestCount > 0 && <span>{item.guestCount} gäster</span>}
          {item.eventType && <span>{item.eventType}</span>}
        </div>
      </div>
      <div className="flex-shrink-0 text-right">
        <span className="text-xs text-[#a8a29e]">
          {formatTimestamp(item.lastActivityAt)}
        </span>
      </div>
    </Link>
  )
}

export default function InboxPage() {
  const searchParams = useSearchParams()
  const initialType = searchParams.get('type')
  const [items, setItems] = useState<InboxItem[]>([])
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState<'all' | 'inquiry' | 'booking'>(
    initialType === 'inquiry' || initialType === 'booking' ? initialType : 'all'
  )

  const fetchItems = useCallback(async () => {
    setLoading(true)
    const filters: InboxFilters = {}
    if (typeFilter !== 'all') {
      filters.type = typeFilter
    }
    const result = await getInboxItems(filters)
    if (result.success && result.items) {
      setItems(result.items)
    }
    setLoading(false)
  }, [typeFilter])

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="font-[family-name:var(--font-heading)] text-2xl font-semibold text-[#1a1a1a]">
          Inkorg
        </h1>
        <div className="flex gap-1 bg-[#f5f5f4] rounded-lg p-1">
          {TYPE_FILTERS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setTypeFilter(value as typeof typeFilter)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                typeFilter === value
                  ? 'bg-white text-[#1a1a1a] shadow-sm'
                  : 'text-[#78716c] hover:text-[#1a1a1a]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white border border-[#e7e5e4] rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-pulse">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex gap-4 px-6 py-4">
                  <div className="flex-1">
                    <div className="h-4 bg-[#e7e5e4] rounded w-32 mb-2" />
                    <div className="h-3 bg-[#e7e5e4] rounded w-48" />
                  </div>
                  <div className="h-3 bg-[#e7e5e4] rounded w-16" />
                </div>
              ))}
            </div>
          </div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-[#78716c]">
            <p className="text-sm">Inga meddelanden ännu</p>
          </div>
        ) : (
          items.map(item => (
            <InboxCard key={`${item.type}-${item.id}`} item={item} />
          ))
        )}
      </div>
    </div>
  )
}
