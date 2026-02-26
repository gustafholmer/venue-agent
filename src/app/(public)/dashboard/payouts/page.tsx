'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { getConnectStatus, type ConnectStatus } from '@/actions/stripe/get-connect-status'
import { createConnectAccount } from '@/actions/stripe/create-connect-account'
import { validateOrgNumber, formatOrgNumber } from '@/lib/validation/org-number'

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

function StatusCard({ status }: { status: string }) {
  if (status === 'verified') {
    return (
      <div className="bg-white border border-green-200 rounded-xl p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 bg-green-50 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-[#1a1a1a] mb-2">Utbetalningar aktiverade</h3>
        <p className="text-[#78716c]">Ditt konto är verifierat och redo att ta emot utbetalningar.</p>
      </div>
    )
  }

  if (status === 'restricted') {
    return (
      <div className="bg-white border border-yellow-200 rounded-xl p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 bg-yellow-50 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-[#1a1a1a] mb-2">Åtgärd krävs</h3>
        <p className="text-[#78716c]">
          Stripe behöver ytterligare information för att verifiera ditt konto. Kontrollera din e-post för instruktioner.
        </p>
      </div>
    )
  }

  // pending
  return (
    <div className="bg-white border border-[#e7e5e4] rounded-xl p-8 text-center">
      <div className="w-16 h-16 mx-auto mb-4 bg-blue-50 rounded-full flex items-center justify-center">
        <svg className="w-8 h-8 text-blue-600 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
      <h3 className="text-lg font-medium text-[#1a1a1a] mb-2">Verifiering pågår</h3>
      <p className="text-[#78716c]">
        Stripe granskar dina uppgifter. Detta tar vanligtvis 1–2 arbetsdagar.
      </p>
    </div>
  )
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="mt-1 text-xs text-red-600">{message}</p>
}

export default function PayoutsPage() {
  const [connectStatus, setConnectStatus] = useState<ConnectStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

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

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto animate-pulse">
        <div className="mb-8">
          <div className="h-8 bg-[#e7e5e4] rounded w-40 mb-2" />
          <div className="h-5 bg-[#e7e5e4] rounded w-64" />
        </div>
        <div className="bg-white border border-[#e7e5e4] rounded-xl p-6">
          <div className="space-y-4">
            <div className="h-10 bg-[#e7e5e4] rounded" />
            <div className="h-10 bg-[#e7e5e4] rounded" />
            <div className="h-10 bg-[#e7e5e4] rounded" />
          </div>
        </div>
      </div>
    )
  }

  // If already connected, show status
  if (connectStatus?.stripeAccountId) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="font-[family-name:var(--font-heading)] text-2xl font-semibold text-[#1a1a1a]">
            Utbetalningar
          </h1>
          <p className="text-[#78716c] mt-1">Hantera dina utbetalningar och se transaktionshistorik</p>
        </div>
        <StatusCard status={connectStatus.stripeAccountStatus || 'pending'} />
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
