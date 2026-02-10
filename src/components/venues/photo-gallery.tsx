'use client'

import { useState, useCallback } from 'react'
import Image from 'next/image'
import type { VenuePhoto } from '@/types/database'

interface PhotoGalleryProps {
  photos: VenuePhoto[]
  venueName: string
}

export function PhotoGallery({ photos, venueName }: PhotoGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [isLightboxOpen, setIsLightboxOpen] = useState(false)

  const primaryPhoto = photos.find((p) => p.is_primary) || photos[0]
  const allPhotos = primaryPhoto
    ? [primaryPhoto, ...photos.filter((p) => p.id !== primaryPhoto.id)]
    : photos

  const selectedPhoto = allPhotos[selectedIndex]

  const handlePrevious = useCallback(() => {
    setSelectedIndex((prev) => (prev > 0 ? prev - 1 : allPhotos.length - 1))
  }, [allPhotos.length])

  const handleNext = useCallback(() => {
    setSelectedIndex((prev) => (prev < allPhotos.length - 1 ? prev + 1 : 0))
  }, [allPhotos.length])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsLightboxOpen(false)
      } else if (e.key === 'ArrowLeft') {
        handlePrevious()
      } else if (e.key === 'ArrowRight') {
        handleNext()
      }
    },
    [handlePrevious, handleNext]
  )

  if (photos.length === 0) {
    return (
      <div className="aspect-[16/9] bg-[#faf9f7] rounded-xl flex items-center justify-center">
        <div className="text-center">
          <svg
            className="w-16 h-16 text-[#d1d5db] mx-auto mb-4"
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
          <p className="text-[#78716c]">Inga bilder tillgängliga</p>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Main Gallery */}
      <div className="space-y-4">
        {/* Primary Image */}
        <div
          className="relative aspect-[16/9] bg-[#faf9f7] rounded-xl overflow-hidden cursor-pointer group"
          onClick={() => setIsLightboxOpen(true)}
        >
          <Image
            src={selectedPhoto?.url || ''}
            alt={selectedPhoto?.alt_text || venueName}
            fill
            sizes="(max-width: 1280px) 100vw, 1280px"
            priority
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />

          {/* View all photos overlay */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
            <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 px-4 py-2 rounded-full text-sm font-medium text-[#1a1a1a]">
              Visa alla bilder ({allPhotos.length})
            </span>
          </div>

          {/* Navigation arrows (if multiple photos) */}
          {allPhotos.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handlePrevious()
                }}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 bg-white/90 rounded-full flex items-center justify-center text-[#1a1a1a] hover:bg-white transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                aria-label="Föregående bild"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleNext()
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 bg-white/90 rounded-full flex items-center justify-center text-[#1a1a1a] hover:bg-white transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                aria-label="Nästa bild"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </>
          )}

          {/* Image counter */}
          {allPhotos.length > 1 && (
            <div className="absolute bottom-4 right-4 bg-black/60 text-white px-3 py-1 rounded-full text-sm">
              {selectedIndex + 1} / {allPhotos.length}
            </div>
          )}
        </div>

        {/* Thumbnail Grid */}
        {allPhotos.length > 1 && (
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
            {allPhotos.slice(0, 6).map((photo, index) => (
              <button
                key={photo.id}
                onClick={() => setSelectedIndex(index)}
                className={`relative aspect-square rounded-lg overflow-hidden transition-all ${
                  index === selectedIndex
                    ? 'ring-2 ring-[#c45a3b] ring-offset-2'
                    : 'opacity-70 hover:opacity-100'
                }`}
              >
                <Image
                  src={photo.url}
                  alt={photo.alt_text || `${venueName} - Bild ${index + 1}`}
                  fill
                  sizes="120px"
                  className="object-cover"
                />
                {/* Show +X more overlay on the last thumbnail */}
                {index === 5 && allPhotos.length > 6 && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <span className="text-white font-medium">+{allPhotos.length - 6}</span>
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {isLightboxOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
          onClick={() => setIsLightboxOpen(false)}
          onKeyDown={handleKeyDown}
          tabIndex={0}
          role="dialog"
          aria-modal="true"
          aria-label="Bildvisare"
        >
          {/* Close button */}
          <button
            onClick={() => setIsLightboxOpen(false)}
            className="absolute top-4 right-4 w-11 h-11 bg-white/10 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors z-10"
            aria-label="Stäng"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Image */}
          <div
            className="max-w-[90vw] max-h-[85vh] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={selectedPhoto?.url}
              alt={selectedPhoto?.alt_text || venueName}
              className="max-w-full max-h-[85vh] object-contain"
            />
          </div>

          {/* Navigation arrows */}
          {allPhotos.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handlePrevious()
                }}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors"
                aria-label="Föregående bild"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleNext()
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors"
                aria-label="Nästa bild"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </>
          )}

          {/* Image counter */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 text-white px-4 py-2 rounded-full text-sm">
            {selectedIndex + 1} / {allPhotos.length}
          </div>

          {/* Thumbnail strip */}
          <div className="absolute bottom-16 left-1/2 -translate-x-1/2 flex gap-2 max-w-[90vw] overflow-x-auto p-2">
            {allPhotos.map((photo, index) => (
              <button
                key={photo.id}
                onClick={(e) => {
                  e.stopPropagation()
                  setSelectedIndex(index)
                }}
                className={`relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden transition-all ${
                  index === selectedIndex
                    ? 'ring-2 ring-white'
                    : 'opacity-50 hover:opacity-100'
                }`}
              >
                <Image
                  src={photo.url}
                  alt={photo.alt_text || `${venueName} - Bild ${index + 1}`}
                  fill
                  sizes="64px"
                  className="object-cover"
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
