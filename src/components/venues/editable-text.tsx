'use client'

import { useRef, useEffect } from 'react'

interface EditableTextProps {
  value: string
  onChange: (value: string) => void
  placeholder: string
  className?: string
  multiline?: boolean
}

export function EditableText({
  value,
  onChange,
  placeholder,
  className = '',
  multiline = false,
}: EditableTextProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (multiline && textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
    }
  }, [value, multiline])

  const wrapperClass =
    'group/editable rounded-lg transition-colors hover:outline hover:outline-dashed hover:outline-1 hover:outline-[#a8a29e] hover:bg-[#faf9f7]'

  if (multiline) {
    return (
      <div className={wrapperClass}>
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={1}
          className={`w-full bg-transparent border-none outline-none resize-none placeholder:text-[#a8a29e] cursor-text ${className}`}
        />
      </div>
    )
  }

  return (
    <div className={wrapperClass}>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full bg-transparent border-none outline-none placeholder:text-[#a8a29e] cursor-text ${className}`}
      />
    </div>
  )
}
