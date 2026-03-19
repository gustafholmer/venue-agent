'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useState, useEffect, useRef, type ChangeEvent } from 'react'

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

  const [capacityValue, setCapacityValue] = useState(currentCapacity ? parseInt(currentCapacity, 10) : 0)
  const [priceMaxValue, setPriceMaxValue] = useState(currentPriceMax ? parseInt(currentPriceMax, 10) : 0)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Sync local state when URL params change externally
  useEffect(() => {
    setCapacityValue(currentCapacity ? parseInt(currentCapacity, 10) : 0)
  }, [currentCapacity])
  useEffect(() => {
    setPriceMaxValue(currentPriceMax ? parseInt(currentPriceMax, 10) : 0)
  }, [currentPriceMax])

  const updateFilter = useCallback((name: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())

    if (value && value !== '0') {
      params.set(name, value)
    } else {
      params.delete(name)
    }

    router.push(`/venues${params.toString() ? `?${params.toString()}` : ''}`)
  }, [router, searchParams])

  const debouncedUpdateFilter = useCallback((name: string, value: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      updateFilter(name, value)
    }, 300)
  }, [updateFilter])

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  const handleAreaChange = useCallback((e: ChangeEvent<HTMLSelectElement>) => {
    updateFilter('area', e.target.value)
  }, [updateFilter])

  return (
    <div className={className}>
      <p className="text-xs uppercase tracking-widest text-[#78716c] mb-3">Filter</p>
      <div className="space-y-4">
        <select
          name="area"
          value={currentArea}
          onChange={handleAreaChange}
          className="w-full h-10 px-3 border border-[#e7e5e4] bg-white text-sm focus:outline-none focus:border-[#1a1a1a] rounded"
        >
          <option value="">Alla områden</option>
          {areas.map((area) => (
            <option key={area} value={area}>
              {area}
            </option>
          ))}
        </select>

        <div>
          <div className="flex justify-between text-sm mb-1.5">
            <span className="text-[#78716c]">Antal gaster</span>
            <span className="text-[#1a1a1a] font-medium">
              {capacityValue > 0 ? `${capacityValue}+` : 'Alla'}
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={500}
            step={10}
            value={capacityValue}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10)
              setCapacityValue(v)
              debouncedUpdateFilter('capacity', e.target.value)
            }}
            className="w-full accent-[#c45a3b]"
          />
          <div className="flex justify-between text-xs text-[#a8a29e] mt-0.5">
            <span>0</span>
            <span>500</span>
          </div>
        </div>

        <div>
          <div className="flex justify-between text-sm mb-1.5">
            <span className="text-[#78716c]">Max pris</span>
            <span className="text-[#1a1a1a] font-medium">
              {priceMaxValue > 0 ? `${priceMaxValue.toLocaleString('sv-SE')} kr` : 'Alla'}
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={100000}
            step={5000}
            value={priceMaxValue}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10)
              setPriceMaxValue(v)
              debouncedUpdateFilter('priceMax', e.target.value)
            }}
            className="w-full accent-[#c45a3b]"
          />
          <div className="flex justify-between text-xs text-[#a8a29e] mt-0.5">
            <span>0</span>
            <span>100 000</span>
          </div>
        </div>
      </div>
    </div>
  )
}
