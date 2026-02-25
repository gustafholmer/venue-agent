'use client'

import { useState, useRef, useEffect } from 'react'

interface Option {
  readonly value: string
  readonly label: string
}

interface EditablePillPickerProps {
  selected: string[]
  options: readonly Option[]
  onChange: (selected: string[]) => void
  pillClassName: string
  showCheckIcon?: boolean
  emptyText: string
}

export function EditablePillPicker({
  selected,
  options,
  onChange,
  pillClassName,
  showCheckIcon = false,
  emptyText,
}: EditablePillPickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const popoverRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const toggleOption = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value))
    } else {
      onChange([...selected, value])
    }
  }

  const getLabel = (value: string) => {
    return options.find((o) => o.value === value)?.label || value
  }

  return (
    <div className="relative" ref={popoverRef}>
      <div className="group/editable rounded-lg transition-colors hover:outline hover:outline-dashed hover:outline-1 hover:outline-[#a8a29e] hover:bg-[#faf9f7] p-1 -m-1">
        <div className="flex flex-wrap gap-2 items-center">
          {selected.length === 0 ? (
            <span className="text-[#a8a29e] text-sm">{emptyText}</span>
          ) : (
            selected.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => toggleOption(value)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 cursor-pointer hover:opacity-70 transition-opacity ${pillClassName}`}
              >
                {showCheckIcon && (
                  <svg className="w-4 h-4 text-[#c45a3b]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {getLabel(value)}
              </button>
            ))
          )}
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="w-7 h-7 rounded-full border border-dashed border-[#a8a29e] flex items-center justify-center text-[#a8a29e] hover:border-[#78716c] hover:text-[#78716c] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-30 mt-2 w-64 bg-white border border-[#e7e5e4] rounded-xl shadow-lg p-3 space-y-1">
          {options.map((option) => (
            <label
              key={option.value}
              className="flex items-center gap-2 p-2 rounded-lg cursor-pointer hover:bg-[#faf9f7] transition-colors"
            >
              <input
                type="checkbox"
                checked={selected.includes(option.value)}
                onChange={() => toggleOption(option.value)}
                className="w-4 h-4 text-[#c45a3b] border-[#d1d5db] rounded focus:ring-[#c45a3b]"
              />
              <span className="text-sm text-[#57534e]">{option.label}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}
