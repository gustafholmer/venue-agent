'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { createVenue } from '@/actions/venues/create-venue'

const STEPS = [
  { id: 1, title: 'Grundinfo' },
  { id: 2, title: 'Plats' },
  { id: 3, title: 'Kapacitet' },
  { id: 4, title: 'Priser' },
  { id: 5, title: 'Faciliteter' },
  { id: 6, title: 'Kontakt' },
]

const VENUE_TYPES = [
  { value: 'konferens', label: 'Konferens' },
  { value: 'fest', label: 'Fest' },
  { value: 'aw', label: 'AW' },
  { value: 'workshop', label: 'Workshop' },
  { value: 'fotografering', label: 'Fotografering' },
  { value: 'mote', label: 'Mote' },
  { value: 'middag', label: 'Middag' },
]

const VIBES = [
  { value: 'modern', label: 'Modern' },
  { value: 'klassisk', label: 'Klassisk' },
  { value: 'industriell', label: 'Industriell' },
  { value: 'intim', label: 'Intim' },
  { value: 'festlig', label: 'Festlig' },
  { value: 'professionell', label: 'Professionell' },
]

const AREAS = [
  'Sodermalm',
  'Vasastan',
  'Ostermalm',
  'Kungsholmen',
  'Norrmalm',
  'Gamla Stan',
  'Djurgarden',
  'Hammarby Sjostad',
  'Hagerstrom',
  'Solna',
  'Sundbyberg',
]

const AMENITIES = [
  { value: 'projektor', label: 'Projektor' },
  { value: 'ljudsystem', label: 'Ljudsystem' },
  { value: 'mikrofon', label: 'Mikrofon' },
  { value: 'whiteboard', label: 'Whiteboard' },
  { value: 'wifi', label: 'WiFi' },
  { value: 'parkering', label: 'Parkering' },
  { value: 'kok', label: 'Kok' },
  { value: 'bar', label: 'Bar' },
  { value: 'utomhus', label: 'Utomhus' },
  { value: 'scen', label: 'Scen' },
  { value: 'garderob', label: 'Garderob' },
  { value: 'handikappanpassad', label: 'Handikappanpassad' },
]

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

