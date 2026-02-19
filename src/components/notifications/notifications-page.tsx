'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getNotifications } from '@/actions/notifications/get-notifications'
import {
  markNotificationsRead,
  markAllNotificationsRead,
} from '@/actions/notifications/mark-notifications-read'
import type { Notification, NotificationType } from '@/types/database'
import { getNotificationStyle, getNotificationUrl, formatTimestamp } from './notification-utils'

type FilterCategory = 'alla' | 'bokningar' | 'meddelanden' | 'betalningar' | 'matchningar'

const FILTER_OPTIONS: { key: FilterCategory; label: string }[] = [
  { key: 'alla', label: 'Alla' },
  { key: 'bokningar', label: 'Bokningar' },
  { key: 'meddelanden', label: 'Meddelanden' },
  { key: 'betalningar', label: 'Betalningar' },
  { key: 'matchningar', label: 'Matchningar' },
]

const CATEGORY_TYPES: Record<Exclude<FilterCategory, 'alla'>, NotificationType[]> = {
  bokningar: ['booking_request', 'booking_accepted', 'booking_declined', 'booking_cancelled'],
  meddelanden: ['new_message'],
  betalningar: ['payment_completed', 'payout_sent'],
  matchningar: ['new_match'],
}

export function NotificationsPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [activeFilter, setActiveFilter] = useState<FilterCategory>('alla')
  const [isMarkingAllRead, setIsMarkingAllRead] = useState(false)

  // Fetch all notifications on mount
  useEffect(() => {
    let isMounted = true

    const loadNotifications = async () => {
      const result = await getNotifications(100)
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

  // Filter notifications by category
  const filteredNotifications =
    activeFilter === 'alla'
      ? notifications
      : notifications.filter((n) => CATEGORY_TYPES[activeFilter].includes(n.type))

  const handleNotificationClick = useCallback(
    async (notification: Notification) => {
      // Mark as read if not already
      if (!notification.is_read) {
        await markNotificationsRead([notification.id])
        setNotifications((prev) =>
          prev.map((n) => (n.id === notification.id ? { ...n, is_read: true } : n))
        )
        setUnreadCount((prev) => Math.max(0, prev - 1))
      }

      // Navigate to the relevant page
      const url = getNotificationUrl(notification.entity_type, notification.entity_id)
      router.push(url)
    },
    [router]
  )

  const handleMarkAllRead = useCallback(async () => {
    setIsMarkingAllRead(true)
    const result = await markAllNotificationsRead()
    if (result.success) {
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
      setUnreadCount(0)
    }
    setIsMarkingAllRead(false)
  }, [])

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#1a1a1a]">Notifieringar</h1>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            disabled={isMarkingAllRead}
            className="text-sm text-[#c45a3b] hover:text-[#a84832] font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isMarkingAllRead ? 'Markerar...' : 'Markera alla som lästa'}
          </button>
        )}
      </div>

      {/* Filter bar */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {FILTER_OPTIONS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveFilter(key)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              activeFilter === key
                ? 'bg-[#c45a3b] text-white'
                : 'bg-[#f5f5f4] text-[#57534e] hover:bg-[#e7e5e4]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Notification list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[#c45a3b] border-t-transparent" />
        </div>
      ) : filteredNotifications.length === 0 ? (
        <div className="py-16 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-[#f5f5f4] rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8 text-[#a8a29e]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
          </div>
          <p className="text-[#78716c] text-base">Inga notifieringar</p>
        </div>
      ) : (
        <div className="rounded-xl border border-[#e7e5e4] overflow-hidden bg-white divide-y divide-[#e7e5e4]">
          {filteredNotifications.map((notification) => {
            const style = getNotificationStyle(notification.type)
            return (
              <button
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={`w-full px-4 py-4 flex gap-3 text-left hover:bg-[#f9fafb] transition-colors ${
                  !notification.is_read ? 'bg-blue-50/50' : ''
                }`}
              >
                {/* Icon */}
                <div
                  className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${style.bgColor} ${style.textColor}`}
                >
                  {style.icon}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm ${
                      !notification.is_read ? 'font-semibold' : 'font-medium'
                    } text-[#1a1a1a] truncate`}
                  >
                    {notification.title}
                  </p>
                  <p className="text-sm text-[#78716c] line-clamp-2">{notification.message}</p>
                  <p className="text-xs text-[#a8a29e] mt-1">
                    {formatTimestamp(notification.created_at)}
                  </p>
                </div>

                {/* Unread indicator */}
                {!notification.is_read && (
                  <div className="flex-shrink-0 w-2 h-2 rounded-full bg-[#c45a3b] self-center" />
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
