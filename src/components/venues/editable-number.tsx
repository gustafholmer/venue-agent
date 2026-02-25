'use client'

import { useState } from 'react'

interface EditableNumberProps {
  value: string
  onChange: (value: string) => void
  placeholder: string
  suffix?: string
  className?: string
}

export function EditableNumber({
  value,
  onChange,
  placeholder,
  suffix = '',
  className = '',
}: EditableNumberProps) {
  const [isEditing, setIsEditing] = useState(false)

  const wrapperClass =
    'group/editable rounded-lg transition-colors hover:outline hover:outline-dashed hover:outline-1 hover:outline-[#a8a29e] hover:bg-[#faf9f7]'

  if (isEditing) {
    return (
      <div className={wrapperClass}>
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => setIsEditing(false)}
          autoFocus
          placeholder={placeholder}
          min="0"
          className={`w-full bg-transparent border-none outline-none placeholder:text-[#a8a29e] cursor-text [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${className}`}
        />
      </div>
    )
  }

  return (
    <div className={wrapperClass} onClick={() => setIsEditing(true)}>
      {value ? (
        <span className={`cursor-pointer ${className}`}>
          {Number(value).toLocaleString('sv-SE')}{suffix}
        </span>
      ) : (
        <span className={`cursor-pointer text-[#a8a29e] ${className}`}>
          {placeholder}
        </span>
      )}
    </div>
  )
}
