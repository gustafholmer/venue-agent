const STORAGE_KEY = 'pending-booking-form'

export interface BookingFormData {
  venueId: string
  venueSlug: string
  eventDate: string
  startTime: string
  endTime: string
  eventType: string
  eventDescription: string
  guestCount: string
  customerName: string
  customerEmail: string
  customerPhone: string
  companyName: string
  agreedToTerms: boolean
  savedAt: number
}

/**
 * Check if sessionStorage is available (handles SSR and browser restrictions)
 */
function isSessionStorageAvailable(): boolean {
  try {
    if (typeof window === 'undefined') {
      return false
    }
    const testKey = '__storage_test__'
    window.sessionStorage.setItem(testKey, testKey)
    window.sessionStorage.removeItem(testKey)
    return true
  } catch {
    return false
  }
}

/**
 * Save booking form data to sessionStorage with current timestamp
 */
export function saveBookingFormData(data: BookingFormData): void {
  if (!isSessionStorageAvailable()) {
    return
  }

  const dataWithTimestamp: BookingFormData = {
    ...data,
    savedAt: Date.now(),
  }

  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(dataWithTimestamp))
  } catch {
    // Storage might be full or restricted - fail silently
  }
}

/**
 * Retrieve booking form data if it matches the venue and is less than 30 minutes old
 * Clears the data after successful retrieval
 */
export function getBookingFormData(venueSlug: string): BookingFormData | null {
  if (!isSessionStorageAvailable()) {
    return null
  }

  try {
    const stored = window.sessionStorage.getItem(STORAGE_KEY)
    if (!stored) {
      return null
    }

    const data: BookingFormData = JSON.parse(stored)

    // Check if venue slug matches
    if (data.venueSlug !== venueSlug) {
      return null
    }

    // Check if data is less than 30 minutes old
    const thirtyMinutesMs = 30 * 60 * 1000
    const age = Date.now() - data.savedAt
    if (age > thirtyMinutesMs) {
      // Data is expired, clear it
      clearBookingFormData()
      return null
    }

    // Clear after successful restore
    clearBookingFormData()

    return data
  } catch {
    // Invalid JSON or other error - clear and return null
    clearBookingFormData()
    return null
  }
}

/**
 * Clear the stored booking form data
 */
export function clearBookingFormData(): void {
  if (!isSessionStorageAvailable()) {
    return
  }

  try {
    window.sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    // Fail silently
  }
}
