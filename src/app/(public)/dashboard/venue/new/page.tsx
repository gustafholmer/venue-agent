'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { createVenue } from '@/actions/venues/create-venue'
import { uploadPhoto } from '@/actions/venues/upload-photo'
import { resizeImage } from '@/lib/resize-image'
import { VENUE_TYPES, VIBES, AREAS, AMENITIES } from '@/lib/constants'
import { EditableText } from '@/components/venues/editable-text'
import { EditableNumber } from '@/components/venues/editable-number'
import { EditablePillPicker } from '@/components/venues/editable-pill-picker'
import { EditablePhotoGallery } from '@/components/venues/editable-photo-gallery'

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

interface SelectedFile {
  file: File
  previewUrl: string
}

function formatPrice(value: string): string {
  if (!value) return ''
  return `${Number(value).toLocaleString('sv-SE')} SEK`
}

export default function NewVenuePage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploadProgress, setUploadProgress] = useState('')
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([])
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
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleFilesSelected = useCallback((files: FileList) => {
    const newFiles = Array.from(files)
      .filter((f) => f.type.startsWith('image/'))
      .map((file) => ({
        file,
        previewUrl: URL.createObjectURL(file),
      }))
    setSelectedFiles((prev) => [...prev, ...newFiles])
  }, [])

  const removeFile = useCallback((index: number) => {
    setSelectedFiles((prev) => {
      const removed = prev[index]
      URL.revokeObjectURL(removed.previewUrl)
      return prev.filter((_, i) => i !== index)
    })
  }, [])

  const handleSubmit = async () => {
    setIsSubmitting(true)
    setUploadProgress('')

    const form = new window.FormData()
    form.append('name', formData.name)
    form.append('description', formData.description)
    form.append('address', formData.address)
    form.append('area', formData.area)
    form.append('city', formData.city)
    formData.venue_types.forEach((type) => form.append('venue_types', type))
    formData.vibes.forEach((vibe) => form.append('vibes', vibe))
    form.append('capacity_standing', formData.capacity_standing)
    form.append('capacity_seated', formData.capacity_seated)
    form.append('capacity_conference', formData.capacity_conference)
    form.append('min_guests', formData.min_guests)
    form.append('price_per_hour', formData.price_per_hour)
    form.append('price_half_day', formData.price_half_day)
    form.append('price_full_day', formData.price_full_day)
    form.append('price_evening', formData.price_evening)
    form.append('price_notes', formData.price_notes)
    formData.amenities.forEach((amenity) => form.append('amenities', amenity))
    form.append('contact_email', formData.contact_email)
    form.append('contact_phone', formData.contact_phone)
    form.append('website', formData.website)

    setUploadProgress('Skapar lokal...')
    const result = await createVenue(form)
    if (!result.success) {
      setUploadProgress('')
      setIsSubmitting(false)
      alert(result.error || 'Kunde inte skapa lokalen')
      return
    }

    // Upload photos sequentially
    if (selectedFiles.length > 0) {
      for (let i = 0; i < selectedFiles.length; i++) {
        setUploadProgress(`Laddar upp bild ${i + 1} av ${selectedFiles.length}...`)
        const resizedFile = await resizeImage(selectedFiles[i].file)
        const photoForm = new window.FormData()
        photoForm.append('file', resizedFile)
        const photoResult = await uploadPhoto(photoForm)
        if (!photoResult.success) {
          console.error('Photo upload failed:', photoResult.error)
        }
      }
    }

    router.push('/dashboard/venue?success=venue_created')
  }

  const hasPricing =
    formData.price_per_hour || formData.price_half_day || formData.price_full_day || formData.price_evening

  return (
    <div className="-m-6 min-h-screen bg-white">
      {/* Info Banner */}
      <div className="bg-blue-50 border-b border-blue-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-blue-800">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-sm">
                <span className="font-medium">Skapa ny lokal</span> — Redigera direkt. Sa har ser din lokal ut for kunder.
              </p>
            </div>
            <Link
              href="/dashboard"
              className="text-sm text-blue-700 hover:text-blue-900 font-medium flex-shrink-0"
            >
              Avbryt
            </Link>
          </div>
        </div>
      </div>

      {/* Photo Gallery */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <EditablePhotoGallery
          photos={selectedFiles}
          onAdd={handleFilesSelected}
          onRemove={removeFile}
          venueName={formData.name || 'Ny lokal'}
        />
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
          {/* Left Column - Venue Details */}
          <div className="lg:col-span-2 space-y-8">
            {/* Header */}
            <div>
              <EditableText
                value={formData.name}
                onChange={(v) => updateField('name', v)}
                placeholder="Namn pa lokalen"
                className="font-[family-name:var(--font-heading)] text-2xl sm:text-3xl font-semibold text-[#1a1a1a]"
              />
              <div className="flex flex-wrap items-center gap-1 text-[#78716c] mt-2">
                <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <div className="group/editable rounded-lg transition-colors hover:outline hover:outline-dashed hover:outline-1 hover:outline-[#a8a29e] hover:bg-[#faf9f7]">
                  <select
                    value={formData.area}
                    onChange={(e) => updateField('area', e.target.value)}
                    className="bg-transparent border-none outline-none text-[#78716c] cursor-pointer appearance-none pr-1"
                  >
                    <option value="">Valj omrade</option>
                    {AREAS.map((area) => (
                      <option key={area} value={area}>
                        {area}
                      </option>
                    ))}
                  </select>
                </div>
                <span className="text-[#a8a29e]">,</span>
                <EditableText
                  value={formData.city}
                  onChange={(v) => updateField('city', v)}
                  placeholder="Stad"
                  className="text-[#78716c]"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <h2 className="text-lg font-semibold text-[#1a1a1a] mb-3">Om lokalen</h2>
              <EditableText
                value={formData.description}
                onChange={(v) => updateField('description', v)}
                placeholder="Beskriv din lokal, vad som gor den unik och vad den passar for..."
                className="text-[#57534e] leading-relaxed"
                multiline
              />
            </div>

            {/* Capacity */}
            <div>
              <h2 className="text-lg font-semibold text-[#1a1a1a] mb-3">Kapacitet</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-[#faf9f7] rounded-xl p-4">
                  <div className="flex items-center gap-2 text-[#78716c] mb-1">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                    <span className="text-sm">Staende</span>
                  </div>
                  <EditableNumber
                    value={formData.capacity_standing}
                    onChange={(v) => updateField('capacity_standing', v)}
                    placeholder="Antal personer"
                    suffix=" personer"
                    className="text-xl font-semibold text-[#1a1a1a]"
                  />
                </div>
                <div className="bg-[#faf9f7] rounded-xl p-4">
                  <div className="flex items-center gap-2 text-[#78716c] mb-1">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                      />
                    </svg>
                    <span className="text-sm">Sittande</span>
                  </div>
                  <EditableNumber
                    value={formData.capacity_seated}
                    onChange={(v) => updateField('capacity_seated', v)}
                    placeholder="Antal personer"
                    suffix=" personer"
                    className="text-xl font-semibold text-[#1a1a1a]"
                  />
                </div>
                <div className="bg-[#faf9f7] rounded-xl p-4">
                  <div className="flex items-center gap-2 text-[#78716c] mb-1">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                      />
                    </svg>
                    <span className="text-sm">Konferens</span>
                  </div>
                  <EditableNumber
                    value={formData.capacity_conference}
                    onChange={(v) => updateField('capacity_conference', v)}
                    placeholder="Antal personer"
                    suffix=" personer"
                    className="text-xl font-semibold text-[#1a1a1a]"
                  />
                </div>
              </div>
            </div>

            {/* Amenities */}
            <div>
              <h2 className="text-lg font-semibold text-[#1a1a1a] mb-3">Faciliteter</h2>
              <EditablePillPicker
                selected={formData.amenities}
                options={AMENITIES}
                onChange={(v) => updateField('amenities', v)}
                pillClassName="bg-[#faf9f7] rounded-full text-sm text-[#57534e]"
                showCheckIcon
                emptyText="Lagg till faciliteter"
              />
            </div>

            {/* Venue Types */}
            <div>
              <h2 className="text-lg font-semibold text-[#1a1a1a] mb-3">Passar for</h2>
              <EditablePillPicker
                selected={formData.venue_types}
                options={VENUE_TYPES}
                onChange={(v) => updateField('venue_types', v)}
                pillClassName="bg-[#c45a3b]/10 rounded-full text-sm text-[#c45a3b] font-medium"
                emptyText="Lagg till typer"
              />
            </div>

            {/* Vibes */}
            <div>
              <h2 className="text-lg font-semibold text-[#1a1a1a] mb-3">Kansla</h2>
              <EditablePillPicker
                selected={formData.vibes}
                options={VIBES}
                onChange={(v) => updateField('vibes', v)}
                pillClassName="bg-[#f3f4f6] rounded-full text-sm text-[#57534e]"
                emptyText="Lagg till kansla"
              />
            </div>

            {/* Address */}
            <div>
              <h2 className="text-lg font-semibold text-[#1a1a1a] mb-3">Adress</h2>
              <EditableText
                value={formData.address}
                onChange={(v) => updateField('address', v)}
                placeholder="T.ex. Gotgatan 42"
                className="text-[#57534e]"
              />
            </div>
          </div>

          {/* Right Column - Pricing & CTA */}
          <div className="lg:col-span-1">
            <div className="sticky top-6 bg-white border border-[#e7e5e4] rounded-2xl p-6 shadow-sm">
              {/* Pricing */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-[#1a1a1a] mb-4">Priser</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[#78716c]">Pris per timme</span>
                    <EditableNumber
                      value={formData.price_per_hour}
                      onChange={(v) => updateField('price_per_hour', v)}
                      placeholder="Ange pris"
                      suffix=" SEK"
                      className="font-semibold text-[#1a1a1a] text-right"
                    />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[#78716c]">Halvdag</span>
                    <EditableNumber
                      value={formData.price_half_day}
                      onChange={(v) => updateField('price_half_day', v)}
                      placeholder="Ange pris"
                      suffix=" SEK"
                      className="font-semibold text-[#1a1a1a] text-right"
                    />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[#78716c]">Heldag</span>
                    <EditableNumber
                      value={formData.price_full_day}
                      onChange={(v) => updateField('price_full_day', v)}
                      placeholder="Ange pris"
                      suffix=" SEK"
                      className="font-semibold text-[#1a1a1a] text-right"
                    />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[#78716c]">Kvall</span>
                    <EditableNumber
                      value={formData.price_evening}
                      onChange={(v) => updateField('price_evening', v)}
                      placeholder="Ange pris"
                      suffix=" SEK"
                      className="font-semibold text-[#1a1a1a] text-right"
                    />
                  </div>
                </div>
                <div className="mt-3">
                  <EditableText
                    value={formData.price_notes}
                    onChange={(v) => updateField('price_notes', v)}
                    placeholder="Prisanteckningar (t.ex. minsta bokningstid)"
                    className="text-sm text-[#78716c]"
                    multiline
                  />
                </div>
              </div>

              {/* CTA Button (disabled preview) */}
              <Button variant="primary" size="lg" className="w-full" disabled>
                Skicka bokningsforfragan
              </Button>

              {/* Contact Info */}
              <div className="mt-6 pt-6 border-t border-[#e7e5e4]">
                <h3 className="text-sm font-semibold text-[#1a1a1a] mb-3">Kontakt</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-[#78716c] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                    <EditableText
                      value={formData.contact_email}
                      onChange={(v) => updateField('contact_email', v)}
                      placeholder="E-postadress"
                      className="text-sm text-[#78716c]"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-[#78716c] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                      />
                    </svg>
                    <EditableText
                      value={formData.contact_phone}
                      onChange={(v) => updateField('contact_phone', v)}
                      placeholder="Telefonnummer"
                      className="text-sm text-[#78716c]"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-[#78716c] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                      />
                    </svg>
                    <EditableText
                      value={formData.website}
                      onChange={(v) => updateField('website', v)}
                      placeholder="Webbplats"
                      className="text-sm text-[#78716c]"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating save button */}
      <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3">
        {uploadProgress && (
          <span className="text-sm text-[#78716c] bg-white px-3 py-2 rounded-lg shadow-sm border border-[#e7e5e4]">
            {uploadProgress}
          </span>
        )}
        <Button onClick={handleSubmit} loading={isSubmitting}>
          Spara som utkast
        </Button>
      </div>
    </div>
  )
}
