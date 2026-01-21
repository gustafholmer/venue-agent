'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'

interface FilterSectionProps {
  areas: string[]
  className?: string
}

export function FilterSection({ areas, className = '' }: FilterSectionProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const currentArea = searchParams.get('area') || ''
  const currentCapacity = searchParams.get('capacity') || ''
  const currentPriceMax = searchParams.get('priceMax') || ''

  const handleFilterChange = useCallback(() => {
    const form = document.getElementById('filter-form') as HTMLFormElement
    if (!form) return

    const formData = new FormData(form)
    const params = new URLSearchParams()

    const area = formData.get('area') as string
    const capacity = formData.get('capacity') as string
    const priceMax = formData.get('priceMax') as string

    if (area) params.set('area', area)
    if (capacity) params.set('capacity', capacity)
    if (priceMax) params.set('priceMax', priceMax)

    router.push(`/venues${params.toString() ? `?${params.toString()}` : ''}`)
  }, [router])

  return (
    <div className={className}>
      <p className="text-xs uppercase tracking-widest text-[#78716c] mb-3">Filter</p>
      <form id="filter-form" className="space-y-3">
        <select
          name="area"
          defaultValue={currentArea}
          onChange={handleFilterChange}
          className="w-full h-10 px-3 border border-[#e7e5e4] bg-white text-sm focus:outline-none focus:border-[#1a1a1a] rounded"
        >
          <option value="">Alla områden</option>
          {areas.map((area) => (
            <option key={area} value={area}>
              {area}
            </option>
          ))}
        </select>

        <select
          name="capacity"
          defaultValue={currentCapacity}
          onChange={handleFilterChange}
          className="w-full h-10 px-3 border border-[#e7e5e4] bg-white text-sm focus:outline-none focus:border-[#1a1a1a] rounded"
        >
          <option value="">Alla storlekar</option>
          <option value="10">10+ gäster</option>
          <option value="25">25+ gäster</option>
          <option value="50">50+ gäster</option>
          <option value="100">100+ gäster</option>
          <option value="200">200+ gäster</option>
        </select>

        <select
          name="priceMax"
          defaultValue={currentPriceMax}
          onChange={handleFilterChange}
          className="w-full h-10 px-3 border border-[#e7e5e4] bg-white text-sm focus:outline-none focus:border-[#1a1a1a] rounded"
        >
          <option value="">Alla priser</option>
          <option value="5000">Max 5 000 kr</option>
          <option value="10000">Max 10 000 kr</option>
          <option value="20000">Max 20 000 kr</option>
          <option value="50000">Max 50 000 kr</option>
        </select>
      </form>
    </div>
  )
}
