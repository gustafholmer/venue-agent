import { formatPrice } from '@/lib/pricing'
import type { BookingModification, BookingRequest } from '@/types/database'

interface ModificationDiffProps {
  booking: BookingRequest
  modification: BookingModification
}

const EVENT_DATE_FORMAT: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
}

function formatDateSv(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('sv-SE', EVENT_DATE_FORMAT)
}

function formatTime(timeStr: string): string {
  return timeStr.slice(0, 5) // "HH:MM:SS" → "HH:MM"
}

export function ModificationDiff({ booking, modification }: ModificationDiffProps) {
  const changes: { label: string; from: string; to: string }[] = []

  if (modification.proposed_event_date) {
    changes.push({
      label: 'Datum',
      from: formatDateSv(booking.event_date),
      to: formatDateSv(modification.proposed_event_date),
    })
  }

  if (modification.proposed_start_time) {
    changes.push({
      label: 'Starttid',
      from: booking.start_time ? formatTime(booking.start_time) : '–',
      to: formatTime(modification.proposed_start_time),
    })
  }

  if (modification.proposed_end_time) {
    changes.push({
      label: 'Sluttid',
      from: booking.end_time ? formatTime(booking.end_time) : '–',
      to: formatTime(modification.proposed_end_time),
    })
  }

  if (modification.proposed_guest_count !== null) {
    changes.push({
      label: 'Antal gäster',
      from: booking.guest_count?.toString() || '–',
      to: modification.proposed_guest_count.toString(),
    })
  }

  if (modification.proposed_base_price !== null && modification.proposed_total_price !== null) {
    changes.push({
      label: 'Pris',
      from: `${formatPrice(booking.base_price)} (totalt: ${formatPrice(booking.total_price)})`,
      to: `${formatPrice(modification.proposed_base_price)} (totalt: ${formatPrice(modification.proposed_total_price)})`,
    })
  }

  if (changes.length === 0) return null

  return (
    <div className="space-y-2">
      {changes.map((change) => (
        <div key={change.label} className="flex flex-col sm:flex-row sm:items-center gap-1">
          <span className="text-sm font-medium text-gray-600 sm:w-32">{change.label}:</span>
          <span className="text-sm">
            <span className="text-gray-500 line-through">{change.from}</span>
            <span className="mx-2 text-gray-400">→</span>
            <span className="font-medium text-gray-900">{change.to}</span>
          </span>
        </div>
      ))}
      {modification.reason && (
        <div className="mt-3 text-sm text-gray-600 italic border-l-2 border-gray-300 pl-3">
          &ldquo;{modification.reason}&rdquo;
        </div>
      )}
    </div>
  )
}
