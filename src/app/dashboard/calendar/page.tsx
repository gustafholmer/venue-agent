'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { getCalendarData, type CalendarData } from '@/actions/venues/get-calendar-data'
import { blockDate, blockDateRange } from '@/actions/venues/block-date'
import { unblockDate } from '@/actions/venues/unblock-date'

const SWEDISH_DAYS = ['Man', 'Tis', 'Ons', 'Tor', 'Fre', 'Lor', 'Son']
const SWEDISH_MONTHS = [
  'Januari', 'Februari', 'Mars', 'April', 'Maj', 'Juni',
  'Juli', 'Augusti', 'September', 'Oktober', 'November', 'December'
]

interface DayData {
  date: Date
  dateStr: string
  isCurrentMonth: boolean
  isBlocked: boolean
  blockReason?: string | null
  hasAcceptedBooking: boolean
  hasPendingBooking: boolean
  bookingInfo?: { customerName: string; eventType: string | null }
}

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(() => new Date())
  const [calendarData, setCalendarData] = useState<CalendarData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)

  // Modal state for blocking multiple days
  const [showBlockModal, setShowBlockModal] = useState(false)
  const [rangeStartDate, setRangeStartDate] = useState('')
  const [rangeEndDate, setRangeEndDate] = useState('')
  const [blockReason, setBlockReason] = useState('')

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth() + 1 // 1-indexed for the action

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    const result = await getCalendarData(year, month)
    if (result.success && result.data) {
      setCalendarData(result.data)
    } else {
      setError(result.error || 'Kunde inte ladda kalenderdata')
    }
    setIsLoading(false)
  }, [year, month])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const showSuccessMessage = (message: string) => {
    setSuccessMessage(message)
    setTimeout(() => setSuccessMessage(null), 3000)
  }

  const showErrorMessage = (message: string) => {
    setError(message)
    setTimeout(() => setError(null), 5000)
  }

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 2, 1))
  }

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month, 1))
  }

  const handleDateClick = async (day: DayData) => {
    if (!calendarData?.venueId) {
      showErrorMessage('Du maste skapa en lokal forst')
      return
    }

    // Cannot modify dates with bookings
    if (day.hasAcceptedBooking || day.hasPendingBooking) {
      showErrorMessage('Kan inte andra datum med bokningar')
      return
    }

    setIsUpdating(true)

    if (day.isBlocked) {
      // Unblock
      const result = await unblockDate(day.dateStr)
      if (result.success) {
        showSuccessMessage('Datum avblockerat')
        await fetchData()
      } else {
        showErrorMessage(result.error || 'Kunde inte avblockera datum')
      }
    } else {
      // Block
      const result = await blockDate(day.dateStr)
      if (result.success) {
        showSuccessMessage('Datum blockerat')
        await fetchData()
      } else {
        showErrorMessage(result.error || 'Kunde inte blockera datum')
      }
    }

    setIsUpdating(false)
  }

  const handleBlockRange = async () => {
    if (!rangeStartDate || !rangeEndDate) {
      showErrorMessage('Valj bade start- och slutdatum')
      return
    }

    if (new Date(rangeStartDate) > new Date(rangeEndDate)) {
      showErrorMessage('Startdatum maste vara fore slutdatum')
      return
    }

    setIsUpdating(true)
    const result = await blockDateRange(rangeStartDate, rangeEndDate, blockReason || undefined)

    if (result.success) {
      let message = `${result.blockedCount || 0} dagar blockerade`
      if (result.failedDates && result.failedDates.length > 0) {
        message += `. ${result.failedDates.length} dagar kunde inte blockeras (har bokningar)`
      }
      showSuccessMessage(message)
      await fetchData()
      setShowBlockModal(false)
      setRangeStartDate('')
      setRangeEndDate('')
      setBlockReason('')
    } else {
      showErrorMessage(result.error || 'Kunde inte blockera datum')
    }

    setIsUpdating(false)
  }

  // Generate calendar days
  const generateCalendarDays = (): DayData[] => {
    const days: DayData[] = []

    // First day of the month
    const firstDay = new Date(year, month - 1, 1)
    // Get day of week (0 = Sunday, we want Monday = 0)
    let startDayOfWeek = firstDay.getDay() - 1
    if (startDayOfWeek < 0) startDayOfWeek = 6

    // Last day of the month
    const lastDay = new Date(year, month, 0)
    const daysInMonth = lastDay.getDate()

    // Create blocked dates set for quick lookup
    const blockedDatesMap = new Map<string, string | null>()
    calendarData?.blockedDates.forEach(bd => {
      blockedDatesMap.set(bd.blocked_date, bd.reason)
    })

    // Create bookings map
    const bookingsMap = new Map<string, { status: string; customerName: string; eventType: string | null }>()
    calendarData?.bookings.forEach(b => {
      bookingsMap.set(b.event_date, {
        status: b.status,
        customerName: b.customer_name,
        eventType: b.event_type,
      })
    })

    // Add days from previous month to fill the first week
    const prevMonthLastDay = new Date(year, month - 1, 0)
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const day = prevMonthLastDay.getDate() - i
      const date = new Date(year, month - 2, day)
      const dateStr = date.toISOString().split('T')[0]
      const booking = bookingsMap.get(dateStr)

      days.push({
        date,
        dateStr,
        isCurrentMonth: false,
        isBlocked: blockedDatesMap.has(dateStr),
        blockReason: blockedDatesMap.get(dateStr),
        hasAcceptedBooking: booking?.status === 'accepted',
        hasPendingBooking: booking?.status === 'pending',
        bookingInfo: booking ? { customerName: booking.customerName, eventType: booking.eventType } : undefined,
      })
    }

    // Add days of current month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day)
      const dateStr = date.toISOString().split('T')[0]
      const booking = bookingsMap.get(dateStr)

      days.push({
        date,
        dateStr,
        isCurrentMonth: true,
        isBlocked: blockedDatesMap.has(dateStr),
        blockReason: blockedDatesMap.get(dateStr),
        hasAcceptedBooking: booking?.status === 'accepted',
        hasPendingBooking: booking?.status === 'pending',
        bookingInfo: booking ? { customerName: booking.customerName, eventType: booking.eventType } : undefined,
      })
    }

    // Add days from next month to complete the last week
    const remainingDays = 7 - (days.length % 7)
    if (remainingDays < 7) {
      for (let day = 1; day <= remainingDays; day++) {
        const date = new Date(year, month, day)
        const dateStr = date.toISOString().split('T')[0]
        const booking = bookingsMap.get(dateStr)

        days.push({
          date,
          dateStr,
          isCurrentMonth: false,
          isBlocked: blockedDatesMap.has(dateStr),
          blockReason: blockedDatesMap.get(dateStr),
          hasAcceptedBooking: booking?.status === 'accepted',
          hasPendingBooking: booking?.status === 'pending',
          bookingInfo: booking ? { customerName: booking.customerName, eventType: booking.eventType } : undefined,
        })
      }
    }

    return days
  }

  const getDayClasses = (day: DayData) => {
    const baseClasses = 'relative h-24 border border-[#e5e7eb] p-1 transition-colors'

    if (!day.isCurrentMonth) {
      return `${baseClasses} bg-[#f9fafb] text-[#9ca3af]`
    }

    if (day.hasAcceptedBooking) {
      return `${baseClasses} bg-blue-100 border-blue-300`
    }

    if (day.hasPendingBooking) {
      return `${baseClasses} bg-yellow-100 border-yellow-300`
    }

    if (day.isBlocked) {
      return `${baseClasses} bg-red-100 border-red-300`
    }

    return `${baseClasses} bg-white hover:bg-[#f3f4f6] cursor-pointer`
  }

  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-[#111827]">Kalender</h1>
          <p className="text-[#6b7280] mt-1">
            Hantera tillganglighet och se bokningar
          </p>
        </div>
        <Button onClick={() => setShowBlockModal(true)}>
          Blockera flera dagar
        </Button>
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}
      {successMessage && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
          {successMessage}
        </div>
      )}

      {/* No venue warning */}
      {!isLoading && !calendarData?.venueId && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-yellow-800">
            Du har ingen lokal annu. <a href="/dashboard/venue/new" className="underline font-medium">Skapa en lokal</a> for att kunna hantera kalendern.
          </p>
        </div>
      )}

      {/* Legend */}
      <div className="bg-white border border-[#e5e7eb] rounded-xl p-4 mb-6">
        <div className="flex flex-wrap gap-6">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-white border border-[#e5e7eb]"></div>
            <span className="text-sm text-[#374151]">Tillganglig</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-red-100 border border-red-300"></div>
            <span className="text-sm text-[#374151]">Blockerad</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-blue-100 border border-blue-300"></div>
            <span className="text-sm text-[#374151]">Accepterad bokning</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-yellow-100 border border-yellow-300"></div>
            <span className="text-sm text-[#374151]">Ventande bokning</span>
          </div>
        </div>
      </div>

      {/* Calendar */}
      <div className="bg-white border border-[#e5e7eb] rounded-xl overflow-hidden">
        {/* Month navigation */}
        <div className="flex items-center justify-between p-4 border-b border-[#e5e7eb]">
          <button
            onClick={handlePrevMonth}
            className="p-2 hover:bg-[#f3f4f6] rounded-lg transition-colors"
            aria-label="Foregaende manad"
          >
            <svg className="w-5 h-5 text-[#374151]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h2 className="text-lg font-semibold text-[#111827]">
            {SWEDISH_MONTHS[month - 1]} {year}
          </h2>
          <button
            onClick={handleNextMonth}
            className="p-2 hover:bg-[#f3f4f6] rounded-lg transition-colors"
            aria-label="Nasta manad"
          >
            <svg className="w-5 h-5 text-[#374151]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Day names header */}
        <div className="grid grid-cols-7 border-b border-[#e5e7eb]">
          {SWEDISH_DAYS.map(day => (
            <div
              key={day}
              className="p-2 text-center text-sm font-medium text-[#6b7280] bg-[#f9fafb]"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[#1e3a8a] border-t-transparent"></div>
            <p className="text-[#6b7280] mt-2">Laddar kalender...</p>
          </div>
        ) : (
          <div className="grid grid-cols-7">
            {generateCalendarDays().map((day, index) => (
              <div
                key={index}
                className={getDayClasses(day)}
                onClick={() => day.isCurrentMonth && !day.hasAcceptedBooking && !day.hasPendingBooking && handleDateClick(day)}
                title={
                  day.isBlocked && day.blockReason
                    ? `Blockerad: ${day.blockReason}`
                    : day.bookingInfo
                    ? `${day.bookingInfo.customerName}${day.bookingInfo.eventType ? ` - ${day.bookingInfo.eventType}` : ''}`
                    : undefined
                }
              >
                <span
                  className={`inline-flex items-center justify-center w-7 h-7 text-sm ${
                    day.dateStr === today
                      ? 'bg-[#1e3a8a] text-white rounded-full'
                      : ''
                  }`}
                >
                  {day.date.getDate()}
                </span>

                {/* Status indicator */}
                {day.isCurrentMonth && (
                  <div className="mt-1">
                    {day.hasAcceptedBooking && (
                      <span className="text-xs text-blue-700 truncate block">
                        {day.bookingInfo?.customerName}
                      </span>
                    )}
                    {day.hasPendingBooking && (
                      <span className="text-xs text-yellow-700 truncate block">
                        Forfragan
                      </span>
                    )}
                    {day.isBlocked && !day.hasAcceptedBooking && !day.hasPendingBooking && (
                      <span className="text-xs text-red-700">Blockerad</span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="mt-6 p-4 bg-[#f9fafb] rounded-lg">
        <p className="text-sm text-[#6b7280]">
          <strong>Tips:</strong> Klicka pa ett datum for att blockera eller avblockera det.
          Datum med bokningar kan inte andras har. Anvand &ldquo;Blockera flera dagar&rdquo; for att blockera ett datumintervall.
        </p>
      </div>

      {/* Block range modal */}
      {showBlockModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-[#111827]">Blockera flera dagar</h3>
              <button
                onClick={() => setShowBlockModal(false)}
                className="p-1 hover:bg-[#f3f4f6] rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-[#6b7280]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#374151] mb-1">
                  Startdatum
                </label>
                <input
                  type="date"
                  value={rangeStartDate}
                  onChange={(e) => setRangeStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-[#e5e7eb] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#374151] mb-1">
                  Slutdatum
                </label>
                <input
                  type="date"
                  value={rangeEndDate}
                  onChange={(e) => setRangeEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-[#e5e7eb] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#374151] mb-1">
                  Anledning (valfritt)
                </label>
                <input
                  type="text"
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  placeholder="T.ex. Semester, Renovering..."
                  className="w-full px-3 py-2 border border-[#e5e7eb] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => setShowBlockModal(false)}
                className="flex-1"
              >
                Avbryt
              </Button>
              <Button
                onClick={handleBlockRange}
                disabled={isUpdating || !rangeStartDate || !rangeEndDate}
                className="flex-1"
              >
                {isUpdating ? 'Blockerar...' : 'Blockera'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Loading overlay */}
      {isUpdating && (
        <div className="fixed inset-0 bg-white/50 flex items-center justify-center z-40">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[#1e3a8a] border-t-transparent"></div>
        </div>
      )}
    </div>
  )
}
