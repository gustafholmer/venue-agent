'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { getNotifications } from '@/actions/notifications/get-notifications'
import {
  markNotificationsRead,
  markAllNotificationsRead,
} from '@/actions/notifications/mark-notifications-read'
import type { Notification } from '@/types/database'
import { getNotificationStyle, getNotificationUrl, formatTimestamp } from './notification-utils'

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
        className="relative p-2 text-[#57534e] hover:text-[#1a1a1a] hover:bg-[#f3f4f6] rounded-full transition-colors"
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
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-lg border border-[#e7e5e4] overflow-hidden z-50">
          {/* Header */}
          <div className="px-4 py-3 border-b border-[#e7e5e4] flex items-center justify-between">
            <h3 className="font-semibold text-[#1a1a1a]">Notifieringar</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                disabled={isMarkingAllRead}
                className="text-sm text-[#c45a3b] hover:text-[#a84832] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isMarkingAllRead ? 'Markerar...' : 'Markera alla som lästa'}
              </button>
            )}
          </div>

          {/* Notifications list */}
          <div className="max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-4 border-[#c45a3b] border-t-transparent"></div>
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-8 text-center">
                <div className="w-12 h-12 mx-auto mb-3 bg-[#f3f4f6] rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-[#a8a29e]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                    />
                  </svg>
                </div>
                <p className="text-[#78716c]">Inga notifieringar</p>
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
                        <p className={`text-sm ${!notification.is_read ? 'font-semibold' : 'font-medium'} text-[#1a1a1a] truncate`}>
                          {notification.title}
                        </p>
                        <p className="text-sm text-[#78716c] line-clamp-2">
                          {notification.message}
                        </p>
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

          {/* Footer - only show if there are notifications */}
          {notifications.length > 0 && (
            <div className="px-4 py-3 border-t border-[#e7e5e4]">
              <button
                onClick={() => {
                  setIsOpen(false)
                  router.push('/dashboard/notifications')
                }}
                className="w-full text-center text-sm text-[#c45a3b] hover:text-[#a84832] font-medium"
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
