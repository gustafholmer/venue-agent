'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { getInboxItems, type InboxItem } from '@/actions/inbox/get-inbox-items'
import { formatTimestamp } from '@/components/notifications/notification-utils'

const STATUS_TABS = [
  { value: 'all', label: 'Alla' },
  { value: 'open', label: 'Öppna' },
  { value: 'closed', label: 'Stängda' },
  { value: 'converted', label: 'Konverterade' },
] as const

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
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

export default function VenueInquiriesPage() {
  const { id: venueId } = useParams<{ id: string }>()
  const [items, setItems] = useState<InboxItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<string>('all')

  const fetchItems = useCallback(async () => {
    setLoading(true)
    const result = await getInboxItems({
      venueId,
      type: 'inquiry',
      status: activeTab !== 'all' ? activeTab : undefined,
    })
    if (result.success && result.items) {
      setItems(result.items)
    }
    setLoading(false)
  }, [venueId, activeTab])

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h2 className="text-lg font-semibold text-[#1a1a1a]">Förfrågningar</h2>
        <div className="flex gap-1 bg-[#f5f5f4] rounded-lg p-1">
          {STATUS_TABS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setActiveTab(value)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                activeTab === value
                  ? 'bg-white text-[#1a1a1a] shadow-sm'
                  : 'text-[#78716c] hover:text-[#1a1a1a]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white border border-[#e7e5e4] rounded-xl p-4">
              <div className="h-4 bg-[#e7e5e4] rounded w-40 mb-2" />
              <div className="h-3 bg-[#e7e5e4] rounded w-64" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white border border-[#e7e5e4] rounded-xl p-8 text-center text-[#78716c]">
          <p className="text-sm">Inga förfrågningar</p>
        </div>
      ) : (
        <div className="bg-white border border-[#e7e5e4] rounded-xl overflow-hidden divide-y divide-[#e7e5e4]">
          {items.map(item => (
            <Link
              key={item.id}
              href={`/dashboard/inquiries/${item.id}`}
              className="flex items-center justify-between px-4 sm:px-6 py-4 hover:bg-[#fafaf9] transition-colors"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={`text-sm font-medium ${item.unreadCount > 0 ? 'text-[#1a1a1a]' : 'text-[#57534e]'}`}>
                    {item.customerName || item.customerEmail}
                  </span>
                  <StatusBadge status={item.status} />
                  {item.unreadCount > 0 && (
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#c45a3b] text-white text-xs font-medium">
                      {item.unreadCount}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-[#a8a29e]">
                  {item.eventDate && (
                    <span>{new Date(item.eventDate).toLocaleDateString('sv-SE')}</span>
                  )}
                  {item.guestCount != null && item.guestCount > 0 && <span>{item.guestCount} gäster</span>}
                  {item.eventType && <span>{item.eventType}</span>}
                </div>
                {item.lastMessagePreview && (
                  <p className="text-sm text-[#78716c] truncate mt-0.5">
                    {item.lastMessagePreview}
                  </p>
                )}
              </div>
              <div className="flex-shrink-0 ml-4">
                <span className="text-xs text-[#a8a29e]">{formatTimestamp(item.lastActivityAt)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
