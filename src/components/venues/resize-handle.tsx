'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

interface ResizeHandleProps {
  onResize: (delta: number) => void
}

export function ResizeHandle({ onResize }: ResizeHandleProps) {
  const [isDragging, setIsDragging] = useState(false)
  const lastX = useRef(0)

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    lastX.current = e.clientX
    setIsDragging(true)
  }, [])

  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - lastX.current
      lastX.current = e.clientX
      onResize(delta)
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isDragging, onResize])

  return (
    <div
      onMouseDown={handleMouseDown}
      className={`hidden lg:flex w-1.5 flex-shrink-0 cursor-col-resize items-center justify-center border-l border-[#e7e5e4] transition-colors ${
        isDragging ? 'bg-[#e7e5e4]' : 'hover:bg-[#f5f3f0]'
      }`}
    >
      <div className={`w-0.5 h-8 rounded-full ${isDragging ? 'bg-[#a8a29e]' : 'bg-[#d6d3d1]'}`} />
    </div>
  )
}
