'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getAgentConfig } from '@/actions/agent-config/get-agent-config'
import { upsertAgentConfig } from '@/actions/agent-config/upsert-agent-config'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { EVENT_TYPES } from '@/lib/constants'
import type {
  PricingRules, PricingPackage, BookingParams,
  EventTypeConfig, PolicyConfig, FaqEntry
} from '@/types/agent-booking'

const WEEKDAYS = [
  { value: 1, label: 'Man' },
  { value: 2, label: 'Tis' },
  { value: 3, label: 'Ons' },
  { value: 4, label: 'Tor' },
  { value: 5, label: 'Fre' },
  { value: 6, label: 'Lor' },
  { value: 0, label: 'Son' },
]

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      className={`w-5 h-5 text-[#78716c] transition-transform ${open ? 'rotate-180' : ''}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  )
}

function SectionHeader({
  title,
  subtitle,
  open,
  onToggle,
  required,
}: {
  title: string
  subtitle?: string
  open: boolean
  onToggle: () => void
  required?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex items-center justify-between w-full py-3 text-left"
    >
      <div>
        <h2 className="text-lg font-semibold text-[#1a1a1a]">
          {title}
          {required && <span className="text-[#c45a3b] ml-1">*</span>}
        </h2>
        {subtitle && <p className="text-sm text-[#78716c] mt-0.5">{subtitle}</p>}
      </div>
      <ChevronIcon open={open} />
    </button>
  )
}

const emptyPackage: PricingPackage = { name: '', price: 0, description: '', perPerson: false }

export default function VenueAgentPage() {
  const router = useRouter()
  const params = useParams()
  const venueId = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Section open/close state
  const [openSections, setOpenSections] = useState({
    pricing: true,
    booking: true,
    eventTypes: false,
    policies: false,
    faq: false,
  })

  // Form state
  const [agentEnabled, setAgentEnabled] = useState(false)
  const [agentLanguage, setAgentLanguage] = useState<'sv' | 'en'>('sv')

  // Pricing
  const [basePrice, setBasePrice] = useState('')
  const [perPersonEnabled, setPerPersonEnabled] = useState(false)
  const [perPersonRate, setPerPersonRate] = useState('')
  const [minimumSpendEnabled, setMinimumSpendEnabled] = useState(false)
  const [minimumSpend, setMinimumSpend] = useState('')
  const [packages, setPackages] = useState<PricingPackage[]>([])
  const [pricingNotes, setPricingNotes] = useState('')

  // Booking params
  const [minGuests, setMinGuests] = useState('')
  const [maxGuests, setMaxGuests] = useState('')
  const [minDuration, setMinDuration] = useState('')
  const [maxDuration, setMaxDuration] = useState('')
  const [minAdvanceDays, setMinAdvanceDays] = useState('')
  const [maxAdvanceMonths, setMaxAdvanceMonths] = useState('')
  const [blockedWeekdays, setBlockedWeekdays] = useState<number[]>([])

  // Event types
  const [eventTypeConfigs, setEventTypeConfigs] = useState<EventTypeConfig[]>(
    EVENT_TYPES.map(et => ({
      type: et.value,
      label: et.label,
      status: 'welcome' as const,
      note: '',
    }))
  )

  // Policies
  const [cancellation, setCancellation] = useState('')
  const [deposit, setDeposit] = useState('')
  const [houseRules, setHouseRules] = useState('')

  // FAQ
  const [faqEntries, setFaqEntries] = useState<FaqEntry[]>([])

  function toggleSection(key: keyof typeof openSections) {
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }))
  }

  // Load existing config
  useEffect(() => {
    async function load() {
      const result = await getAgentConfig(venueId)
      if (result.success && result.config) {
        const c = result.config

        setAgentEnabled(c.is_enabled ?? false)

        // Pricing
        const pr = c.pricing_rules as PricingRules | null
        if (pr) {
          setBasePrice(pr.basePrice?.toString() ?? '')
          if (pr.perPersonRate != null) {
            setPerPersonEnabled(true)
            setPerPersonRate(pr.perPersonRate.toString())
          }
          if (pr.minimumSpend != null) {
            setMinimumSpendEnabled(true)
            setMinimumSpend(pr.minimumSpend.toString())
          }
          if (pr.packages) setPackages(pr.packages)
          setPricingNotes(pr.notes ?? '')
        }

        // Booking params
        const bp = c.booking_params as BookingParams | null
        if (bp) {
          setMinGuests(bp.minGuests?.toString() ?? '')
          setMaxGuests(bp.maxGuests?.toString() ?? '')
          setMinDuration(bp.minDurationHours?.toString() ?? '')
          setMaxDuration(bp.maxDurationHours?.toString() ?? '')
          setMinAdvanceDays(bp.minAdvanceDays?.toString() ?? '')
          setMaxAdvanceMonths(bp.maxAdvanceMonths?.toString() ?? '')
          setBlockedWeekdays(bp.blockedWeekdays ?? [])
        }

        // Event types
        const et = c.event_types as EventTypeConfig[] | null
        if (et && et.length > 0) {
          // Merge saved configs with full EVENT_TYPES list
          setEventTypeConfigs(
            EVENT_TYPES.map(eventType => {
              const saved = et.find(e => e.type === eventType.value)
              return saved ?? {
                type: eventType.value,
                label: eventType.label,
                status: 'welcome' as const,
                note: '',
              }
            })
          )
        }

        // Policies
        const pc = c.policy_config as PolicyConfig | null
        if (pc) {
          setCancellation(pc.cancellation ?? '')
          setDeposit(pc.deposit ?? '')
          setHouseRules(pc.houseRules ?? '')
        }

        // FAQ
        const faq = c.faq_entries as FaqEntry[] | null
        if (faq) setFaqEntries(faq)
      }
      setLoading(false)
    }
    load()
  }, [venueId])

  async function handleSave() {
    setSaving(true)
    setSuccessMessage(null)
    setErrorMessage(null)

    const pricingRules: PricingRules = {
      basePrice: basePrice ? Number(basePrice) : undefined,
      perPersonRate: perPersonEnabled && perPersonRate ? Number(perPersonRate) : undefined,
      minimumSpend: minimumSpendEnabled && minimumSpend ? Number(minimumSpend) : undefined,
      packages: packages.length > 0 ? packages : undefined,
      notes: pricingNotes || undefined,
    }

    const bookingParams: BookingParams = {
      minGuests: minGuests ? Number(minGuests) : undefined,
      maxGuests: maxGuests ? Number(maxGuests) : undefined,
      minDurationHours: minDuration ? Number(minDuration) : undefined,
      maxDurationHours: maxDuration ? Number(maxDuration) : undefined,
      minAdvanceDays: minAdvanceDays ? Number(minAdvanceDays) : undefined,
      maxAdvanceMonths: maxAdvanceMonths ? Number(maxAdvanceMonths) : undefined,
      blockedWeekdays: blockedWeekdays.length > 0 ? blockedWeekdays : undefined,
    }

    const policies: PolicyConfig = {
      cancellation: cancellation || undefined,
      deposit: deposit || undefined,
      houseRules: houseRules || undefined,
    }

    const result = await upsertAgentConfig({
      venueId,
      pricingRules,
      bookingParams,
      eventTypes: eventTypeConfigs,
      policies,
      faqEntries: faqEntries.length > 0 ? faqEntries : undefined,
      agentLanguage,
      agentEnabled,
    })

    if (result.success) {
      setSuccessMessage('Konfigurationen har sparats')
    } else {
      setErrorMessage(result.error ?? 'Kunde inte spara')
    }
    setSaving(false)
  }

  // Package helpers
  function addPackage() {
    if (packages.length >= 5) return
    setPackages(prev => [...prev, { ...emptyPackage }])
  }

  function removePackage(index: number) {
    setPackages(prev => prev.filter((_, i) => i !== index))
  }

  function updatePackage(index: number, field: keyof PricingPackage, value: string | number | boolean) {
    setPackages(prev =>
      prev.map((pkg, i) => (i === index ? { ...pkg, [field]: value } : pkg))
    )
  }

  // Event type helpers
  function updateEventTypeStatus(index: number, status: EventTypeConfig['status']) {
    setEventTypeConfigs(prev =>
      prev.map((et, i) => (i === index ? { ...et, status } : et))
    )
  }

  function updateEventTypeNote(index: number, note: string) {
    setEventTypeConfigs(prev =>
      prev.map((et, i) => (i === index ? { ...et, note } : et))
    )
  }

  // FAQ helpers
  function addFaq() {
    setFaqEntries(prev => [...prev, { question: '', answer: '' }])
  }

  function removeFaq(index: number) {
    setFaqEntries(prev => prev.filter((_, i) => i !== index))
  }

  function updateFaq(index: number, field: keyof FaqEntry, value: string) {
    setFaqEntries(prev =>
      prev.map((faq, i) => (i === index ? { ...faq, [field]: value } : faq))
    )
  }

  // Weekday toggle
  function toggleWeekday(day: number) {
    setBlockedWeekdays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    )
  }

  if (loading) {
    return (
      <div>
        <div className="animate-pulse">
          <div className="h-8 bg-[#e7e5e4] rounded w-1/3 mb-4" />
          <div className="h-4 bg-[#e7e5e4] rounded w-1/2 mb-8" />
          <div className="bg-white border border-[#e7e5e4] rounded-xl p-6">
            <div className="space-y-4">
              <div className="h-10 bg-[#e7e5e4] rounded" />
              <div className="h-10 bg-[#e7e5e4] rounded" />
              <div className="h-24 bg-[#e7e5e4] rounded" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <p className="text-[#78716c]">
          Lar din agent hur den ska hantera bokningsforfragan
        </p>
      </div>

      {/* Success/Error messages */}
      {successMessage && (
        <div className="mb-6 p-4 bg-[#d1fae5] border border-[#10b981] rounded-lg text-[#065f46] flex items-start gap-2">
          <span className="flex-1">{successMessage}</span>
          <button onClick={() => setSuccessMessage(null)} className="flex-shrink-0 p-1 hover:bg-green-100 rounded" aria-label="Stang">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      )}
      {errorMessage && (
        <div className="mb-6 p-4 bg-[#fee2e2] border border-[#ef4444] rounded-lg text-[#991b1b] flex items-start gap-2">
          <span className="flex-1">{errorMessage}</span>
          <button onClick={() => setErrorMessage(null)} className="flex-shrink-0 p-1 hover:bg-red-100 rounded" aria-label="Stang">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      )}

      {/* Agent enable/disable toggle - prominent */}
      <div className="bg-white border border-[#e7e5e4] rounded-xl p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[#1a1a1a]">Aktivera agent</h2>
            <p className="text-sm text-[#78716c] mt-0.5">
              {agentEnabled
                ? 'Agenten ar aktiv och svarar pa forfragan automatiskt'
                : 'Agenten ar avslagen — aktivera for att bota automatiskt'}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={agentEnabled}
            onClick={() => setAgentEnabled(!agentEnabled)}
            className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#c45a3b] ${
              agentEnabled ? 'bg-[#c45a3b]' : 'bg-[#d6d3d1]'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                agentEnabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Section 1: Pricing */}
      <div className="bg-white border border-[#e7e5e4] rounded-xl p-6 mb-6">
        <SectionHeader
          title="Prissattning"
          subtitle="Ange grundpris och paket"
          open={openSections.pricing}
          onToggle={() => toggleSection('pricing')}
          required
        />
        {openSections.pricing && (
          <div className="space-y-4 pt-2">
            {/* Base price */}
            <div>
              <label htmlFor="basePrice" className="block text-sm font-medium text-[#57534e] mb-1.5">
                Grundpris (SEK)
              </label>
              <Input
                id="basePrice"
                type="number"
                value={basePrice}
                onChange={e => setBasePrice(e.target.value)}
                placeholder="T.ex. 5000"
                min="0"
              />
            </div>

            {/* Per person rate */}
            <div>
              <label className="flex items-center gap-2 mb-1.5">
                <input
                  type="checkbox"
                  checked={perPersonEnabled}
                  onChange={e => setPerPersonEnabled(e.target.checked)}
                  className="w-4 h-4 text-[#c45a3b] border-[#d1d5db] rounded focus:ring-[#c45a3b]"
                />
                <span className="text-sm font-medium text-[#57534e]">Pris per person</span>
              </label>
              {perPersonEnabled && (
                <Input
                  type="number"
                  value={perPersonRate}
                  onChange={e => setPerPersonRate(e.target.value)}
                  placeholder="T.ex. 250"
                  min="0"
                />
              )}
            </div>

            {/* Minimum spend */}
            <div>
              <label className="flex items-center gap-2 mb-1.5">
                <input
                  type="checkbox"
                  checked={minimumSpendEnabled}
                  onChange={e => setMinimumSpendEnabled(e.target.checked)}
                  className="w-4 h-4 text-[#c45a3b] border-[#d1d5db] rounded focus:ring-[#c45a3b]"
                />
                <span className="text-sm font-medium text-[#57534e]">Minimumbelopp</span>
              </label>
              {minimumSpendEnabled && (
                <Input
                  type="number"
                  value={minimumSpend}
                  onChange={e => setMinimumSpend(e.target.value)}
                  placeholder="T.ex. 10000"
                  min="0"
                />
              )}
            </div>

            {/* Packages */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-[#57534e]">Paket</span>
                {packages.length < 5 && (
                  <button
                    type="button"
                    onClick={addPackage}
                    className="text-sm text-[#c45a3b] hover:text-[#a04832] font-medium"
                  >
                    + Lagg till paket
                  </button>
                )}
              </div>
              {packages.map((pkg, i) => (
                <div key={i} className="border border-[#e7e5e4] rounded-lg p-4 mb-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-[#78716c]">Paket {i + 1}</span>
                    <button
                      type="button"
                      onClick={() => removePackage(i)}
                      className="text-sm text-[#ef4444] hover:text-[#dc2626]"
                    >
                      Ta bort
                    </button>
                  </div>
                  <Input
                    value={pkg.name}
                    onChange={e => updatePackage(i, 'name', e.target.value)}
                    placeholder="Paketnamn"
                  />
                  <Input
                    type="number"
                    value={pkg.price || ''}
                    onChange={e => updatePackage(i, 'price', Number(e.target.value))}
                    placeholder="Pris (SEK)"
                    min="0"
                  />
                  <Textarea
                    value={pkg.description}
                    onChange={e => updatePackage(i, 'description', e.target.value)}
                    placeholder="Beskrivning"
                    rows={2}
                  />
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={pkg.perPerson}
                      onChange={e => updatePackage(i, 'perPerson', e.target.checked)}
                      className="w-4 h-4 text-[#c45a3b] border-[#d1d5db] rounded focus:ring-[#c45a3b]"
                    />
                    <span className="text-sm text-[#57534e]">Pris per person</span>
                  </label>
                </div>
              ))}
            </div>

            {/* Pricing notes */}
            <div>
              <label htmlFor="pricingNotes" className="block text-sm font-medium text-[#57534e] mb-1.5">
                Prisanteckningar
              </label>
              <Textarea
                id="pricingNotes"
                value={pricingNotes}
                onChange={e => setPricingNotes(e.target.value)}
                placeholder="T.ex. Helgpriser avviker, catering tillkommer..."
                rows={3}
              />
            </div>
          </div>
        )}
      </div>

      {/* Section 2: Booking Parameters */}
      <div className="bg-white border border-[#e7e5e4] rounded-xl p-6 mb-6">
        <SectionHeader
          title="Bokningsregler"
          subtitle="Ange kapacitet och tidsramar"
          open={openSections.booking}
          onToggle={() => toggleSection('booking')}
          required
        />
        {openSections.booking && (
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="minGuests" className="block text-sm font-medium text-[#57534e] mb-1.5">
                  Min antal gaster
                </label>
                <Input
                  id="minGuests"
                  type="number"
                  value={minGuests}
                  onChange={e => setMinGuests(e.target.value)}
                  placeholder="T.ex. 10"
                  min="1"
                />
              </div>
              <div>
                <label htmlFor="maxGuests" className="block text-sm font-medium text-[#57534e] mb-1.5">
                  Max antal gaster
                </label>
                <Input
                  id="maxGuests"
                  type="number"
                  value={maxGuests}
                  onChange={e => setMaxGuests(e.target.value)}
                  placeholder="T.ex. 200"
                  min="1"
                />
              </div>
              <div>
                <label htmlFor="minDuration" className="block text-sm font-medium text-[#57534e] mb-1.5">
                  Min bokningstid (timmar)
                </label>
                <Input
                  id="minDuration"
                  type="number"
                  value={minDuration}
                  onChange={e => setMinDuration(e.target.value)}
                  placeholder="T.ex. 2"
                  min="1"
                />
              </div>
              <div>
                <label htmlFor="maxDuration" className="block text-sm font-medium text-[#57534e] mb-1.5">
                  Max bokningstid (timmar)
                </label>
                <Input
                  id="maxDuration"
                  type="number"
                  value={maxDuration}
                  onChange={e => setMaxDuration(e.target.value)}
                  placeholder="T.ex. 12"
                  min="1"
                />
              </div>
              <div>
                <label htmlFor="minAdvanceDays" className="block text-sm font-medium text-[#57534e] mb-1.5">
                  Min framforhallning (dagar)
                </label>
                <Input
                  id="minAdvanceDays"
                  type="number"
                  value={minAdvanceDays}
                  onChange={e => setMinAdvanceDays(e.target.value)}
                  placeholder="T.ex. 7"
                  min="0"
                />
              </div>
              <div>
                <label htmlFor="maxAdvanceMonths" className="block text-sm font-medium text-[#57534e] mb-1.5">
                  Max framforhallning (manader)
                </label>
                <Input
                  id="maxAdvanceMonths"
                  type="number"
                  value={maxAdvanceMonths}
                  onChange={e => setMaxAdvanceMonths(e.target.value)}
                  placeholder="T.ex. 12"
                  min="1"
                />
              </div>
            </div>

            {/* Blocked weekdays */}
            <div>
              <label className="block text-sm font-medium text-[#57534e] mb-2">
                Blockerade veckodagar
              </label>
              <div className="flex flex-wrap gap-2">
                {WEEKDAYS.map(day => (
                  <label
                    key={day.value}
                    className={`flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer transition-colors ${
                      blockedWeekdays.includes(day.value)
                        ? 'border-[#c45a3b] bg-[#c45a3b]/5'
                        : 'border-[#e7e5e4] hover:border-[#a8a29e]'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={blockedWeekdays.includes(day.value)}
                      onChange={() => toggleWeekday(day.value)}
                      className="w-4 h-4 text-[#c45a3b] border-[#d1d5db] rounded focus:ring-[#c45a3b]"
                    />
                    <span className="text-sm text-[#57534e]">{day.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Section 3: Event Types */}
      <div className="bg-white border border-[#e7e5e4] rounded-xl p-6 mb-6">
        <SectionHeader
          title="Eventtyper"
          subtitle="Valk vilka eventtyper du tar emot"
          open={openSections.eventTypes}
          onToggle={() => toggleSection('eventTypes')}
        />
        {openSections.eventTypes && (
          <div className="space-y-3 pt-2">
            {eventTypeConfigs.map((et, i) => (
              <div key={et.type} className="border border-[#e7e5e4] rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-[#1a1a1a]">{et.label}</span>
                  <div className="flex gap-1">
                    {(['welcome', 'declined', 'ask_owner'] as const).map(status => {
                      const labels = {
                        welcome: 'Valkomna',
                        declined: 'Avbojs',
                        ask_owner: 'Fraga mig',
                      }
                      const isActive = et.status === status
                      return (
                        <button
                          key={status}
                          type="button"
                          onClick={() => updateEventTypeStatus(i, status)}
                          className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                            isActive
                              ? status === 'welcome'
                                ? 'bg-[#d1fae5] text-[#065f46]'
                                : status === 'declined'
                                  ? 'bg-[#fee2e2] text-[#991b1b]'
                                  : 'bg-[#fef3c7] text-[#92400e]'
                              : 'bg-[#f5f3f0] text-[#78716c] hover:bg-[#eeebe7]'
                          }`}
                        >
                          {labels[status]}
                        </button>
                      )
                    })}
                  </div>
                </div>
                <Input
                  value={et.note ?? ''}
                  onChange={e => updateEventTypeNote(i, e.target.value)}
                  placeholder="Valfri anteckning..."
                  className="text-sm"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section 4: Policies */}
      <div className="bg-white border border-[#e7e5e4] rounded-xl p-6 mb-6">
        <SectionHeader
          title="Policyer"
          subtitle="Avbokningsvillkor, depositioner och husregler"
          open={openSections.policies}
          onToggle={() => toggleSection('policies')}
        />
        {openSections.policies && (
          <div className="space-y-4 pt-2">
            <div>
              <label htmlFor="cancellation" className="block text-sm font-medium text-[#57534e] mb-1.5">
                Avbokningsvillkor
              </label>
              <Textarea
                id="cancellation"
                value={cancellation}
                onChange={e => setCancellation(e.target.value)}
                placeholder="T.ex. Kostnadsfri avbokning upp till 14 dagar innan eventet..."
                rows={3}
              />
            </div>
            <div>
              <label htmlFor="deposit" className="block text-sm font-medium text-[#57534e] mb-1.5">
                Depositionskrav
              </label>
              <Textarea
                id="deposit"
                value={deposit}
                onChange={e => setDeposit(e.target.value)}
                placeholder="T.ex. 50% vid bokning, resterande 30 dagar innan..."
                rows={3}
              />
            </div>
            <div>
              <label htmlFor="houseRules" className="block text-sm font-medium text-[#57534e] mb-1.5">
                Husregler
              </label>
              <Textarea
                id="houseRules"
                value={houseRules}
                onChange={e => setHouseRules(e.target.value)}
                placeholder="T.ex. Max ljudniva 80dB efter 22:00..."
                rows={3}
              />
            </div>
          </div>
        )}
      </div>

      {/* Section 5: FAQ */}
      <div className="bg-white border border-[#e7e5e4] rounded-xl p-6 mb-6">
        <SectionHeader
          title="Vanliga fragor"
          subtitle="Lagg till fragor och svar som agenten kan anvanda"
          open={openSections.faq}
          onToggle={() => toggleSection('faq')}
        />
        {openSections.faq && (
          <div className="space-y-3 pt-2">
            {faqEntries.map((faq, i) => (
              <div key={i} className="border border-[#e7e5e4] rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-[#78716c]">Fraga {i + 1}</span>
                  <button
                    type="button"
                    onClick={() => removeFaq(i)}
                    className="text-sm text-[#ef4444] hover:text-[#dc2626]"
                  >
                    Ta bort
                  </button>
                </div>
                <Input
                  value={faq.question}
                  onChange={e => updateFaq(i, 'question', e.target.value)}
                  placeholder="Fraga"
                />
                <Textarea
                  value={faq.answer}
                  onChange={e => updateFaq(i, 'answer', e.target.value)}
                  placeholder="Svar"
                  rows={2}
                />
              </div>
            ))}
            <button
              type="button"
              onClick={addFaq}
              className="text-sm text-[#c45a3b] hover:text-[#a04832] font-medium"
            >
              + Lagg till fraga
            </button>
          </div>
        )}
      </div>

      {/* Section 6: Agent Settings */}
      <div className="bg-white border border-[#e7e5e4] rounded-xl p-6 mb-6">
        <h2 className="text-lg font-semibold text-[#1a1a1a] mb-4">Agentinstallningar</h2>
        <div className="space-y-4">
          <div>
            <label htmlFor="agentLanguage" className="block text-sm font-medium text-[#57534e] mb-1.5">
              Sprak
            </label>
            <select
              id="agentLanguage"
              value={agentLanguage}
              onChange={e => setAgentLanguage(e.target.value as 'sv' | 'en')}
              className="w-full h-10 px-3 rounded-lg border border-[#e5e5e5] bg-white text-[#1a1a1a] focus:outline-none focus:border-[#c45a3b] focus:ring-1 focus:ring-[#c45a3b]"
            >
              <option value="sv">Svenska</option>
              <option value="en">English</option>
            </select>
          </div>

          <div className="pt-4 border-t border-[#e7e5e4]">
            <Button
              onClick={handleSave}
              loading={saving}
            >
              Spara
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
