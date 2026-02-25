'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { uploadPhoto } from '@/actions/venues/upload-photo'
import { deletePhoto } from '@/actions/venues/delete-photo'
import { reorderPhotos } from '@/actions/venues/reorder-photos'
import { setPrimaryPhoto } from '@/actions/venues/set-primary-photo'
import Image from 'next/image'
import { resizeImage } from '@/lib/resize-image'

interface Photo {
  id: string
  url: string
  alt_text: string | null
  sort_order: number
  is_primary: boolean
}

export function VenuePhotoManager() {
  const [photos, setPhotos] = useState<Photo[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Fetch photos on mount
  useEffect(() => {
    fetchPhotos()
  }, [])

  const fetchPhotos = async () => {
    try {
      const response = await fetch('/api/venue/photos')
      if (response.ok) {
        const data = await response.json()
        setPhotos(data.photos || [])
      }
    } catch (err) {
      console.error('Error fetching photos:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const showSuccess = (message: string) => {
    setSuccessMessage(message)
    setTimeout(() => setSuccessMessage(null), 3000)
  }

  const showError = (message: string) => {
    setError(message)
    setTimeout(() => setError(null), 5000)
  }

  const handleFileSelect = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return

    setIsUploading(true)
    setError(null)

    for (const file of Array.from(files)) {
      const resizedFile = await resizeImage(file)
      const formData = new FormData()
      formData.append('file', resizedFile)

      const result = await uploadPhoto(formData)
      if (!result.success) {
        showError(result.error || 'Uppladdning misslyckades')
      }
    }

    await fetchPhotos()
    setIsUploading(false)
    showSuccess('Bilderna har laddats upp')
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    handleFileSelect(e.dataTransfer.files)
  }, [handleFileSelect])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDelete = async (photoId: string) => {
    if (!confirm('Ar du saker pa att du vill ta bort denna bild?')) return

    const result = await deletePhoto(photoId)
    if (result.success) {
      setPhotos(photos.filter(p => p.id !== photoId))
      showSuccess('Bilden har tagits bort')
    } else {
      showError(result.error || 'Kunde inte ta bort bilden')
    }
  }

  const handleSetPrimary = async (photoId: string) => {
    const result = await setPrimaryPhoto(photoId)
    if (result.success) {
      setPhotos(photos.map(p => ({
        ...p,
        is_primary: p.id === photoId,
      })))
      showSuccess('Primarbild uppdaterad')
    } else {
      showError(result.error || 'Kunde inte uppdatera primarbild')
    }
  }

  const handleMoveUp = async (index: number) => {
    if (index === 0) return

    const newPhotos = [...photos]
    const temp = newPhotos[index]
    newPhotos[index] = newPhotos[index - 1]
    newPhotos[index - 1] = temp

    // Update sort orders
    const photoOrders = newPhotos.map((p, i) => ({
      id: p.id,
      sort_order: i,
    }))

    setPhotos(newPhotos.map((p, i) => ({ ...p, sort_order: i })))

    const result = await reorderPhotos(photoOrders)
    if (!result.success) {
      showError(result.error || 'Kunde inte andra ordningen')
      await fetchPhotos() // Revert on error
    }
  }

  const handleMoveDown = async (index: number) => {
    if (index === photos.length - 1) return

    const newPhotos = [...photos]
    const temp = newPhotos[index]
    newPhotos[index] = newPhotos[index + 1]
    newPhotos[index + 1] = temp

    // Update sort orders
    const photoOrders = newPhotos.map((p, i) => ({
      id: p.id,
      sort_order: i,
    }))

    setPhotos(newPhotos.map((p, i) => ({ ...p, sort_order: i })))

    const result = await reorderPhotos(photoOrders)
    if (!result.success) {
      showError(result.error || 'Kunde inte andra ordningen')
      await fetchPhotos() // Revert on error
    }
  }

  return (
    <>
      {/* Messages */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-start gap-2">
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)} className="flex-shrink-0 p-1 hover:bg-red-100 rounded" aria-label="Stäng">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      )}
      {successMessage && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 flex items-start gap-2">
          <span className="flex-1">{successMessage}</span>
          <button onClick={() => setSuccessMessage(null)} className="flex-shrink-0 p-1 hover:bg-green-100 rounded" aria-label="Stäng">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      )}

      {/* Upload dropzone */}
      <div
        className={`mb-8 border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
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
          onChange={(e) => handleFileSelect(e.target.files)}
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
          loading={isUploading}
        >
          Välj filer
        </Button>

        <p className="text-sm text-[#78716c] mt-3">
          JPG, PNG eller WebP. Max 5MB per bild.
        </p>
      </div>

      {/* Photo grid */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[#c45a3b] border-t-transparent"></div>
          <p className="text-[#78716c] mt-2">Laddar bilder...</p>
        </div>
      ) : photos.length === 0 ? (
        <div className="bg-white border border-[#e7e5e4] rounded-xl p-12 text-center">
          <svg
            className="mx-auto h-16 w-16 text-[#d1d5db]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <p className="text-[#78716c] mt-4 text-lg">Inga bilder annu</p>
          <p className="text-[#a8a29e] mt-1">
            Ladda upp bilder for att visa din lokal for potentiella kunder.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {photos
            .sort((a, b) => a.sort_order - b.sort_order)
            .map((photo, index) => (
              <div
                key={photo.id}
                className={`relative bg-white border rounded-xl overflow-hidden group ${
                  photo.is_primary
                    ? 'border-[#c45a3b] ring-2 ring-[#c45a3b]/20'
                    : 'border-[#e7e5e4]'
                }`}
              >
                {/* Primary badge */}
                {photo.is_primary && (
                  <div className="absolute top-2 left-2 z-10 bg-[#c45a3b] text-white text-xs px-2 py-1 rounded-full">
                    Huvudbild
                  </div>
                )}

                {/* Image */}
                <div className="relative aspect-[4/3]">
                  <Image
                    src={photo.url}
                    alt={photo.alt_text || 'Lokalbild'}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                </div>

                {/* Actions overlay */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  {/* Move up button */}
                  <button
                    type="button"
                    onClick={() => handleMoveUp(index)}
                    disabled={index === 0}
                    className="p-2 bg-white rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Flytta upp"
                  >
                    <svg
                      className="w-5 h-5 text-[#57534e]"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 15l7-7 7 7"
                      />
                    </svg>
                  </button>

                  {/* Move down button */}
                  <button
                    type="button"
                    onClick={() => handleMoveDown(index)}
                    disabled={index === photos.length - 1}
                    className="p-2 bg-white rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Flytta ner"
                  >
                    <svg
                      className="w-5 h-5 text-[#57534e]"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>

                  {/* Set primary button */}
                  {!photo.is_primary && (
                    <button
                      type="button"
                      onClick={() => handleSetPrimary(photo.id)}
                      className="p-2 bg-white rounded-lg hover:bg-gray-100"
                      title="Satt som huvudbild"
                    >
                      <svg
                        className="w-5 h-5 text-[#f59e0b]"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                        />
                      </svg>
                    </button>
                  )}

                  {/* Delete button */}
                  <button
                    type="button"
                    onClick={() => handleDelete(photo.id)}
                    className="p-2 bg-white rounded-lg hover:bg-gray-100"
                    title="Ta bort"
                  >
                    <svg
                      className="w-5 h-5 text-red-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>

                {/* Sort order indicator */}
                <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                  {index + 1} / {photos.length}
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Help text */}
      {photos.length > 0 && (
        <div className="mt-6 p-4 bg-[#faf9f7] rounded-lg">
          <p className="text-sm text-[#78716c]">
            <strong>Tips:</strong> Hover over en bild for att se alternativ.
            Anvand pilarna for att andra ordningen, stjarnan for att satta huvudbild,
            eller papperskorgen for att ta bort.
          </p>
        </div>
      )}
    </>
  )
}
