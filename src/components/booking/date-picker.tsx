'use client'

import { useState, useEffect } from 'react'

interface DatePickerProps {
  value: string
  onChange: (date: string) => void
  blockedDates?: string[]
  bookedDates?: string[]
  minDate?: string
  className?: string
}

const WEEKDAYS = ['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön']
const MONTHS = [
  'Januari', 'Februari', 'Mars', 'April', 'Maj', 'Juni',
  'Juli', 'Augusti', 'September', 'Oktober', 'November', 'December'
]

export function DatePicker({
  value,
  onChange,
  blockedDates = [],
  bookedDates = [],
  minDate,
  className = '',
}: DatePickerProps) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [currentMonth, setCurrentMonth] = useState(
    value ? new Date(value).getMonth() : today.getMonth()
  )
  const [currentYear, setCurrentYear] = useState(
    value ? new Date(value).getFullYear() : today.getFullYear()
  )

  const blockedSet = new Set(blockedDates)
  const bookedSet = new Set(bookedDates)

  // Get the minimum selectable date
  const getMinDate = () => {
    if (minDate) {
      const min = new Date(minDate)
      min.setHours(0, 0, 0, 0)
      return min > today ? min : today
    }
    // Default: tomorrow
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    return tomorrow
  }

  const minimumDate = getMinDate()

  const isDateDisabled = (dateStr: string): boolean => {
    const date = new Date(dateStr)
    date.setHours(0, 0, 0, 0)

    // Check if before minimum date
    if (date < minimumDate) return true

    // Check if blocked or booked
    if (blockedSet.has(dateStr) || bookedSet.has(dateStr)) return true

    return false
  }

  const getDaysInMonth = (year: number, month: number): number => {
    return new Date(year, month + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (year: number, month: number): number => {
    // Returns 0 for Sunday, 1 for Monday, etc.
    const day = new Date(year, month, 1).getDay()
    // Convert to Monday-first (0 = Monday, 6 = Sunday)
    return day === 0 ? 6 : day - 1
  }

  const formatDateString = (year: number, month: number, day: number): string => {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  const goToPreviousMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear(currentYear - 1)
    } else {
      setCurrentMonth(currentMonth - 1)
    }
  }

  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0)
      setCurrentYear(currentYear + 1)
    } else {
      setCurrentMonth(currentMonth + 1)
    }
  }

  // Check if we can go to previous month (not before current month)
  const canGoPrevious = () => {
    if (currentYear > today.getFullYear()) return true
    if (currentYear === today.getFullYear() && currentMonth > today.getMonth()) return true
    return false
  }

  const daysInMonth = getDaysInMonth(currentYear, currentMonth)
  const firstDayOfMonth = getFirstDayOfMonth(currentYear, currentMonth)

  const days: (number | null)[] = []

  // Add empty slots for days before the first day
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(null)
  }

  // Add all days of the month
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i)
  }

  return (
    <div className={`bg-white border border-[#e5e7eb] rounded-xl p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={goToPreviousMonth}
          disabled={!canGoPrevious()}
          className="p-2 hover:bg-[#f3f4f6] rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          aria-label="Föregående månad"
        >
          <svg className="w-5 h-5 text-[#374151]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <h3 className="text-lg font-semibold text-[#111827]">
          {MONTHS[currentMonth]} {currentYear}
        </h3>

        <button
          type="button"
          onClick={goToNextMonth}
          className="p-2 hover:bg-[#f3f4f6] rounded-lg transition-colors"
          aria-label="Nästa månad"
        >
          <svg className="w-5 h-5 text-[#374151]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="h-8 flex items-center justify-center text-xs font-medium text-[#6b7280]"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, index) => {
          if (day === null) {
            return <div key={`empty-${index}`} className="h-10" />
          }

          const dateStr = formatDateString(currentYear, currentMonth, day)
          const isDisabled = isDateDisabled(dateStr)
          const isSelected = value === dateStr
          const isBlocked = blockedSet.has(dateStr)
          const isBooked = bookedSet.has(dateStr)

          return (
            <button
              key={dateStr}
              type="button"
              disabled={isDisabled}
              onClick={() => onChange(dateStr)}
              className={`
                relative h-10 rounded-lg text-sm font-medium transition-colors
                ${isSelected
                  ? 'bg-[#1e3a8a] text-white'
                  : isBlocked
                    ? 'bg-red-50 text-red-300 cursor-not-allowed line-through'
                    : isBooked
                      ? 'bg-amber-50 text-amber-400 cursor-not-allowed'
                      : isDisabled
                        ? 'text-[#d1d5db] cursor-not-allowed'
                        : 'text-[#374151] hover:bg-[#f3f4f6]'
                }
              `}
              title={
                isBlocked
                  ? 'Blockerat datum'
                  : isBooked
                    ? 'Redan bokad'
                    : undefined
              }
            >
              {day}
              {isBooked && !isSelected && (
                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-amber-400" />
              )}
              {isBlocked && !isSelected && (
                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-red-400" />
              )}
            </button>
          )
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 pt-4 border-t border-[#e5e7eb] flex flex-wrap gap-4 text-xs text-[#6b7280]">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-[#1e3a8a] rounded" />
          <span>Valt datum</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-50 border border-red-200 rounded relative">
            <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-red-400" />
          </div>
          <span>Blockerat</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-amber-50 border border-amber-200 rounded relative">
            <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-amber-400" />
          </div>
          <span>Bokad</span>
        </div>
      </div>
    </div>
  )
}
