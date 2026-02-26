'use client'

import type { ReactNode } from 'react'
import type { NotificationType, EntityType } from '@/types/database'

/**
 * Get the icon and color for a notification type
 */
export function getNotificationStyle(type: NotificationType): {
  icon: ReactNode
  bgColor: string
  textColor: string
} {
  switch (type) {
    case 'booking_request':
      return {
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        ),
        bgColor: 'bg-blue-100',
        textColor: 'text-blue-600',
      }
    case 'booking_accepted':
      return {
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
        bgColor: 'bg-green-100',
        textColor: 'text-green-600',
      }
    case 'booking_declined':
    case 'booking_cancelled':
      return {
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
        bgColor: 'bg-red-100',
        textColor: 'text-red-600',
      }
    case 'new_message':
      return {
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        ),
        bgColor: 'bg-gray-100',
        textColor: 'text-gray-600',
      }
    case 'payment_completed':
    case 'payout_sent':
      return {
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
        bgColor: 'bg-green-100',
        textColor: 'text-green-600',
      }
    case 'new_match':
      return {
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
        ),
        bgColor: 'bg-yellow-100',
        textColor: 'text-yellow-600',
      }
    case 'new_inquiry':
      return {
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
        bgColor: 'bg-orange-100',
        textColor: 'text-orange-600',
      }
    default:
      return {
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        ),
        bgColor: 'bg-gray-100',
        textColor: 'text-gray-600',
      }
  }
}

/**
 * Get the navigation URL for a notification
 */
export function getNotificationUrl(entityType: EntityType, entityId: string): string {
  switch (entityType) {
    case 'booking':
      // Link to the customer-facing booking detail page which works for all users
      // (venue-owner dashboard bookings are now per-venue at /dashboard/venue/[id]/bookings)
      return `/account/bookings/${entityId}`
    case 'venue':
      return `/venues/${entityId}`
    case 'message':
      // Messages are linked to bookings, so entityId is booking_request_id
      return `/account/bookings/${entityId}`
    case 'inquiry':
      return `/dashboard/inquiries/${entityId}`
    case 'search':
      return `/venues`
    default:
      return '/'
  }
}

/**
 * Format timestamp in Swedish
 */
export function formatTimestamp(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMins < 1) {
    return 'Just nu'
  }

  if (diffMins < 60) {
    return `${diffMins} min sedan`
  }

  if (diffHours < 24) {
    return `${diffHours} tim sedan`
  }

  if (diffDays === 1) {
    return 'Igår'
  }

  if (diffDays < 7) {
    return `${diffDays} dagar sedan`
  }

  return date.toLocaleDateString('sv-SE', {
    day: 'numeric',
    month: 'short',
  })
}
