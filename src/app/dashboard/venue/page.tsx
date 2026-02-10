'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { updateVenue } from '@/actions/venues/update-venue'
import { publishVenue, getPublishValidation, type PublishValidationError } from '@/actions/venues/publish-venue'
import { unpublishVenue } from '@/actions/venues/unpublish-venue'
import { VENUE_TYPES, VIBES, AREAS, AMENITIES } from '@/lib/constants'

interface VenueData {
  id: string
  name: string
  slug: string | null
  description: string | null
  address: string
  city: string
  area: string | null
  venue_types: string[]
  vibes: string[]
  capacity_standing: number | null
  capacity_seated: number | null
  capacity_conference: number | null
  min_guests: number
  price_per_hour: number | null
  price_half_day: number | null
  price_full_day: number | null
  price_evening: number | null
  price_notes: string | null
  amenities: string[]
  contact_email: string | null
  contact_phone: string | null
  website: string | null
  status: 'draft' | 'published' | 'paused'
}

interface FormData {
  name: string
  description: string
  venue_types: string[]
  vibes: string[]
  address: string
  area: string
  city: string
  capacity_standing: string
  capacity_seated: string
  capacity_conference: string
  min_guests: string
  price_per_hour: string
  price_half_day: string
  price_full_day: string
  price_evening: string
  price_notes: string
  amenities: string[]
  contact_email: string
  contact_phone: string
  website: string
}

