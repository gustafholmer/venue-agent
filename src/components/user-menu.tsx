'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { signOut } from '@/actions/auth/sign-out'

export function UserMenu({ isVenueOwner }: { isVenueOwner: boolean }) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 text-sm font-medium px-4 py-1.5 rounded-full bg-[#c45a3b] text-white hover:bg-[#a84832] transition-colors shadow-sm"
      >
        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
        </svg>
        <span>Konto</span>
        <svg className={`w-3 h-3 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-[#e7e5e4] py-1 z-50">
          <Link
            href="/account"
            onClick={() => setOpen(false)}
            className="block px-4 py-2 text-sm text-[#57534e] hover:bg-[#f5f5f4] hover:text-[#1a1a1a]"
          >
            Mitt konto
          </Link>
          <Link
            href="/account/bookings"
            onClick={() => setOpen(false)}
            className="block px-4 py-2 text-sm text-[#57534e] hover:bg-[#f5f5f4] hover:text-[#1a1a1a]"
          >
            Mina bokningar
          </Link>
          <Link
            href="/account/saved"
            onClick={() => setOpen(false)}
            className="block px-4 py-2 text-sm text-[#57534e] hover:bg-[#f5f5f4] hover:text-[#1a1a1a]"
          >
            Sparade lokaler
          </Link>
          <Link
            href="/account/settings"
            onClick={() => setOpen(false)}
            className="block px-4 py-2 text-sm text-[#57534e] hover:bg-[#f5f5f4] hover:text-[#1a1a1a]"
          >
            Inställningar
          </Link>
          {isVenueOwner && (
            <Link
              href="/dashboard"
              onClick={() => setOpen(false)}
              className="block px-4 py-2 text-sm text-[#57534e] hover:bg-[#f5f5f4] hover:text-[#1a1a1a]"
            >
              Hantera lokaler
            </Link>
          )}
          <div className="border-t border-[#e7e5e4] my-1" />
          <form action={signOut}>
            <button
              type="submit"
              className="block w-full text-left px-4 py-2 text-sm text-[#57534e] hover:bg-[#f5f5f4] hover:text-[#c45a3b]"
            >
              Logga ut
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
