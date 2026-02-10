'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { getNotifications } from '@/actions/notifications/get-notifications'
import {
  markNotificationsRead,
  markAllNotificationsRead,
} from '@/actions/notifications/mark-notifications-read'
import type { Notification, NotificationType, EntityType } from '@/types/database'

/**
 * Get the icon and color for a notification type
 */
function getNotificationStyle(type: NotificationType): {
  icon: React.ReactNode
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
function getNotificationUrl(entityType: EntityType, entityId: string): string {
  switch (entityType) {
    case 'booking':
      // For venue owners, go to dashboard booking detail
      // For customers, go to public booking page
      // We'll check user type in the component but default to dashboard
      return `/dashboard/bookings/${entityId}`
    case 'venue':
      return `/venues/${entityId}`
    case 'message':
      // Messages are linked to bookings, so entityId is booking_request_id
      return `/dashboard/bookings/${entityId}`
    case 'search':
      return `/search?id=${entityId}`
    default:
      return '/'
  }
}

/**
 * Format timestamp in Swedish
 */
function formatTimestamp(dateStr: string): string {
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

export function NotificationBell() {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isMarkingAllRead, setIsMarkingAllRead] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Fetch notifications on mount
  useEffect(() => {
    let isMounted = true

    const loadNotifications = async () => {
      const result = await getNotifications(20)
      if (isMounted && result.success) {
        setNotifications(result.notifications || [])
        setUnreadCount(result.unreadCount ?? 0)
      }
      if (isMounted) {
        setIsLoading(false)
      }
    }

    loadNotifications()

    return () => {
      isMounted = false
    }
  }, [])

  // Refetch when dropdown opens
  useEffect(() => {
    if (isOpen) {
      // Don't set loading state for refetch
      getNotifications(20).then(result => {
        if (result.success) {
          setNotifications(result.notifications || [])
          setUnreadCount(result.unreadCount ?? 0)
        }
      })
    }
  }, [isOpen])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read if not already
    if (!notification.is_read) {
      await markNotificationsRead([notification.id])
      // Update local state
      setNotifications(prev =>
        prev.map(n =>
          n.id === notification.id ? { ...n, is_read: true } : n
        )
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    }

    // Navigate to the relevant page
    const url = getNotificationUrl(notification.entity_type, notification.entity_id)
    setIsOpen(false)
    router.push(url)
  }

  const handleMarkAllRead = async () => {
    setIsMarkingAllRead(true)
    const result = await markAllNotificationsRead()
    if (result.success) {
      setNotifications(prev =>
        prev.map(n => ({ ...n, is_read: true }))
      )
      setUnreadCount(0)
    }
    setIsMarkingAllRead(false)
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-[#374151] hover:text-[#111827] hover:bg-[#f3f4f6] rounded-full transition-colors"
        aria-label={`Notifieringar${unreadCount > 0 ? ` (${unreadCount} olasta)` : ''}`}
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>

        {/* Unread badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-xs font-semibold text-white bg-red-500 rounded-full">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-lg border border-[#e5e7eb] overflow-hidden z-50">
          {/* Header */}
          <div className="px-4 py-3 border-b border-[#e5e7eb] flex items-center justify-between">
            <h3 className="font-semibold text-[#111827]">Notifieringar</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                disabled={isMarkingAllRead}
                className="text-sm text-[#1e3a8a] hover:text-[#1e40af] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isMarkingAllRead ? 'Markerar...' : 'Markera alla som lästa'}
              </button>
            )}
          </div>

          {/* Notifications list */}
          <div className="max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-4 border-[#1e3a8a] border-t-transparent"></div>
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-8 text-center">
                <div className="w-12 h-12 mx-auto mb-3 bg-[#f3f4f6] rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-[#9ca3af]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                    />
                  </svg>
                </div>
                <p className="text-[#6b7280]">Inga notifieringar</p>
              </div>
            ) : (
              <div>
                {notifications.map((notification) => {
                  const style = getNotificationStyle(notification.type)
                  return (
                    <button
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={`w-full px-4 py-3 flex gap-3 text-left hover:bg-[#f9fafb] transition-colors ${
                        !notification.is_read ? 'bg-blue-50/50' : ''
                      }`}
                    >
                      {/* Icon */}
                      <div
                        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${style.bgColor} ${style.textColor}`}
                      >
                        {style.icon}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${!notification.is_read ? 'font-semibold' : 'font-medium'} text-[#111827] truncate`}>
                          {notification.title}
                        </p>
                        <p className="text-sm text-[#6b7280] line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-[#9ca3af] mt-1">
                          {formatTimestamp(notification.created_at)}
                        </p>
                      </div>

                      {/* Unread indicator */}
                      {!notification.is_read && (
                        <div className="flex-shrink-0 w-2 h-2 rounded-full bg-[#1e3a8a] self-center" />
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Footer - only show if there are notifications */}
          {notifications.length > 0 && (
            <div className="px-4 py-3 border-t border-[#e5e7eb]">
              <button
                onClick={() => {
                  setIsOpen(false)
                  router.push('/dashboard/notifications')
                }}
                className="w-full text-center text-sm text-[#1e3a8a] hover:text-[#1e40af] font-medium"
              >
                Visa alla
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
