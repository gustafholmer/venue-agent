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

  const openLightbox = (index: number) => {
    setSelectedIndex(index)
    setIsLightboxOpen(true)
  }

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

  // Single photo: full-width hero
  if (allPhotos.length === 1) {
    return (
      <>
        <div
          className="relative aspect-[16/9] bg-[#faf9f7] rounded-xl overflow-hidden cursor-pointer group"
          onClick={() => openLightbox(0)}
        >
          <Image
            src={allPhotos[0].url}
            alt={allPhotos[0].alt_text || venueName}
            fill
            sizes="(max-width: 1280px) 100vw, 1280px"
            priority
            className="object-cover"
          />
        </div>
        {isLightboxOpen && (
          <Lightbox
            photos={allPhotos}
            venueName={venueName}
            selectedIndex={selectedIndex}
            onClose={() => setIsLightboxOpen(false)}
            onPrevious={handlePrevious}
            onNext={handleNext}
            onSelect={setSelectedIndex}
            onKeyDown={handleKeyDown}
          />
        )}
      </>
    )
  }

  return (
    <>
      {/* Airbnb-style Image Grid */}
      <div className="relative">
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_0.5fr_0.5fr] gap-2 h-[300px] sm:h-[400px]">
          {/* Hero image - left half */}
          <button
            className="relative overflow-hidden cursor-pointer group sm:row-span-2 rounded-l-xl"
            onClick={() => openLightbox(0)}
          >
            <Image
              src={allPhotos[0].url}
              alt={allPhotos[0].alt_text || venueName}
              fill
              sizes="(max-width: 640px) 100vw, 50vw"
              priority
              className="object-cover transition-brightness duration-200 group-hover:brightness-90"
            />
          </button>

          {/* Top-right images */}
          <button
            className="relative overflow-hidden cursor-pointer group hidden sm:block"
            onClick={() => openLightbox(1)}
          >
            <Image
              src={allPhotos[1].url}
              alt={allPhotos[1].alt_text || `${venueName} - Bild 2`}
              fill
              sizes="25vw"
              className="object-cover transition-brightness duration-200 group-hover:brightness-90"
            />
          </button>
          <button
            className="relative overflow-hidden cursor-pointer group hidden sm:block rounded-tr-xl"
            onClick={() => openLightbox(Math.min(2, allPhotos.length - 1))}
          >
            <Image
              src={allPhotos[Math.min(2, allPhotos.length - 1)].url}
              alt={allPhotos[Math.min(2, allPhotos.length - 1)].alt_text || `${venueName} - Bild 3`}
              fill
              sizes="25vw"
              className="object-cover transition-brightness duration-200 group-hover:brightness-90"
            />
          </button>

          {/* Bottom-right images */}
          <button
            className="relative overflow-hidden cursor-pointer group hidden sm:block"
            onClick={() => openLightbox(Math.min(3, allPhotos.length - 1))}
          >
            <Image
              src={allPhotos[Math.min(3, allPhotos.length - 1)].url}
              alt={allPhotos[Math.min(3, allPhotos.length - 1)].alt_text || `${venueName} - Bild 4`}
              fill
              sizes="25vw"
              className="object-cover transition-brightness duration-200 group-hover:brightness-90"
            />
          </button>
          <button
            className="relative overflow-hidden cursor-pointer group hidden sm:block rounded-br-xl"
            onClick={() => openLightbox(Math.min(4, allPhotos.length - 1))}
          >
            <Image
              src={allPhotos[Math.min(4, allPhotos.length - 1)].url}
              alt={allPhotos[Math.min(4, allPhotos.length - 1)].alt_text || `${venueName} - Bild 5`}
              fill
              sizes="25vw"
              className="object-cover transition-brightness duration-200 group-hover:brightness-90"
            />
          </button>
        </div>

        {/* "Show all photos" button */}
        {allPhotos.length > 5 && (
          <button
            onClick={() => openLightbox(0)}
            className="absolute bottom-4 right-4 bg-white hover:bg-gray-50 border border-[#1a1a1a] px-4 py-1.5 rounded-lg text-sm font-medium text-[#1a1a1a] transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
              <circle cx="3" cy="3" r="1.5" />
              <circle cx="8" cy="3" r="1.5" />
              <circle cx="13" cy="3" r="1.5" />
              <circle cx="3" cy="8" r="1.5" />
              <circle cx="8" cy="8" r="1.5" />
              <circle cx="13" cy="8" r="1.5" />
              <circle cx="3" cy="13" r="1.5" />
              <circle cx="8" cy="13" r="1.5" />
              <circle cx="13" cy="13" r="1.5" />
            </svg>
            Visa alla bilder
          </button>
        )}
      </div>

      {/* Lightbox */}
      {isLightboxOpen && (
        <Lightbox
          photos={allPhotos}
          venueName={venueName}
          selectedIndex={selectedIndex}
          onClose={() => setIsLightboxOpen(false)}
          onPrevious={handlePrevious}
          onNext={handleNext}
          onSelect={setSelectedIndex}
          onKeyDown={handleKeyDown}
        />
      )}
    </>
  )
}

function Lightbox({
  photos,
  venueName,
  selectedIndex,
  onClose,
  onPrevious,
  onNext,
  onSelect,
  onKeyDown,
}: {
  photos: VenuePhoto[]
  venueName: string
  selectedIndex: number
  onClose: () => void
  onPrevious: () => void
  onNext: () => void
  onSelect: (index: number) => void
  onKeyDown: (e: React.KeyboardEvent) => void
}) {
  const selectedPhoto = photos[selectedIndex]

  return (
    <div
      className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
      onClick={onClose}
      onKeyDown={onKeyDown}
      tabIndex={0}
      role="dialog"
      aria-modal="true"
      aria-label="Bildvisare"
    >
      {/* Close button */}
      <button
        onClick={onClose}
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
      {photos.length > 1 && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onPrevious()
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
              onNext()
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
        {selectedIndex + 1} / {photos.length}
      </div>

      {/* Thumbnail strip */}
      <div className="absolute bottom-16 left-1/2 -translate-x-1/2 flex gap-2 max-w-[90vw] overflow-x-auto p-2">
        {photos.map((photo, index) => (
          <button
            key={photo.id}
            onClick={(e) => {
              e.stopPropagation()
              onSelect(index)
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
  )
}