function StatusBadge({ status }: { status: 'draft' | 'published' | 'paused' }) {
  const config = {
    draft: { label: 'Utkast', className: 'bg-[#fef3c7] text-[#92400e]' },
    published: { label: 'Publicerad', className: 'bg-[#d1fae5] text-[#065f46]' },
    paused: { label: 'Pausad', className: 'bg-[#fee2e2] text-[#991b1b]' },
  }
  const { label, className } = config[status]
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${className}`}>
      {label}
    </span>
  )
}

export default function VenueEditPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [venue, setVenue] = useState<VenueData | null>(null)
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [isPausing, setIsPausing] = useState(false)
  const [publishErrors, setPublishErrors] = useState<PublishValidationError[]>([])
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    venue_types: [],
    vibes: [],
    address: '',
    area: '',
    city: 'Stockholm',
    capacity_standing: '',
    capacity_seated: '',
    capacity_conference: '',
    min_guests: '',
    price_per_hour: '',
    price_half_day: '',
    price_full_day: '',
    price_evening: '',
    price_notes: '',
    amenities: [],
    contact_email: '',
    contact_phone: '',
    website: '',
  })

  // Load venue data on mount
  useEffect(() => {
    async function loadVenue() {
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const supabase = createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/auth/sign-in')
          return
        }

        const { data: venueData, error } = await supabase
          .from('venues')
          .select('*')
          .eq('owner_id', user.id)
          .single()

        if (error || !venueData) {
          router.push('/dashboard/venue/new')
          return
        }

        setVenue(venueData as VenueData)
        setFormData({
          name: venueData.name || '',
          description: venueData.description || '',
          venue_types: venueData.venue_types || [],
          vibes: venueData.vibes || [],
          address: venueData.address || '',
          area: venueData.area || '',
          city: venueData.city || 'Stockholm',
          capacity_standing: venueData.capacity_standing?.toString() || '',
          capacity_seated: venueData.capacity_seated?.toString() || '',
          capacity_conference: venueData.capacity_conference?.toString() || '',
          min_guests: venueData.min_guests?.toString() || '',
          price_per_hour: venueData.price_per_hour?.toString() || '',
          price_half_day: venueData.price_half_day?.toString() || '',
          price_full_day: venueData.price_full_day?.toString() || '',
          price_evening: venueData.price_evening?.toString() || '',
          price_notes: venueData.price_notes || '',
          amenities: venueData.amenities || [],
          contact_email: venueData.contact_email || '',
          contact_phone: venueData.contact_phone || '',
          website: venueData.website || '',
        })

        // Load publish validation errors if not published
        if (venueData.status !== 'published') {
          const errors = await getPublishValidation()
          setPublishErrors(errors)
        }
      } catch (err) {
        console.error('Error loading venue:', err)
        setErrorMessage('Kunde inte ladda lokalen')
      } finally {
        setLoading(false)
      }
    }

    loadVenue()
  }, [router])

  // Handle URL success/error messages
  useEffect(() => {
    const success = searchParams.get('success')
    const error = searchParams.get('error')

    if (success === 'venue_updated') {
      setSuccessMessage('Lokalen har uppdaterats')
    } else if (success === 'venue_created') {
      setSuccessMessage('Lokalen har skapats')
    } else if (success === 'demo') {
      setSuccessMessage('Demo-lage: Ingen data sparades')
    }

    if (error === 'update_failed') {
      setErrorMessage('Kunde inte uppdatera lokalen')
    }

    // Clear URL params
    if (success || error) {
      window.history.replaceState({}, '', '/dashboard/venue')
    }
  }, [searchParams])

  const updateField = (field: keyof FormData, value: string | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const toggleArrayField = (field: 'venue_types' | 'vibes' | 'amenities', value: string) => {
    setFormData(prev => {
      const current = prev[field]
      const newValue = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value]
      return { ...prev, [field]: newValue }
    })
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    setSuccessMessage(null)
    setErrorMessage(null)

    const form = new window.FormData()
    form.append('name', formData.name)
    form.append('description', formData.description)
    form.append('address', formData.address)
    form.append('area', formData.area)
    form.append('city', formData.city)
    formData.venue_types.forEach(type => form.append('venue_types', type))
    formData.vibes.forEach(vibe => form.append('vibes', vibe))
    form.append('capacity_standing', formData.capacity_standing)
    form.append('capacity_seated', formData.capacity_seated)
    form.append('capacity_conference', formData.capacity_conference)
    form.append('min_guests', formData.min_guests)
    form.append('price_per_hour', formData.price_per_hour)
    form.append('price_half_day', formData.price_half_day)
    form.append('price_full_day', formData.price_full_day)
    form.append('price_evening', formData.price_evening)
    form.append('price_notes', formData.price_notes)
    formData.amenities.forEach(amenity => form.append('amenities', amenity))
    form.append('contact_email', formData.contact_email)
    form.append('contact_phone', formData.contact_phone)
    form.append('website', formData.website)

    await updateVenue(form)
  }

  const handlePublish = async () => {
    setIsPublishing(true)
    setSuccessMessage(null)
    setErrorMessage(null)

    const result = await publishVenue()

    if (result.success) {
      setVenue(prev => prev ? { ...prev, status: 'published' } : prev)
      setPublishErrors([])
      setSuccessMessage('Lokalen ar nu publicerad')
    } else {
      setPublishErrors(result.errors || [])
      setErrorMessage('Lokalen kunde inte publiceras')
    }

    setIsPublishing(false)
  }

  const handlePause = async () => {
    setIsPausing(true)
    setSuccessMessage(null)
    setErrorMessage(null)

    const result = await unpublishVenue()

    if (result.success) {
      setVenue(prev => prev ? { ...prev, status: 'paused' } : prev)
      setSuccessMessage('Lokalen ar nu pausad')
    } else {
      setErrorMessage(result.error || 'Kunde inte pausa lokalen')
    }

    setIsPausing(false)
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="animate-pulse">
          <div className="h-8 bg-[#e7e5e4] rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-[#e7e5e4] rounded w-1/2 mb-8"></div>
          <div className="bg-white border border-[#e7e5e4] rounded-xl p-6">
            <div className="space-y-4">
              <div className="h-10 bg-[#e7e5e4] rounded"></div>
              <div className="h-10 bg-[#e7e5e4] rounded"></div>
              <div className="h-24 bg-[#e7e5e4] rounded"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!venue) {
    return null
  }

  const canPublish = venue.status !== 'published' && publishErrors.length === 0
  const showPublishButton = venue.status === 'draft' || venue.status === 'paused'
  const showPauseButton = venue.status === 'published'

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/dashboard"
          className="text-sm text-[#78716c] hover:text-[#c45a3b]"
        >
          &larr; Tillbaka till dashboard
        </Link>
        <div className="flex items-center justify-between mt-4">
          <div>
            <h1 className="text-2xl font-semibold text-[#1a1a1a]">
              Redigera lokal
            </h1>
            <p className="text-[#78716c] mt-1">
              Uppdatera information om din lokal
            </p>
          </div>
          <StatusBadge status={venue.status} />
        </div>
      </div>

      {/* Success/Error messages */}
      {successMessage && (
        <div className="mb-6 p-4 bg-[#d1fae5] border border-[#10b981] rounded-lg text-[#065f46] flex items-start gap-2">
          <span className="flex-1">{successMessage}</span>
          <button onClick={() => setSuccessMessage(null)} className="flex-shrink-0 p-1 hover:bg-green-100 rounded" aria-label="Stäng"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
        </div>
      )}
      {errorMessage && (
        <div className="mb-6 p-4 bg-[#fee2e2] border border-[#ef4444] rounded-lg text-[#991b1b] flex items-start gap-2">
          <span className="flex-1">{errorMessage}</span>
          <button onClick={() => setErrorMessage(null)} className="flex-shrink-0 p-1 hover:bg-red-100 rounded" aria-label="Stäng"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
        </div>
      )}

      {/* Publish validation errors */}
      {publishErrors.length > 0 && (
        <div className="mb-6 p-4 bg-[#fef3c7] border border-[#f59e0b] rounded-lg">
          <p className="font-medium text-[#92400e] mb-2">
            Foljande kravs for att publicera:
          </p>
          <ul className="list-disc list-inside text-sm text-[#92400e]">
            {publishErrors.map((error, index) => (
              <li key={index}>{error.message}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Quick actions */}
      <div className="mb-6 flex flex-wrap gap-3">
        <Link href="/dashboard/venue/photos">
          <Button variant="outline">Hantera bilder</Button>
        </Link>
        {venue.status === 'published' && venue.slug && (
          <Link href={`/venue/${venue.slug}`} target="_blank">
            <Button variant="outline">Visa lokal</Button>
          </Link>
        )}
      </div>

      {/* Edit form */}
      <div className="bg-white border border-[#e7e5e4] rounded-xl p-6 mb-8">
        <div className="space-y-8">
          {/* Basic Info */}
          <section>
            <h2 className="text-lg font-semibold text-[#1a1a1a] mb-4">Grundlaggande information</h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-[#57534e] mb-1.5">
                  Namn pa lokalen *
                </label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={e => updateField('name', e.target.value)}
                  placeholder="T.ex. Festlokalen Sodermalm"
                  required
                />
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-[#57534e] mb-1.5">
                  Beskrivning
                </label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={e => updateField('description', e.target.value)}
                  placeholder="Beskriv din lokal, vad som gor den unik och passar for..."
                  rows={4}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#57534e] mb-2">
                  Typ av evenemang
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {VENUE_TYPES.map(type => (
                    <label
                      key={type.value}
                      className={`flex items-center gap-2 p-3 border rounded-lg cursor-pointer transition-colors ${
                        formData.venue_types.includes(type.value)
                          ? 'border-[#c45a3b] bg-[#c45a3b]/5'
                          : 'border-[#e7e5e4] hover:border-[#a8a29e]'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={formData.venue_types.includes(type.value)}
                        onChange={() => toggleArrayField('venue_types', type.value)}
                        className="w-4 h-4 text-[#c45a3b] border-[#d1d5db] rounded focus:ring-[#c45a3b]"
                      />
                      <span className="text-sm text-[#57534e]">{type.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#57534e] mb-2">
                  Stil/kansla
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {VIBES.map(vibe => (
                    <label
                      key={vibe.value}
                      className={`flex items-center gap-2 p-3 border rounded-lg cursor-pointer transition-colors ${
                        formData.vibes.includes(vibe.value)
                          ? 'border-[#c45a3b] bg-[#c45a3b]/5'
                          : 'border-[#e7e5e4] hover:border-[#a8a29e]'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={formData.vibes.includes(vibe.value)}
                        onChange={() => toggleArrayField('vibes', vibe.value)}
                        className="w-4 h-4 text-[#c45a3b] border-[#d1d5db] rounded focus:ring-[#c45a3b]"
                      />
                      <span className="text-sm text-[#57534e]">{vibe.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Location */}
          <section>
            <h2 className="text-lg font-semibold text-[#1a1a1a] mb-4">Plats</h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="address" className="block text-sm font-medium text-[#57534e] mb-1.5">
                  Adress *
                </label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={e => updateField('address', e.target.value)}
                  placeholder="T.ex. Gotgatan 42"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="area" className="block text-sm font-medium text-[#57534e] mb-1.5">
                    Omrade
                  </label>
                  <select
                    id="area"
                    value={formData.area}
                    onChange={e => updateField('area', e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-[#e5e5e5] bg-white text-[#1a1a1a] focus:outline-none focus:border-[#c45a3b] focus:ring-1 focus:ring-[#c45a3b]"
                  >
                    <option value="">Valj omrade</option>
                    {AREAS.map(area => (
                      <option key={area} value={area}>
                        {area}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="city" className="block text-sm font-medium text-[#57534e] mb-1.5">
                    Stad
                  </label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={e => updateField('city', e.target.value)}
                    placeholder="Stockholm"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Capacity */}
          <section>
            <h2 className="text-lg font-semibold text-[#1a1a1a] mb-4">Kapacitet</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="capacity_standing" className="block text-sm font-medium text-[#57534e] mb-1.5">
                  Staende kapacitet
                </label>
                <Input
                  id="capacity_standing"
                  type="number"
                  value={formData.capacity_standing}
                  onChange={e => updateField('capacity_standing', e.target.value)}
                  placeholder="T.ex. 100"
                  min="0"
                />
              </div>

              <div>
                <label htmlFor="capacity_seated" className="block text-sm font-medium text-[#57534e] mb-1.5">
                  Sittande kapacitet
                </label>
                <Input
                  id="capacity_seated"
                  type="number"
                  value={formData.capacity_seated}
                  onChange={e => updateField('capacity_seated', e.target.value)}
                  placeholder="T.ex. 60"
                  min="0"
                />
              </div>

              <div>
                <label htmlFor="capacity_conference" className="block text-sm font-medium text-[#57534e] mb-1.5">
                  Konferenskapacitet
                </label>
                <Input
                  id="capacity_conference"
                  type="number"
                  value={formData.capacity_conference}
                  onChange={e => updateField('capacity_conference', e.target.value)}
                  placeholder="T.ex. 40"
                  min="0"
                />
              </div>

              <div>
                <label htmlFor="min_guests" className="block text-sm font-medium text-[#57534e] mb-1.5">
                  Minsta antal gaster
                </label>
                <Input
                  id="min_guests"
                  type="number"
                  value={formData.min_guests}
                  onChange={e => updateField('min_guests', e.target.value)}
                  placeholder="T.ex. 10"
                  min="1"
                />
              </div>
            </div>
          </section>

          {/* Pricing */}
          <section>
            <h2 className="text-lg font-semibold text-[#1a1a1a] mb-4">Priser</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="price_per_hour" className="block text-sm font-medium text-[#57534e] mb-1.5">
                  Pris per timme (SEK)
                </label>
                <Input
                  id="price_per_hour"
                  type="number"
                  value={formData.price_per_hour}
                  onChange={e => updateField('price_per_hour', e.target.value)}
                  placeholder="T.ex. 1500"
                  min="0"
                />
              </div>

              <div>
                <label htmlFor="price_half_day" className="block text-sm font-medium text-[#57534e] mb-1.5">
                  Pris halvdag (SEK)
                </label>
                <Input
                  id="price_half_day"
                  type="number"
                  value={formData.price_half_day}
                  onChange={e => updateField('price_half_day', e.target.value)}
                  placeholder="T.ex. 5000"
                  min="0"
                />
              </div>

              <div>
                <label htmlFor="price_full_day" className="block text-sm font-medium text-[#57534e] mb-1.5">
                  Pris heldag (SEK)
                </label>
                <Input
                  id="price_full_day"
                  type="number"
                  value={formData.price_full_day}
                  onChange={e => updateField('price_full_day', e.target.value)}
                  placeholder="T.ex. 9000"
                  min="0"
                />
              </div>

              <div>
                <label htmlFor="price_evening" className="block text-sm font-medium text-[#57534e] mb-1.5">
                  Pris kvall (SEK)
                </label>
                <Input
                  id="price_evening"
                  type="number"
                  value={formData.price_evening}
                  onChange={e => updateField('price_evening', e.target.value)}
                  placeholder="T.ex. 7000"
                  min="0"
                />
              </div>
            </div>

            <div className="mt-4">
              <label htmlFor="price_notes" className="block text-sm font-medium text-[#57534e] mb-1.5">
                Prisanteckningar
              </label>
              <Textarea
                id="price_notes"
                value={formData.price_notes}
                onChange={e => updateField('price_notes', e.target.value)}
                placeholder="T.ex. Minsta bokningstid 3 timmar. Catering tillkommer."
                rows={3}
              />
            </div>
          </section>

          {/* Amenities */}
          <section>
            <h2 className="text-lg font-semibold text-[#1a1a1a] mb-4">Faciliteter</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {AMENITIES.map(amenity => (
                <label
                  key={amenity.value}
                  className={`flex items-center gap-2 p-3 border rounded-lg cursor-pointer transition-colors ${
                    formData.amenities.includes(amenity.value)
                      ? 'border-[#c45a3b] bg-[#c45a3b]/5'
                      : 'border-[#e7e5e4] hover:border-[#a8a29e]'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={formData.amenities.includes(amenity.value)}
                    onChange={() => toggleArrayField('amenities', amenity.value)}
                    className="w-4 h-4 text-[#c45a3b] border-[#d1d5db] rounded focus:ring-[#c45a3b]"
                  />
                  <span className="text-sm text-[#57534e]">{amenity.label}</span>
                </label>
              ))}
            </div>
          </section>

          {/* Contact */}
          <section>
            <h2 className="text-lg font-semibold text-[#1a1a1a] mb-4">Kontaktuppgifter</h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="contact_email" className="block text-sm font-medium text-[#57534e] mb-1.5">
                  E-post
                </label>
                <Input
                  id="contact_email"
                  type="email"
                  value={formData.contact_email}
                  onChange={e => updateField('contact_email', e.target.value)}
                  placeholder="kontakt@dinlokal.se"
                />
              </div>

              <div>
                <label htmlFor="contact_phone" className="block text-sm font-medium text-[#57534e] mb-1.5">
                  Telefon
                </label>
                <Input
                  id="contact_phone"
                  type="tel"
                  value={formData.contact_phone}
                  onChange={e => updateField('contact_phone', e.target.value)}
                  placeholder="08-123 456 78"
                />
              </div>

              <div>
                <label htmlFor="website" className="block text-sm font-medium text-[#57534e] mb-1.5">
                  Webbplats
                </label>
                <Input
                  id="website"
                  type="url"
                  value={formData.website}
                  onChange={e => updateField('website', e.target.value)}
                  placeholder="https://www.dinlokal.se"
                />
              </div>
            </div>
          </section>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center justify-between gap-4 mt-8 pt-6 border-t border-[#e7e5e4]">
          <div className="flex gap-3">
            {showPublishButton && (
              <Button
                onClick={handlePublish}
                disabled={!canPublish || isPublishing}
                variant={canPublish ? 'primary' : 'secondary'}
              >
                {isPublishing ? 'Publicerar...' : 'Publicera'}
              </Button>
            )}
            {showPauseButton && (
              <Button
                onClick={handlePause}
                disabled={isPausing}
                variant="outline"
              >
                {isPausing ? 'Pausar...' : 'Pausa'}
              </Button>
            )}
          </div>

          <Button
            onClick={handleSubmit}
            loading={isSubmitting}
          >
            Spara andringar
          </Button>
        </div>
      </div>
    </div>
  )
}
