'use client'

import { useState, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'

interface SelectedFile {
  file: File
  previewUrl: string
}

interface EditablePhotoGalleryProps {
  photos: SelectedFile[]
  onAdd: (files: FileList) => void
  onRemove: (index: number) => void
  venueName: string
}

export function EditablePhotoGallery({
  photos,
  onAdd,
  onRemove,
  venueName,
}: EditablePhotoGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      if (e.dataTransfer.files.length > 0) {
        onAdd(e.dataTransfer.files)
      }
    },
    [onAdd]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handlePrevious = useCallback(() => {
    setSelectedIndex((prev) => (prev > 0 ? prev - 1 : photos.length - 1))
  }, [photos.length])

  const handleNext = useCallback(() => {
    setSelectedIndex((prev) => (prev < photos.length - 1 ? prev + 1 : 0))
  }, [photos.length])

  const safeIndex = Math.min(selectedIndex, Math.max(photos.length - 1, 0))

  const hiddenInput = (
    <input
      ref={fileInputRef}
      type="file"
      accept="image/jpeg,image/png,image/webp"
      multiple
      onChange={(e) => e.target.files && onAdd(e.target.files)}
      className="hidden"
    />
  )

  // Empty state: dropzone
  if (photos.length === 0) {
    return (
      <div
        className={`aspect-[16/9] max-h-[28rem] rounded-xl flex items-center justify-center border-2 border-dashed transition-colors ${
          isDragging
            ? 'border-[#c45a3b] bg-[#c45a3b]/5'
            : 'border-[#d1d5db] bg-[#faf9f7] hover:border-[#a8a29e]'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {hiddenInput}
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
          <p className="text-[#78716c] mb-3">Dra och slapp bilder har</p>
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
          >
            Valj filer
          </Button>
          <p className="text-sm text-[#a8a29e] mt-3">JPG, PNG eller WebP</p>
        </div>
      </div>
    )
  }

  // Has photos: gallery view
  const selectedPhoto = photos[safeIndex]

  return (
    <div
      className="space-y-4"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      {hiddenInput}

      {/* Main image */}
      <div
        className={`relative aspect-[16/9] max-h-[28rem] bg-[#faf9f7] rounded-xl overflow-hidden group ${
          isDragging ? 'ring-2 ring-[#c45a3b]' : ''
        }`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={selectedPhoto.previewUrl}
          alt={venueName || 'Bild'}
          className="w-full h-full object-cover"
        />

        {/* Add more button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="absolute top-4 right-4 bg-white/90 hover:bg-white px-3 py-1.5 rounded-full text-sm font-medium text-[#1a1a1a] transition-colors shadow-sm"
        >
          + Lagg till fler
        </button>

        {/* Navigation arrows */}
        {photos.length > 1 && (
          <>
            <button
              type="button"
              onClick={handlePrevious}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 bg-white/90 rounded-full flex items-center justify-center text-[#1a1a1a] hover:bg-white transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
              aria-label="Foregaende bild"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 bg-white/90 rounded-full flex items-center justify-center text-[#1a1a1a] hover:bg-white transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
              aria-label="Nasta bild"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        )}

        {/* Counter */}
        {photos.length > 1 && (
          <div className="absolute bottom-4 right-4 bg-black/60 text-white px-3 py-1 rounded-full text-sm">
            {safeIndex + 1} / {photos.length}
          </div>
        )}
      </div>

      {/* Thumbnail strip */}
      {photos.length > 1 && (
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
          {photos.slice(0, 6).map((photo, index) => (
            <div key={photo.previewUrl} className="relative group/thumb">
              <button
                type="button"
                onClick={() => setSelectedIndex(index)}
                className={`relative aspect-square rounded-lg overflow-hidden w-full transition-all ${
                  index === safeIndex
                    ? 'ring-2 ring-[#c45a3b] ring-offset-2'
                    : 'opacity-70 hover:opacity-100'
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.previewUrl}
                  alt={`${venueName || 'Bild'} - ${index + 1}`}
                  className="w-full h-full object-cover"
                />
                {index === 5 && photos.length > 6 && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <span className="text-white font-medium">+{photos.length - 6}</span>
                  </div>
                )}
              </button>
              {/* Remove button */}
              <button
                type="button"
                onClick={() => {
                  onRemove(index)
                  if (safeIndex >= photos.length - 1 && safeIndex > 0) {
                    setSelectedIndex(safeIndex - 1)
                  }
                }}
                className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-black/70 rounded-full flex items-center justify-center text-white opacity-0 group-hover/thumb:opacity-100 transition-opacity hover:bg-black/90"
                aria-label="Ta bort bild"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
