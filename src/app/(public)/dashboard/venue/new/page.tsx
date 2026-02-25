'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { createVenue } from '@/actions/venues/create-venue'
import { uploadPhoto } from '@/actions/venues/upload-photo'
import { VENUE_TYPES, VIBES, AREAS, AMENITIES } from '@/lib/constants'

const STEPS = [
  { id: 1, title: 'Grundinfo' },
  { id: 2, title: 'Plats' },
  { id: 3, title: 'Kapacitet' },
  { id: 4, title: 'Priser' },
  { id: 5, title: 'Faciliteter' },
  { id: 6, title: 'Kontakt' },
  { id: 7, title: 'Bilder' },
]

const MAX_DIMENSION = 2000
const QUALITY = 0.8

async function resizeImage(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) return file

  return new Promise((resolve) => {
    const img = new window.Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(url)

      if (img.width <= MAX_DIMENSION && img.height <= MAX_DIMENSION) {
        resolve(file)
        return
      }

      let width = img.width
      let height = img.height

      if (width > height) {
        if (width > MAX_DIMENSION) {
          height = Math.round(height * (MAX_DIMENSION / width))
          width = MAX_DIMENSION
        }
      } else {
        if (height > MAX_DIMENSION) {
          width = Math.round(width * (MAX_DIMENSION / height))
          height = MAX_DIMENSION
        }
      }

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        resolve(file)
        return
      }

      ctx.drawImage(img, 0, 0, width, height)

      const outputType = file.type === 'image/png' ? 'image/png' : 'image/webp'

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file)
            return
          }
          const resized = new File([blob], file.name, { type: outputType })
          resolve(resized)
        },
        outputType,
        QUALITY
      )
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(file)
    }

    img.src = url
  })
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

interface SelectedFile {
  file: File
  previewUrl: string
}

export default function NewVenuePage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploadProgress, setUploadProgress] = useState('')
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
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

  const handleFilesSelected = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return
    const newFiles = Array.from(files)
      .filter(f => f.type.startsWith('image/'))
      .map(file => ({
        file,
        previewUrl: URL.createObjectURL(file),
      }))
    setSelectedFiles(prev => [...prev, ...newFiles])
  }, [])

  const removeFile = useCallback((index: number) => {
    setSelectedFiles(prev => {
      const removed = prev[index]
      URL.revokeObjectURL(removed.previewUrl)
      return prev.filter((_, i) => i !== index)
    })
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    handleFilesSelected(e.dataTransfer.files)
  }, [handleFilesSelected])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

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
    setUploadProgress('')

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
          className="text-sm text-[#78716c] hover:text-[#c45a3b]"
        >
          &larr; Tillbaka till dashboard
        </a>
        <h1 className="font-[family-name:var(--font-heading)] text-2xl font-semibold text-[#1a1a1a] mt-4">
          Skapa ny lokal
        </h1>
        <p className="text-[#78716c] mt-1">
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
                    ? 'bg-[#c45a3b] text-white'
                    : 'bg-[#e7e5e4] text-[#78716c]'
                }`}
              >
                {step.id}
              </div>
              <span
                className={`ml-2 text-sm hidden sm:inline ${
                  currentStep >= step.id
                    ? 'text-[#1a1a1a] font-medium'
                    : 'text-[#78716c]'
                }`}
              >
                {step.title}
              </span>
              {index < STEPS.length - 1 && (
                <div
                  className={`w-8 md:w-12 h-0.5 mx-2 ${
                    currentStep > step.id ? 'bg-[#c45a3b]' : 'bg-[#e7e5e4]'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Form card */}
      <div className="bg-white border border-[#e7e5e4] rounded-xl p-6">
        {/* Step 1: Basic Info */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-[#1a1a1a]">Grundlaggande information</h2>

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
        )}

        {/* Step 2: Location */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-[#1a1a1a]">Plats</h2>

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
        )}

        {/* Step 3: Capacity */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-[#1a1a1a]">Kapacitet</h2>

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
          </div>
        )}

        {/* Step 4: Pricing */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-[#1a1a1a]">Priser</h2>

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

            <div>
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
          </div>
        )}

        {/* Step 5: Amenities */}
        {currentStep === 5 && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-[#1a1a1a]">Faciliteter</h2>

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
          </div>
        )}

        {/* Step 6: Contact */}
        {currentStep === 6 && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-[#1a1a1a]">Kontaktuppgifter</h2>

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
        )}

        {/* Step 7: Photos */}
        {currentStep === 7 && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-[#1a1a1a]">Bilder</h2>
            <p className="text-sm text-[#78716c]">
              Lagg till bilder pa din lokal. Bilder hjalper kunder att fa en bild av lokalen.
            </p>

            {/* Dropzone */}
            <div
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                isDragging
                  ? 'border-[#c45a3b] bg-[#c45a3b]/5'
                  : 'border-[#e7e5e4] hover:border-[#a8a29e]'
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={(e) => handleFilesSelected(e.target.files)}
                className="hidden"
              />

              <div className="mb-4">
                <svg
                  className="mx-auto h-12 w-12 text-[#a8a29e]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>

              <p className="text-[#57534e] mb-2">
                {isDragging
                  ? 'Slapp bilderna har'
                  : 'Dra och slapp bilder har, eller'}
              </p>

              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
              >
                Valj filer
              </Button>

              <p className="text-sm text-[#78716c] mt-3">
                JPG, PNG eller WebP. Max 5MB per bild.
              </p>
            </div>

            {/* Thumbnail previews */}
            {selectedFiles.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {selectedFiles.map((sf, index) => (
                  <div key={sf.previewUrl} className="relative group">
                    <div className="aspect-[4/3] rounded-lg overflow-hidden bg-[#f5f5f4]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={sf.previewUrl}
                        alt={sf.file.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
                      title="Ta bort"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                    <p className="text-xs text-[#78716c] mt-1 truncate">{sf.file.name}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between items-center mt-8 pt-6 border-t border-[#e7e5e4]">
          <Button
            type="button"
            variant="ghost"
            onClick={handlePrevious}
            disabled={currentStep === 1}
          >
            Tillbaka
          </Button>

          <div className="flex items-center gap-3">
            {uploadProgress && (
              <span className="text-sm text-[#78716c]">{uploadProgress}</span>
            )}
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
