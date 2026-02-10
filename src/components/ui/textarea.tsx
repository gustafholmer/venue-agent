import { forwardRef, type TextareaHTMLAttributes } from 'react'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className = '', ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={`w-full px-4 py-3 rounded-lg border border-[#e5e5e5] bg-white text-[#1a1a1a] placeholder:text-[#a8a29e] resize-none focus:outline-none focus:border-[#1a4d3e] focus:ring-1 focus:ring-[#1a4d3e] ${className}`}
        {...props}
      />
    )
  }
)

Textarea.displayName = 'Textarea'
