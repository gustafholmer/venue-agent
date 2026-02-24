'use client'

import { usePathname } from 'next/navigation'

export function WorkspaceModeBanner() {
  const pathname = usePathname()
  const isOnDashboard = pathname.startsWith('/dashboard')

  return (
    <div className="bg-[#faf9f7] border-b border-[#e7e5e4] px-4 sm:px-6">
      <div className="flex items-center h-8 gap-2">
        <span className={`inline-block w-2 h-2 rounded-full ${isOnDashboard ? 'bg-[#7b4a6b]' : 'bg-[#c45a3b]'}`} />
        <span className="text-xs font-medium text-[#78716c]">
          {isOnDashboard ? 'Hantera lokal' : 'Boka lokal'}
        </span>
      </div>
    </div>
  )
}
