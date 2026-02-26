'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { getAllContacts, type ContactListItem, type ContactFilters } from '@/actions/contacts/get-contacts'
import { exportContacts } from '@/actions/contacts/export-contacts'

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('sv-SE').format(amount) + ' kr'
}

function ContactCard({ contact }: { contact: ContactListItem }) {
  return (
    <Link
      href={`/dashboard/venue/${contact.venue_id}/contacts/${contact.id}`}
      className="block px-4 sm:px-6 py-4 hover:bg-[#fafaf9] transition-colors border-b border-[#e7e5e4] last:border-b-0"
    >
      <div className="flex items-start justify-between gap-3 mb-1">
        <div className="min-w-0">
          <span className="text-sm font-medium text-[#1a1a1a] block truncate">
            {contact.customer_name}
          </span>
          <span className="text-xs text-[#78716c] block truncate">
            {contact.customer_email}
          </span>
        </div>
        <span className="text-xs text-[#a8a29e] flex-shrink-0">
          {new Date(contact.last_interaction_at).toLocaleDateString('sv-SE')}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-[#78716c]">
        {contact.company_name && (
          <span>{contact.company_name}</span>
        )}
        <span>{contact.venue_name}</span>
        <span>{contact.completed_bookings} bokningar</span>
        <span>{formatCurrency(contact.total_spend)}</span>
      </div>
    </Link>
  )
}

function TableSkeleton() {
  return (
    <div className="animate-pulse">
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} className="flex items-center gap-4 px-6 py-4 border-b border-[#e7e5e4] last:border-b-0">
          <div className="flex-1">
            <div className="h-4 bg-[#e7e5e4] rounded w-32 mb-2" />
            <div className="h-3 bg-[#e7e5e4] rounded w-44" />
          </div>
          <div className="h-3 bg-[#e7e5e4] rounded w-24 hidden lg:block" />
          <div className="h-3 bg-[#e7e5e4] rounded w-20 hidden lg:block" />
          <div className="h-3 bg-[#e7e5e4] rounded w-12 hidden lg:block" />
          <div className="h-3 bg-[#e7e5e4] rounded w-20 hidden lg:block" />
          <div className="h-3 bg-[#e7e5e4] rounded w-20" />
        </div>
      ))}
    </div>
  )
}

export default function ContactsPage() {
  const searchParams = useSearchParams()
  const initialSearch = searchParams.get('search') || ''
  const [contacts, setContacts] = useState<ContactListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState(initialSearch)
  const [exporting, setExporting] = useState(false)

  const fetchContacts = useCallback(async () => {
    setLoading(true)
    const filters: ContactFilters = {}
    if (search.trim()) {
      filters.search = search.trim()
    }
    const result = await getAllContacts(filters)
    if (result.success && result.contacts) {
      setContacts(result.contacts)
    }
    setLoading(false)
  }, [search])

  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchContacts()
    }, 300)
    return () => clearTimeout(timeout)
  }, [fetchContacts])

  async function handleExport() {
    setExporting(true)
    try {
      const result = await exportContacts()
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
      setExporting(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="font-[family-name:var(--font-heading)] text-2xl font-semibold text-[#1a1a1a]">
          Kontakter
        </h1>
        <button
          onClick={handleExport}
          disabled={exporting || contacts.length === 0}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-[#e7e5e4] text-[#1a1a1a] hover:bg-[#fafaf9] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          {exporting ? 'Exporterar...' : 'Exportera CSV'}
        </button>
      </div>

      {/* Search */}
      <div className="mb-4">
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#a8a29e]"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Sök på namn, e-post eller företag..."
            className="w-full pl-10 pr-4 py-2.5 text-sm border border-[#e7e5e4] rounded-lg bg-white text-[#1a1a1a] placeholder:text-[#a8a29e] focus:outline-none focus:ring-2 focus:ring-[#c45a3b]/20 focus:border-[#c45a3b] transition-colors"
          />
        </div>
      </div>

      {/* Content */}
      <div className="bg-white border border-[#e7e5e4] rounded-xl overflow-hidden">
        {loading ? (
          <TableSkeleton />
        ) : contacts.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm text-[#78716c]">
              Inga kontakter ännu. Kontakter skapas automatiskt när kunder bokar eller skickar förfrågningar.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#e7e5e4] bg-[#fafaf9]">
                    <th className="text-left px-6 py-3 text-xs font-medium text-[#78716c] uppercase tracking-wider">Namn</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-[#78716c] uppercase tracking-wider">Företag</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-[#78716c] uppercase tracking-wider">Lokal</th>
                    <th className="text-right px-6 py-3 text-xs font-medium text-[#78716c] uppercase tracking-wider">Bokningar</th>
                    <th className="text-right px-6 py-3 text-xs font-medium text-[#78716c] uppercase tracking-wider">Totalt spenderat</th>
                    <th className="text-right px-6 py-3 text-xs font-medium text-[#78716c] uppercase tracking-wider">Senaste aktivitet</th>
                  </tr>
                </thead>
                <tbody>
                  {contacts.map(contact => (
                    <tr key={contact.id} className="border-b border-[#e7e5e4] last:border-b-0 hover:bg-[#fafaf9] transition-colors">
                      <td className="px-6 py-4">
                        <Link
                          href={`/dashboard/venue/${contact.venue_id}/contacts/${contact.id}`}
                          className="block"
                        >
                          <span className="font-medium text-[#1a1a1a] hover:text-[#c45a3b] transition-colors">
                            {contact.customer_name}
                          </span>
                          <span className="block text-xs text-[#78716c] mt-0.5">
                            {contact.customer_email}
                          </span>
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-[#78716c]">
                        {contact.company_name || '\u2014'}
                      </td>
                      <td className="px-6 py-4 text-[#78716c]">
                        {contact.venue_name}
                      </td>
                      <td className="px-6 py-4 text-right text-[#1a1a1a]">
                        {contact.completed_bookings}
                      </td>
                      <td className="px-6 py-4 text-right text-[#1a1a1a]">
                        {formatCurrency(contact.total_spend)}
                      </td>
                      <td className="px-6 py-4 text-right text-[#a8a29e]">
                        {new Date(contact.last_interaction_at).toLocaleDateString('sv-SE')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile card list */}
            <div className="lg:hidden">
              {contacts.map(contact => (
                <ContactCard key={contact.id} contact={contact} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