export default function NewVenuePage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
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

  const handleNext = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)

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

    await createVenue(form)
  }

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return formData.name.trim().length > 0
      case 2:
        return formData.address.trim().length > 0
      default:
        return true
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <a
          href="/dashboard"
          className="text-sm text-[#6b7280] hover:text-[#1e3a8a]"
        >
          &larr; Tillbaka till dashboard
        </a>
        <h1 className="text-2xl font-semibold text-[#111827] mt-4">
          Skapa ny lokal
        </h1>
        <p className="text-[#6b7280] mt-1">
          Fyll i information om din lokal. Du kan spara som utkast och publicera senare.
        </p>
      </div>

      {/* Progress indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {STEPS.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                  currentStep >= step.id
                    ? 'bg-[#1e3a8a] text-white'
                    : 'bg-[#e5e7eb] text-[#6b7280]'
                }`}
              >
                {step.id}
              </div>
              <span
                className={`ml-2 text-sm hidden sm:inline ${
                  currentStep >= step.id
                    ? 'text-[#111827] font-medium'
                    : 'text-[#6b7280]'
                }`}
              >
                {step.title}
              </span>
              {index < STEPS.length - 1 && (
                <div
                  className={`w-8 md:w-12 h-0.5 mx-2 ${
                    currentStep > step.id ? 'bg-[#1e3a8a]' : 'bg-[#e5e7eb]'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Form card */}
      <div className="bg-white border border-[#e5e7eb] rounded-xl p-6">
        {/* Step 1: Basic Info */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-[#111827]">Grundlaggande information</h2>

            <div>
              <label htmlFor="name" className="block text-sm font-medium text-[#374151] mb-1.5">
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
              <label htmlFor="description" className="block text-sm font-medium text-[#374151] mb-1.5">
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
              <label className="block text-sm font-medium text-[#374151] mb-2">
                Typ av evenemang
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {VENUE_TYPES.map(type => (
                  <label
                    key={type.value}
                    className={`flex items-center gap-2 p-3 border rounded-lg cursor-pointer transition-colors ${
                      formData.venue_types.includes(type.value)
                        ? 'border-[#1e3a8a] bg-[#1e3a8a]/5'
                        : 'border-[#e5e7eb] hover:border-[#9ca3af]'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={formData.venue_types.includes(type.value)}
                      onChange={() => toggleArrayField('venue_types', type.value)}
                      className="w-4 h-4 text-[#1e3a8a] border-[#d1d5db] rounded focus:ring-[#1e3a8a]"
                    />
                    <span className="text-sm text-[#374151]">{type.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#374151] mb-2">
                Stil/kansla
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {VIBES.map(vibe => (
                  <label
                    key={vibe.value}
                    className={`flex items-center gap-2 p-3 border rounded-lg cursor-pointer transition-colors ${
                      formData.vibes.includes(vibe.value)
                        ? 'border-[#1e3a8a] bg-[#1e3a8a]/5'
                        : 'border-[#e5e7eb] hover:border-[#9ca3af]'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={formData.vibes.includes(vibe.value)}
                      onChange={() => toggleArrayField('vibes', vibe.value)}
                      className="w-4 h-4 text-[#1e3a8a] border-[#d1d5db] rounded focus:ring-[#1e3a8a]"
                    />
                    <span className="text-sm text-[#374151]">{vibe.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Location */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-[#111827]">Plats</h2>

            <div>
              <label htmlFor="address" className="block text-sm font-medium text-[#374151] mb-1.5">
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

            <div>
              <label htmlFor="area" className="block text-sm font-medium text-[#374151] mb-1.5">
                Omrade
              </label>
              <select
                id="area"
                value={formData.area}
                onChange={e => updateField('area', e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-[#e5e5e5] bg-white text-[#1f2937] focus:outline-none focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a]"
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
              <label htmlFor="city" className="block text-sm font-medium text-[#374151] mb-1.5">
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
        )}

        {/* Step 3: Capacity */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-[#111827]">Kapacitet</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="capacity_standing" className="block text-sm font-medium text-[#374151] mb-1.5">
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
                <label htmlFor="capacity_seated" className="block text-sm font-medium text-[#374151] mb-1.5">
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
                <label htmlFor="capacity_conference" className="block text-sm font-medium text-[#374151] mb-1.5">
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
                <label htmlFor="min_guests" className="block text-sm font-medium text-[#374151] mb-1.5">
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
          </div>
        )}

        {/* Step 4: Pricing */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-[#111827]">Priser</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="price_per_hour" className="block text-sm font-medium text-[#374151] mb-1.5">
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
                <label htmlFor="price_half_day" className="block text-sm font-medium text-[#374151] mb-1.5">
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
                <label htmlFor="price_full_day" className="block text-sm font-medium text-[#374151] mb-1.5">
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
                <label htmlFor="price_evening" className="block text-sm font-medium text-[#374151] mb-1.5">
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

            <div>
              <label htmlFor="price_notes" className="block text-sm font-medium text-[#374151] mb-1.5">
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
          </div>
        )}

        {/* Step 5: Amenities */}
        {currentStep === 5 && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-[#111827]">Faciliteter</h2>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {AMENITIES.map(amenity => (
                <label
                  key={amenity.value}
                  className={`flex items-center gap-2 p-3 border rounded-lg cursor-pointer transition-colors ${
                    formData.amenities.includes(amenity.value)
                      ? 'border-[#1e3a8a] bg-[#1e3a8a]/5'
                      : 'border-[#e5e7eb] hover:border-[#9ca3af]'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={formData.amenities.includes(amenity.value)}
                    onChange={() => toggleArrayField('amenities', amenity.value)}
                    className="w-4 h-4 text-[#1e3a8a] border-[#d1d5db] rounded focus:ring-[#1e3a8a]"
                  />
                  <span className="text-sm text-[#374151]">{amenity.label}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Step 6: Contact */}
        {currentStep === 6 && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-[#111827]">Kontaktuppgifter</h2>

            <div>
              <label htmlFor="contact_email" className="block text-sm font-medium text-[#374151] mb-1.5">
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
              <label htmlFor="contact_phone" className="block text-sm font-medium text-[#374151] mb-1.5">
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
              <label htmlFor="website" className="block text-sm font-medium text-[#374151] mb-1.5">
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
        )}

        {/* Navigation */}
        <div className="flex justify-between items-center mt-8 pt-6 border-t border-[#e5e7eb]">
          <Button
            type="button"
            variant="ghost"
            onClick={handlePrevious}
            disabled={currentStep === 1}
          >
            Tillbaka
          </Button>

          <div className="flex gap-3">
            {currentStep === STEPS.length ? (
              <Button
                type="button"
                onClick={handleSubmit}
                loading={isSubmitting}
                disabled={!canProceed()}
              >
                Spara som utkast
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleNext}
                disabled={!canProceed()}
              >
                Nasta
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
