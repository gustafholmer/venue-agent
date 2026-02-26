'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { getVenueContacts, type ContactListItem, type ContactFilters } from '@/actions/contacts/get-contacts'
import { exportContacts } from '@/actions/contacts/export-contacts'

export default function VenueContactsPage() {
  const { id: venueId } = useParams<{ id: string }>()

  const [contacts, setContacts] = useState<ContactListItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [isExporting, setIsExporting] = useState(false)

  const fetchContacts = useCallback(async () => {
    setIsLoading(true)
    const filters: ContactFilters = {}
    if (search.trim()) {
      filters.search = search.trim()
    }
    const result = await getVenueContacts(venueId, filters)
    if (result.success && result.contacts) {
      setContacts(result.contacts)
      setError(null)
    } else {
      setError(result.error || 'Kunde inte hämta kontakter')
      setContacts([])
    }
    setIsLoading(false)
  }, [venueId, search])

  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchContacts()
    }, 300)
    return () => clearTimeout(timeout)
  }, [fetchContacts])

  async function handleExport() {
    setIsExporting(true)
    try {
      const result = await exportContacts(venueId)
      if (result.success && result.csv) {
        const blob = new Blob([result.csv], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `kontakter-${new Date().toISOString().split('T')[0]}.csv`
        a.click()
        URL.revokeObjectURL(url)
      }
    } finally {
      setIsExporting(false)
    }
  }

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('sv-SE').format(amount) + ' kr'

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('sv-SE')

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="font-[family-name:var(--font-heading)] text-2xl font-semibold text-[#1a1a1a]">
          Kontakter
        </h1>
        <button
          onClick={handleExport}
          disabled={isExporting || contacts.length === 0}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#1a1a1a] bg-white border border-[#e7e5e4] rounded-lg hover:bg-[#fafaf9] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          {isExporting ? 'Exporterar...' : 'Exportera CSV'}
        </button>
      </div>

      {/* Search input */}
      <div className="mb-6">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#a8a29e]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Sök på namn, e-post eller företag..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm border border-[#e7e5e4] rounded-lg bg-white text-[#1a1a1a] placeholder:text-[#a8a29e] focus:outline-none focus:ring-2 focus:ring-[#c45a3b]/20 focus:border-[#c45a3b] transition-colors"
          />
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-start gap-2">
          <span className="flex-1"><p className="text-red-700">{error}</p></span>
          <button onClick={() => setError(null)} className="flex-shrink-0 p-1 hover:bg-red-100 rounded" aria-label="Stäng">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <>
          {/* Mobile skeleton */}
          <div className="lg:hidden bg-white border border-[#e7e5e4] rounded-xl overflow-hidden divide-y divide-[#e7e5e4]">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="p-4 animate-pulse">
                <div className="flex justify-between mb-3">
                  <div className="h-5 bg-[#e7e5e4] rounded w-32" />
                  <div className="h-4 bg-[#e7e5e4] rounded w-20" />
                </div>
                <div className="space-y-2">
                  <div className="h-4 bg-[#e7e5e4] rounded w-48" />
                  <div className="h-4 bg-[#e7e5e4] rounded w-24" />
                  <div className="h-4 bg-[#e7e5e4] rounded w-32" />
                </div>
              </div>
            ))}
          </div>
          {/* Desktop skeleton */}
          <div className="hidden lg:block bg-white border border-[#e7e5e4] rounded-xl overflow-hidden">
            <div className="animate-pulse">
              <div className="bg-[#faf9f7] border-b border-[#e7e5e4] px-6 py-3 flex gap-6">
                <div className="h-4 bg-[#e7e5e4] rounded w-24" />
                <div className="h-4 bg-[#e7e5e4] rounded w-20" />
                <div className="h-4 bg-[#e7e5e4] rounded w-20" />
                <div className="h-4 bg-[#e7e5e4] rounded w-28" />
                <div className="h-4 bg-[#e7e5e4] rounded w-28" />
              </div>
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="px-6 py-4 border-b border-[#e7e5e4] flex gap-6 items-center">
                  <div className="flex-1">
                    <div className="h-5 bg-[#e7e5e4] rounded w-32 mb-1" />
                    <div className="h-4 bg-[#e7e5e4] rounded w-40" />
                  </div>
                  <div className="h-5 bg-[#e7e5e4] rounded w-24" />
                  <div className="h-5 bg-[#e7e5e4] rounded w-16" />
                  <div className="h-5 bg-[#e7e5e4] rounded w-24" />
                  <div className="h-5 bg-[#e7e5e4] rounded w-24" />
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Empty state */}
      {!isLoading && !error && contacts.length === 0 && (
        <div className="bg-white border border-[#e7e5e4] rounded-xl p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-[#f3f4f6] rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-[#a8a29e]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-[#1a1a1a] mb-2">Inga kontakter ännu</h3>
          <p className="text-[#78716c]">
            Kontakter skapas automatiskt när kunder bokar eller skickar förfrågningar.
          </p>
        </div>
      )}

      {/* Contacts list */}
      {!isLoading && !error && contacts.length > 0 && (
        <>
          {/* Mobile card layout */}
          <div className="lg:hidden bg-white border border-[#e7e5e4] rounded-xl overflow-hidden divide-y divide-[#e7e5e4]">
            {contacts.map((contact) => (
              <Link
                key={contact.id}
                href={`/dashboard/venue/${venueId}/contacts/${contact.id}`}
                className="block p-4 hover:bg-[#fafaf9] transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-medium text-[#1a1a1a]">{contact.customer_name}</p>
                    <p className="text-sm text-[#78716c]">{contact.customer_email}</p>
                  </div>
                  <span className="text-sm text-[#78716c]">
                    {formatDate(contact.last_interaction_at)}
                  </span>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[#78716c]">Företag</span>
                    <span className="text-[#57534e]">{contact.company_name || '\u2014'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#78716c]">Bokningar</span>
                    <span className="text-[#57534e]">{contact.completed_bookings}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#78716c]">Totalt spenderat</span>
                    <span className="text-[#57534e]">{formatCurrency(contact.total_spend)}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Desktop table layout */}
          <div className="hidden lg:block bg-white border border-[#e7e5e4] rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-[#faf9f7] border-b border-[#e7e5e4]">
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#78716c] uppercase tracking-wider">
                      Namn
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#78716c] uppercase tracking-wider">
                      Företag
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#78716c] uppercase tracking-wider">
                      Bokningar
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#78716c] uppercase tracking-wider">
                      Totalt spenderat
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#78716c] uppercase tracking-wider">
                      Senaste aktivitet
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e7e5e4]">
                  {contacts.map((contact) => (
                    <tr key={contact.id} className="hover:bg-[#fafaf9] transition-colors">
                      <td className="px-6 py-4">
                        <Link href={`/dashboard/venue/${venueId}/contacts/${contact.id}`} className="block">
                          <p className="font-medium text-[#1a1a1a]">{contact.customer_name}</p>
                          <p className="text-sm text-[#78716c]">{contact.customer_email}</p>
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-[#57534e]">
                        {contact.company_name || '\u2014'}
                      </td>
                      <td className="px-6 py-4 text-[#57534e]">
                        {contact.completed_bookings}
                      </td>
                      <td className="px-6 py-4 text-[#57534e]">
                        {formatCurrency(contact.total_spend)}
                      </td>
                      <td className="px-6 py-4 text-[#78716c]">
                        {formatDate(contact.last_interaction_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
