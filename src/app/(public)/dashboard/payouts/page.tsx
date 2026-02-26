'use client'

import { useState, useEffect, Suspense } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { getConnectStatus, type ConnectStatus } from '@/actions/stripe/get-connect-status'
import { createConnectAccount } from '@/actions/stripe/create-connect-account'
import { validateOrgNumber, formatOrgNumber } from '@/lib/validation/org-number'
import { getPayoutSummary, type PayoutSummary } from '@/actions/payouts/get-payout-summary'
import {
  getPayoutHistory,
  type PayoutHistoryItem,
  type PayoutStatusFilter,
} from '@/actions/payouts/get-payout-history'
import { formatPrice } from '@/lib/pricing'

const payoutSchema = z.object({
  companyName: z.string().min(2, 'Företagsnamn krävs'),
  orgNumber: z
    .string()
    .regex(/^\d{6}-?\d{4}$/, 'Ogiltigt format (XXXXXX-XXXX)')
    .refine((val) => validateOrgNumber(formatOrgNumber(val)), 'Ogiltigt organisationsnummer'),
  phone: z.string().regex(/^\+?[\d\s-]{8,15}$/, 'Ogiltigt telefonnummer'),
  addressLine1: z.string().min(5, 'Adress krävs'),
  city: z.string().min(2, 'Stad krävs'),
  postalCode: z.string().regex(/^\d{3}\s?\d{2}$/, 'Ogiltigt postnummer (XXX XX)'),
  repFirstName: z.string().min(1, 'Förnamn krävs'),
  repLastName: z.string().min(1, 'Efternamn krävs'),
  repDobDay: z.string().regex(/^\d{1,2}$/, 'Ogiltig dag'),
  repDobMonth: z.string().regex(/^\d{1,2}$/, 'Ogiltig månad'),
  repDobYear: z.string().regex(/^\d{4}$/, 'Ogiltigt år'),
  iban: z.string().regex(/^SE\d{22}$/, 'Ogiltigt IBAN (SE + 22 siffror)'),
  accountHolderName: z.string().min(2, 'Kontoinnehavare krävs'),
})

type PayoutFormData = z.infer<typeof payoutSchema>

const inputClass =
  'w-full px-3 py-2 border border-[#e7e5e4] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c45a3b] focus:border-transparent'

const STATUS_TABS: { value: PayoutStatusFilter; label: string }[] = [
  { value: 'all', label: 'Alla' },
  { value: 'paid_out', label: 'Utbetalda' },
  { value: 'pending', label: 'Väntande' },
]

const PAYOUT_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  paid_out: { label: 'Utbetald', color: 'bg-green-100 text-green-800' },
  completed: { label: 'Väntande', color: 'bg-yellow-100 text-yellow-800' },
}

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('sv-SE', { year: 'numeric', month: 'short', day: 'numeric' })

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="mt-1 text-xs text-red-600">{message}</p>
}

function PayoutsPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialStatus = searchParams.get('status')

  const [connectStatus, setConnectStatus] = useState<ConnectStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [activeTab, setActiveTab] = useState<PayoutStatusFilter>(
    initialStatus === 'paid_out' || initialStatus === 'pending' ? initialStatus : 'all'
  )
  const [summary, setSummary] = useState<PayoutSummary | null>(null)
  const [payouts, setPayouts] = useState<PayoutHistoryItem[]>([])
  const [hasMore, setHasMore] = useState(false)
  const [isLoadingPayouts, setIsLoadingPayouts] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [payoutError, setPayoutError] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PayoutFormData>({
    resolver: zodResolver(payoutSchema),
  })

  useEffect(() => {
    async function load() {
      const status = await getConnectStatus()
      setConnectStatus(status)
      if (status) {
        reset({
          companyName: status.companyName || '',
          orgNumber: status.orgNumber || '',
          phone: status.phone || '',
        })
      }
      setIsLoading(false)
    }
    load()
  }, [reset])

  // Load summary once when connected (independent of tab)
  useEffect(() => {
    if (!connectStatus?.stripeAccountId) return
    async function loadSummary() {
      const result = await getPayoutSummary()
      if (result) {
        setSummary(result)
      } else {
        setPayoutError(true)
      }
    }
    loadSummary()
  }, [connectStatus?.stripeAccountId])

  // Load history when connected or tab changes
  useEffect(() => {
    if (!connectStatus?.stripeAccountId) return
    async function loadHistory() {
      setIsLoadingPayouts(true)
      setPayoutError(false)
      const result = await getPayoutHistory(activeTab)
      if (result) {
        setPayouts(result.items)
        setHasMore(result.hasMore)
      } else {
        setPayoutError(true)
      }
      setIsLoadingPayouts(false)
    }
    loadHistory()
  }, [connectStatus?.stripeAccountId, activeTab])

  const handleTabChange = (tab: PayoutStatusFilter) => {
    setActiveTab(tab)
    const params = new URLSearchParams()
    if (tab !== 'all') params.set('status', tab)
    router.push(params.toString() ? `?${params.toString()}` : '/dashboard/payouts')
  }

  const handleLoadMore = async () => {
    setIsLoadingMore(true)
    const result = await getPayoutHistory(activeTab, 20, payouts.length)
    if (result) {
      setPayouts((prev) => [...prev, ...result.items])
      setHasMore(result.hasMore)
    } else {
      setPayoutError(true)
    }
    setIsLoadingMore(false)
  }

  const onSubmit = async (data: PayoutFormData) => {
    setIsSubmitting(true)
    setMessage(null)

    const result = await createConnectAccount({
      companyName: data.companyName,
      orgNumber: formatOrgNumber(data.orgNumber).replace('-', ''),
      phone: data.phone.replace(/[\s-]/g, ''),
      addressLine1: data.addressLine1,
      city: data.city,
      postalCode: data.postalCode.replace(/\s/g, ''),
      repFirstName: data.repFirstName,
      repLastName: data.repLastName,
      repDobDay: parseInt(data.repDobDay, 10),
      repDobMonth: parseInt(data.repDobMonth, 10),
      repDobYear: parseInt(data.repDobYear, 10),
      iban: data.iban,
      accountHolderName: data.accountHolderName,
    })

    if (result.success) {
      setMessage({ type: 'success', text: 'Kontot skapades! Verifiering pågår.' })
      const updated = await getConnectStatus()
      setConnectStatus(updated)
    } else {
      setMessage({ type: 'error', text: result.error })
    }

    setIsSubmitting(false)
  }

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto animate-pulse">
        <div className="mb-8">
          <div className="h-8 bg-[#e7e5e4] rounded w-48 mb-2" />
          <div className="h-5 bg-[#e7e5e4] rounded w-72" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white border border-[#e7e5e4] rounded-xl p-5">
              <div className="h-4 bg-[#e7e5e4] rounded w-24 mb-3" />
              <div className="h-7 bg-[#e7e5e4] rounded w-32" />
            </div>
          ))}
        </div>
        <div className="bg-white border border-[#e7e5e4] rounded-xl p-6">
          <div className="space-y-4">
            <div className="h-10 bg-[#e7e5e4] rounded" />
            <div className="h-10 bg-[#e7e5e4] rounded" />
            <div className="h-10 bg-[#e7e5e4] rounded" />
            <div className="h-10 bg-[#e7e5e4] rounded" />
            <div className="h-10 bg-[#e7e5e4] rounded" />
          </div>
        </div>
      </div>
    )
  }

  // Connected state — full dashboard
  if (connectStatus?.stripeAccountId) {
    const accountStatus = connectStatus.stripeAccountStatus || 'pending'
    const statusBadge =
      accountStatus === 'verified'
        ? { label: 'Verifierad', color: 'bg-green-100 text-green-800' }
        : accountStatus === 'restricted'
          ? { label: 'Åtgärd krävs', color: 'bg-yellow-100 text-yellow-800' }
          : { label: 'Väntar', color: 'bg-blue-100 text-blue-800' }

    return (
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <h1 className="font-[family-name:var(--font-heading)] text-2xl font-semibold text-[#1a1a1a]">
              Utbetalningar
            </h1>
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusBadge.color}`}
            >
              {statusBadge.label}
            </span>
          </div>
          <p className="text-[#78716c] mt-1">Hantera dina utbetalningar och se transaktionshistorik</p>
        </div>

        {/* Restricted banner */}
        {accountStatus === 'restricted' && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-start gap-3">
            <svg
              className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
            <div>
              <p className="text-sm font-medium text-yellow-800">Åtgärd krävs</p>
              <p className="text-sm text-yellow-700 mt-0.5">
                Stripe behöver ytterligare information för att verifiera ditt konto. Kontrollera din e-post
                för instruktioner.
              </p>
            </div>
          </div>
        )}

        {/* Pending banner */}
        {accountStatus === 'pending' && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
            <svg
              className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            <div>
              <p className="text-sm font-medium text-blue-800">Verifiering pågår</p>
              <p className="text-sm text-blue-700 mt-0.5">
                Stripe granskar dina uppgifter. Detta tar vanligtvis 1-2 arbetsdagar.
              </p>
            </div>
          </div>
        )}

        {/* Error banner */}
        {payoutError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800">
            Kunde inte hämta utbetalningsdata. Försök igen senare.
          </div>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {isLoadingPayouts ? (
            <>
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white border border-[#e7e5e4] rounded-xl p-5 animate-pulse">
                  <div className="h-4 bg-[#e7e5e4] rounded w-24 mb-3" />
                  <div className="h-7 bg-[#e7e5e4] rounded w-32" />
                </div>
              ))}
            </>
          ) : (
            <>
              <div className="bg-white border border-[#e7e5e4] rounded-xl p-5">
                <p className="text-sm text-[#78716c] mb-1">Total intjänat</p>
                <p className="text-2xl font-semibold text-[#1a1a1a]">
                  {formatPrice(summary?.totalEarned ?? 0)}
                </p>
              </div>
              <div className="bg-white border border-[#e7e5e4] rounded-xl p-5">
                <p className="text-sm text-[#78716c] mb-1">Väntande utbetalning</p>
                <p className="text-2xl font-semibold text-[#c45a3b]">
                  {formatPrice(summary?.pendingPayout ?? 0)}
                </p>
              </div>
              <div className="bg-white border border-[#e7e5e4] rounded-xl p-5">
                <p className="text-sm text-[#78716c] mb-1">Senaste utbetalning</p>
                <p className="text-2xl font-semibold text-[#1a1a1a]">
                  {summary?.lastPayoutAmount != null ? formatPrice(summary.lastPayoutAmount) : '-'}
                </p>
                {summary?.lastPayoutDate && (
                  <p className="text-xs text-[#a8a29e] mt-1">{formatDate(summary.lastPayoutDate)}</p>
                )}
              </div>
            </>
          )}
        </div>

        {/* Account info card */}
        <div className="bg-white border border-[#e7e5e4] rounded-xl p-5 mb-8 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#f5f3f0] flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-[#57534e]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
              />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-[#1a1a1a]">
              {connectStatus.companyName || 'Ditt företag'}
            </p>
            <p className="text-xs text-[#a8a29e]">Ansluten via Stripe</p>
          </div>
        </div>

        {/* Payout history */}
        <div className="bg-white border border-[#e7e5e4] rounded-xl">
          {/* Tab filter */}
          <div className="border-b border-[#e7e5e4] px-5">
            <div className="flex gap-6">
              {STATUS_TABS.map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => handleTabChange(tab.value)}
                  className={`py-3 text-sm font-medium transition-colors ${
                    activeTab === tab.value
                      ? 'text-[#c45a3b] border-b-2 border-[#c45a3b] -mb-[1px]'
                      : 'text-[#78716c] hover:text-[#57534e]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Loading state */}
          {isLoadingPayouts ? (
            <div className="p-5 space-y-4 animate-pulse">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="h-4 bg-[#e7e5e4] rounded w-24" />
                  <div className="h-4 bg-[#e7e5e4] rounded w-32 flex-1" />
                  <div className="h-4 bg-[#e7e5e4] rounded w-20" />
                  <div className="h-4 bg-[#e7e5e4] rounded w-16" />
                </div>
              ))}
            </div>
          ) : payouts.length === 0 ? (
            /* Empty state */
            <div className="p-12 text-center">
              <svg
                className="w-12 h-12 text-[#d6d3d1] mx-auto mb-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
              <p className="text-[#78716c] text-sm">Inga utbetalningar att visa</p>
            </div>
          ) : (
            <>
              {/* Mobile cards */}
              <div className="lg:hidden divide-y divide-[#e7e5e4]">
                {payouts.map((payout) => {
                  const statusInfo = PAYOUT_STATUS_LABELS[payout.status] || {
                    label: payout.status,
                    color: 'bg-gray-100 text-gray-800',
                  }
                  return (
                    <div key={payout.id} className="p-4 hover:bg-[#fafaf9] transition-colors">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium text-[#1a1a1a]">{payout.eventType}</p>
                        <p className="text-sm font-medium text-[#1a1a1a]">
                          {formatPrice(payout.venuePayout)}
                        </p>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-[#78716c]">
                          {payout.venueName} &middot; {formatDate(payout.eventDate)}
                        </p>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.color}`}
                        >
                          {statusInfo.label}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Desktop table */}
              <div className="hidden lg:block">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#e7e5e4]">
                      <th className="text-left text-xs font-medium text-[#78716c] uppercase tracking-wider px-5 py-3">
                        Datum
                      </th>
                      <th className="text-left text-xs font-medium text-[#78716c] uppercase tracking-wider px-5 py-3">
                        Bokning
                      </th>
                      <th className="text-left text-xs font-medium text-[#78716c] uppercase tracking-wider px-5 py-3">
                        Lokal
                      </th>
                      <th className="text-right text-xs font-medium text-[#78716c] uppercase tracking-wider px-5 py-3">
                        Belopp
                      </th>
                      <th className="text-right text-xs font-medium text-[#78716c] uppercase tracking-wider px-5 py-3">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e7e5e4]">
                    {payouts.map((payout) => {
                      const statusInfo = PAYOUT_STATUS_LABELS[payout.status] || {
                        label: payout.status,
                        color: 'bg-gray-100 text-gray-800',
                      }
                      return (
                        <tr key={payout.id} className="hover:bg-[#fafaf9] transition-colors">
                          <td className="px-5 py-3 text-sm text-[#57534e]">
                            {formatDate(payout.eventDate)}
                          </td>
                          <td className="px-5 py-3 text-sm text-[#1a1a1a]">{payout.eventType}</td>
                          <td className="px-5 py-3 text-sm text-[#57534e]">{payout.venueName}</td>
                          <td className="px-5 py-3 text-sm text-[#1a1a1a] text-right font-medium">
                            {formatPrice(payout.venuePayout)}
                          </td>
                          <td className="px-5 py-3 text-right">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.color}`}
                            >
                              {statusInfo.label}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Load more */}
              {hasMore && (
                <div className="border-t border-[#e7e5e4] p-4 text-center">
                  <button
                    onClick={handleLoadMore}
                    disabled={isLoadingMore}
                    className="text-sm font-medium text-[#c45a3b] hover:text-[#a34832] disabled:opacity-50 transition-colors"
                  >
                    {isLoadingMore ? 'Laddar...' : 'Visa fler'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    )
  }

  // Onboarding form
  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="font-[family-name:var(--font-heading)] text-2xl font-semibold text-[#1a1a1a]">
          Utbetalningar
        </h1>
        <p className="text-[#78716c] mt-1">
          Anslut ditt bankkonto för att ta emot utbetalningar från bokningar
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Företagsuppgifter */}
        <div className="bg-white border border-[#e7e5e4] rounded-xl p-6">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-[#f5f3f0] flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-[#57534e]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[#1a1a1a]">Företagsuppgifter</h2>
              <p className="text-sm text-[#78716c]">Grundläggande information om ditt företag</p>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label htmlFor="companyName" className="block text-sm font-medium text-[#57534e] mb-1">
                Företagsnamn
              </label>
              <input type="text" id="companyName" {...register('companyName')} className={inputClass} />
              <FieldError message={errors.companyName?.message} />
            </div>

            <div>
              <label htmlFor="orgNumber" className="block text-sm font-medium text-[#57534e] mb-1">
                Organisationsnummer
              </label>
              <input
                type="text"
                id="orgNumber"
                {...register('orgNumber')}
                className={inputClass}
                placeholder="XXXXXX-XXXX"
              />
              <FieldError message={errors.orgNumber?.message} />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-[#57534e] mb-1">
                Telefonnummer
              </label>
              <input
                type="tel"
                id="phone"
                {...register('phone')}
                className={inputClass}
                placeholder="+46 70 123 45 67"
              />
              <FieldError message={errors.phone?.message} />
            </div>

            <div>
              <label htmlFor="addressLine1" className="block text-sm font-medium text-[#57534e] mb-1">
                Adress
              </label>
              <input type="text" id="addressLine1" {...register('addressLine1')} className={inputClass} />
              <FieldError message={errors.addressLine1?.message} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="postalCode" className="block text-sm font-medium text-[#57534e] mb-1">
                  Postnummer
                </label>
                <input
                  type="text"
                  id="postalCode"
                  {...register('postalCode')}
                  className={inputClass}
                  placeholder="123 45"
                />
                <FieldError message={errors.postalCode?.message} />
              </div>
              <div>
                <label htmlFor="city" className="block text-sm font-medium text-[#57534e] mb-1">
                  Stad
                </label>
                <input type="text" id="city" {...register('city')} className={inputClass} />
                <FieldError message={errors.city?.message} />
              </div>
            </div>
          </div>
        </div>

        {/* Företrädare */}
        <div className="bg-white border border-[#e7e5e4] rounded-xl p-6">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-[#f5f3f0] flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-[#57534e]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[#1a1a1a]">Företrädare</h2>
              <p className="text-sm text-[#78716c]">Uppgifter om den som företräder bolaget</p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="repFirstName" className="block text-sm font-medium text-[#57534e] mb-1">
                  Förnamn
                </label>
                <input type="text" id="repFirstName" {...register('repFirstName')} className={inputClass} />
                <FieldError message={errors.repFirstName?.message} />
              </div>
              <div>
                <label htmlFor="repLastName" className="block text-sm font-medium text-[#57534e] mb-1">
                  Efternamn
                </label>
                <input type="text" id="repLastName" {...register('repLastName')} className={inputClass} />
                <FieldError message={errors.repLastName?.message} />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#57534e] mb-1">Födelsedatum</label>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <input
                    type="text"
                    {...register('repDobYear')}
                    className={inputClass}
                    placeholder="År (ÅÅÅÅ)"
                  />
                  <FieldError message={errors.repDobYear?.message} />
                </div>
                <div>
                  <input
                    type="text"
                    {...register('repDobMonth')}
                    className={inputClass}
                    placeholder="Månad"
                  />
                  <FieldError message={errors.repDobMonth?.message} />
                </div>
                <div>
                  <input
                    type="text"
                    {...register('repDobDay')}
                    className={inputClass}
                    placeholder="Dag"
                  />
                  <FieldError message={errors.repDobDay?.message} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bankuppgifter */}
        <div className="bg-white border border-[#e7e5e4] rounded-xl p-6">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-[#f5f3f0] flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-[#57534e]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[#1a1a1a]">Bankuppgifter</h2>
              <p className="text-sm text-[#78716c]">Bankkonto för utbetalningar</p>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label htmlFor="iban" className="block text-sm font-medium text-[#57534e] mb-1">
                IBAN
              </label>
              <input
                type="text"
                id="iban"
                {...register('iban')}
                className={inputClass}
                placeholder="SE0000000000000000000000"
              />
              <FieldError message={errors.iban?.message} />
            </div>

            <div>
              <label htmlFor="accountHolderName" className="block text-sm font-medium text-[#57534e] mb-1">
                Kontoinnehavare
              </label>
              <input
                type="text"
                id="accountHolderName"
                {...register('accountHolderName')}
                className={inputClass}
              />
              <FieldError message={errors.accountHolderName?.message} />
            </div>
          </div>
        </div>

        {/* ToS notice */}
        <p className="text-xs text-[#78716c]">
          Genom att skicka in detta formulär godkänner du{' '}
          <a
            href="https://stripe.com/connect-account/legal"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#c45a3b] underline hover:text-[#a34832]"
          >
            Stripes villkor för anslutna konton
          </a>
          .
        </p>

        {message && (
          <div
            className={`p-3 rounded-lg text-sm flex items-start gap-2 ${
              message.type === 'success'
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}
          >
            <span className="flex-1">{message.text}</span>
            <button
              type="button"
              onClick={() => setMessage(null)}
              className={`flex-shrink-0 p-1 rounded ${message.type === 'success' ? 'hover:bg-green-100' : 'hover:bg-red-100'}`}
              aria-label="Stäng"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        <Button type="submit" loading={isSubmitting}>
          Anslut konto
        </Button>
      </form>
    </div>
  )
}

export default function PayoutsPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-4xl mx-auto animate-pulse">
          <div className="mb-8">
            <div className="h-8 bg-[#e7e5e4] rounded w-48 mb-2" />
            <div className="h-5 bg-[#e7e5e4] rounded w-72" />
          </div>
        </div>
      }
    >
      <PayoutsPageContent />
    </Suspense>
  )
}
