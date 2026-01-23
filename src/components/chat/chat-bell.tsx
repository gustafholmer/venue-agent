'use client'

import { useRouter } from 'next/navigation'
import { useUnreadMessages } from '@/hooks/use-unread-messages'
import { UnreadBadge } from './unread-badge'

interface ChatBellProps {
  userId: string | null
  /** URL to navigate to when clicked */
  href?: string
}

export function ChatBell({ userId, href = '/dashboard/bookings' }: ChatBellProps) {
  const router = useRouter()
  const { unreadCount, isLoading } = useUnreadMessages({ userId })

  const handleClick = () => {
    router.push(href)
  }

  return (
    <button
      onClick={handleClick}
      className="
        relative p-2 rounded-lg
        text-[var(--text-muted)] hover:text-[var(--text)]
        hover:bg-[var(--bg-soft)]
        transition-colors
        focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20
      "
      title={unreadCount > 0 ? `${unreadCount} olästa meddelanden` : 'Meddelanden'}
    >
      <svg
        className="w-5 h-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
        />
      </svg>

      {/* Badge */}
      {!isLoading && unreadCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5">
          <UnreadBadge count={unreadCount} size="sm" />
        </span>
      )}
    </button>
  )
}
