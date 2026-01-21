import { Slot } from '@radix-ui/react-slot'
import { forwardRef, type ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline'
  size?: 'sm' | 'md' | 'lg'
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', asChild, variant = 'primary', size = 'md', ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'

    const base = 'inline-flex items-center justify-center gap-2 font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none'

    const variants = {
      primary: 'bg-[#1a1a1a] text-white hover:bg-[#333] focus-visible:ring-[#1a1a1a]',
      secondary: 'bg-[#f5f3f0] text-[#1a1a1a] hover:bg-[#eeebe7] focus-visible:ring-[#1a1a1a]',
      ghost: 'text-[#1a1a1a] hover:bg-[#f5f3f0] focus-visible:ring-[#1a1a1a]',
      outline: 'border border-[#1a1a1a] text-[#1a1a1a] hover:bg-[#1a1a1a] hover:text-white focus-visible:ring-[#1a1a1a]',
    }

    const sizes = {
      sm: 'h-9 px-4 text-sm',
      md: 'h-10 px-5 text-sm',
      lg: 'h-12 px-6 text-base',
    }

    return (
      <Comp
        ref={ref}
        className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      />
    )
  }
)

Button.displayName = 'Button'
