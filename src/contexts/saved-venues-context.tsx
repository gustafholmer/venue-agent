'use client'

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react'
import { getSavedVenueIds } from '@/actions/saved-venues/get-saved-venues'
import { saveVenue } from '@/actions/saved-venues/save-venue'
import { unsaveVenue } from '@/actions/saved-venues/unsave-venue'

interface SavedVenuesContextValue {
  isSaved: (venueId: string) => boolean
  toggleSave: (venueId: string) => Promise<void>
  isLoading: boolean
}

const SavedVenuesContext = createContext<SavedVenuesContextValue | null>(null)

export function SavedVenuesProvider({ children }: { children: ReactNode }) {
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    getSavedVenueIds().then((ids) => {
      setSavedIds(new Set(ids))
      setIsLoading(false)
    })
  }, [])

  const isSaved = useCallback(
    (venueId: string) => savedIds.has(venueId),
    [savedIds]
  )

  const toggleSave = useCallback(
    async (venueId: string) => {
      const wasSaved = savedIds.has(venueId)

      // Optimistic update
      setSavedIds((prev) => {
        const next = new Set(prev)
        if (wasSaved) {
          next.delete(venueId)
        } else {
          next.add(venueId)
        }
        return next
      })

      // Call server action
      const result = wasSaved
        ? await unsaveVenue(venueId)
        : await saveVenue(venueId)

      if (!result.success) {
        // Check for auth error — redirect to sign-in
        if (result.error?.includes('inloggad')) {
          window.location.href = `/auth/sign-in?returnUrl=${encodeURIComponent(window.location.pathname)}`
          return
        }

        // Revert optimistic update on other errors
        setSavedIds((prev) => {
          const next = new Set(prev)
          if (wasSaved) {
            next.add(venueId)
          } else {
            next.delete(venueId)
          }
          return next
        })
      }
    },
    [savedIds]
  )

  return (
    <SavedVenuesContext.Provider value={{ isSaved, toggleSave, isLoading }}>
      {children}
    </SavedVenuesContext.Provider>
  )
}

export function useSavedVenues(): SavedVenuesContextValue {
  const context = useContext(SavedVenuesContext)
  if (!context) {
    throw new Error('useSavedVenues must be used within a SavedVenuesProvider')
  }
  return context
}
