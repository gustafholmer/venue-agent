'use client'

import { useLoadScript, Libraries } from '@react-google-maps/api'
import { createContext, useContext, ReactNode } from 'react'

const libraries: Libraries = ['places']

interface GoogleMapsContextValue {
  isLoaded: boolean
  loadError: Error | undefined
}

const GoogleMapsContext = createContext<GoogleMapsContextValue>({
  isLoaded: false,
  loadError: undefined,
})

export function useGoogleMaps() {
  return useContext(GoogleMapsContext)
}

interface GoogleMapsProviderProps {
  children: ReactNode
}

export function GoogleMapsProvider({ children }: GoogleMapsProviderProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: apiKey || '',
    libraries,
    preventGoogleFontsLoading: true,
  })

  // If no API key, still render children but with isLoaded: false
  if (!apiKey) {
    return (
      <GoogleMapsContext.Provider value={{ isLoaded: false, loadError: undefined }}>
        {children}
      </GoogleMapsContext.Provider>
    )
  }

  return (
    <GoogleMapsContext.Provider value={{ isLoaded, loadError }}>
      {children}
    </GoogleMapsContext.Provider>
  )
}
