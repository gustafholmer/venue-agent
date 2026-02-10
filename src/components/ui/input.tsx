import { forwardRef, type InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={`w-full h-10 px-3 rounded-lg border border-[#e5e5e5] bg-white text-[#1a1a1a] placeholder:text-[#a8a29e] focus:outline-none focus:border-[#1a4d3e] focus:ring-1 focus:ring-[#1a4d3e] ${className}`}
        {...props}
      />
    )
  }
)

Input.displayName = 'Input'
