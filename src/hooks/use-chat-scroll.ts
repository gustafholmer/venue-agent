'use client'

import { useRef, useCallback, useEffect } from 'react'

interface UseChatScrollOptions {
  /** Automatically scroll on new messages */
  autoScroll?: boolean
  /** Only auto-scroll if user is near bottom */
  scrollThreshold?: number
}

interface UseChatScrollReturn {
  containerRef: React.RefObject<HTMLDivElement | null>
  scrollToBottom: (behavior?: ScrollBehavior) => void
  isNearBottom: () => boolean
}

export function useChatScroll({
  autoScroll = true,
  scrollThreshold = 100,
}: UseChatScrollOptions = {}): UseChatScrollReturn {
  const containerRef = useRef<HTMLDivElement>(null)

  const isNearBottom = useCallback(() => {
    const container = containerRef.current
    if (!container) return true

    const { scrollTop, scrollHeight, clientHeight } = container
    return scrollHeight - scrollTop - clientHeight < scrollThreshold
  }, [scrollThreshold])

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    const container = containerRef.current
    if (!container) return

    container.scrollTo({
      top: container.scrollHeight,
      behavior,
    })
  }, [])

  // Auto-scroll on mount
  useEffect(() => {
    if (autoScroll) {
      // Use instant scroll on mount for better UX
      scrollToBottom('instant')
    }
  }, [autoScroll, scrollToBottom])

  return {
    containerRef,
    scrollToBottom,
    isNearBottom,
  }
}
