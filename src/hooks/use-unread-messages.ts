'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

interface UseUnreadMessagesOptions {
  userId: string | null
  /** Refetch interval in ms (default: 30000) */
  refetchInterval?: number
}

interface UseUnreadMessagesReturn {
  unreadCount: number
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useUnreadMessages({
  userId,
  refetchInterval = 30000,
}: UseUnreadMessagesOptions): UseUnreadMessagesReturn {
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const channelRef = useRef<RealtimeChannel | null>(null)
  const supabaseRef = useRef(createClient())

  const fetchUnreadCount = useCallback(async () => {
    if (!userId) {
      setUnreadCount(0)
      setIsLoading(false)
      return
    }

    try {
      const supabase = supabaseRef.current

      // Get all bookings where user is customer or venue owner
      const { data: asCustomer } = await supabase
        .from('booking_requests')
        .select('id')
        .eq('customer_id', userId)

      const { data: asOwner } = await supabase
        .from('venues')
        .select('booking_requests(id)')
        .eq('owner_id', userId)

      // Collect all booking IDs
      const bookingIds = new Set<string>()
      asCustomer?.forEach(b => bookingIds.add(b.id))
      asOwner?.forEach(v => {
        const requests = v.booking_requests as { id: string }[] | null
        requests?.forEach(b => bookingIds.add(b.id))
      })

      if (bookingIds.size === 0) {
        setUnreadCount(0)
        setIsLoading(false)
        return
      }

      // Count unread messages (not sent by current user)
      const { count, error: countError } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .in('booking_request_id', Array.from(bookingIds))
        .eq('is_read', false)
        .neq('sender_id', userId)

      if (countError) {
        console.error('Error fetching unread count:', countError)
        setError('Kunde inte hämta olästa meddelanden')
        return
      }

      setUnreadCount(count || 0)
      setError(null)
    } catch (err) {
      console.error('Error in fetchUnreadCount:', err)
      setError('Ett oväntat fel uppstod')
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  // Initial fetch
  useEffect(() => {
    fetchUnreadCount()
  }, [fetchUnreadCount])

  // Set up realtime subscription for message changes
  useEffect(() => {
    if (!userId) return

    const supabase = supabaseRef.current

    const channel = supabase
      .channel('unread-messages')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
        },
        () => {
          // Refetch on any message change
          fetchUnreadCount()
        }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      channel.unsubscribe()
      channelRef.current = null
    }
  }, [userId, fetchUnreadCount])

  // Periodic refetch
  useEffect(() => {
    if (!userId || refetchInterval <= 0) return

    const interval = setInterval(fetchUnreadCount, refetchInterval)
    return () => clearInterval(interval)
  }, [userId, refetchInterval, fetchUnreadCount])

  return {
    unreadCount,
    isLoading,
    error,
    refetch: fetchUnreadCount,
  }
}

/**
 * Hook to get unread counts per booking
 */
interface UseBookingUnreadCountsOptions {
  userId: string | null
  bookingIds: string[]
}

interface UseBookingUnreadCountsReturn {
  getUnreadCount: (bookingId: string) => number
  isLoading: boolean
  refetch: () => Promise<void>
}

export function useBookingUnreadCounts({
  userId,
  bookingIds,
}: UseBookingUnreadCountsOptions): UseBookingUnreadCountsReturn {
  const [counts, setCounts] = useState<Map<string, number>>(new Map())
  const [isLoading, setIsLoading] = useState(true)

  const supabaseRef = useRef(createClient())

  const fetchCounts = useCallback(async () => {
    if (!userId || bookingIds.length === 0) {
      setCounts(new Map())
      setIsLoading(false)
      return
    }

    try {
      const supabase = supabaseRef.current

      // Fetch unread messages for all bookings
      const { data: messages, error } = await supabase
        .from('messages')
        .select('booking_request_id')
        .in('booking_request_id', bookingIds)
        .eq('is_read', false)
        .neq('sender_id', userId)

      if (error) {
        console.error('Error fetching booking unread counts:', error)
        return
      }

      // Count per booking
      const newCounts = new Map<string, number>()
      messages?.forEach(m => {
        const current = newCounts.get(m.booking_request_id) || 0
        newCounts.set(m.booking_request_id, current + 1)
      })

      setCounts(newCounts)
    } finally {
      setIsLoading(false)
    }
  }, [userId, bookingIds])

  useEffect(() => {
    fetchCounts()
  }, [fetchCounts])

  // Set up realtime subscription
  useEffect(() => {
    if (!userId || bookingIds.length === 0) return

    const supabase = supabaseRef.current

    const channel = supabase
      .channel('booking-unread-counts')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `booking_request_id=in.(${bookingIds.join(',')})`,
        },
        () => {
          fetchCounts()
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [userId, bookingIds, fetchCounts])

  const getUnreadCount = useCallback(
    (bookingId: string) => counts.get(bookingId) || 0,
    [counts]
  )

  return {
    getUnreadCount,
    isLoading,
    refetch: fetchCounts,
  }
}
