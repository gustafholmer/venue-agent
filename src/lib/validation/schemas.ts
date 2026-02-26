import { z } from 'zod'
import { ALLOWED_EVENT_TYPE_VALUES } from '@/lib/constants'

// --- Primitive schemas ---

export const uuidSchema = z.string().uuid('Ogiltigt ID')

export const emailSchema = z.string().email('Ogiltig e-postadress')

export const phoneSchema = z.string().min(1, 'Telefonnummer krävs')

export const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Ogiltigt datumformat')

export const futureDateSchema = dateSchema.refine(
  (val) => {
    const date = new Date(val)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return date > today
  },
  { message: 'Datum måste vara i framtiden' }
)

export const timeSchema = z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Ogiltigt tidsformat')

export const eventTypeSchema = z.string().refine(
  (val) => ALLOWED_EVENT_TYPE_VALUES.includes(val.toLowerCase()),
  { message: 'Ogiltig eventtyp' }
)

export const positiveInt = z.number().int().positive('Måste vara ett positivt heltal')

// --- Form schemas ---

export const venueFormSchema = z.object({
  name: z.string().min(1, 'Namn krävs'),
  description: z.string().nullable(),
  address: z.string().min(1, 'Adress krävs'),
  city: z.string().default('Stockholm'),
  area: z.string().nullable(),
  venue_types: z.array(z.string()),
  vibes: z.array(z.string()),
  capacity_standing: z.number().int().positive().nullable(),
  capacity_seated: z.number().int().positive().nullable(),
  capacity_conference: z.number().int().positive().nullable(),
  min_guests: z.number().int().positive().default(1),
  price_per_hour: z.number().int().positive().nullable(),
  price_half_day: z.number().int().positive().nullable(),
  price_full_day: z.number().int().positive().nullable(),
  price_evening: z.number().int().positive().nullable(),
  price_notes: z.string().nullable(),
  amenities: z.array(z.string()),
  contact_email: z.string().email().nullable().or(z.literal('')).transform(v => v || null),
  contact_phone: z.string().nullable(),
  website: z.string().nullable(),
})

export const inquiryInputSchema = z.object({
  venueId: uuidSchema,
  eventDate: futureDateSchema,
  eventType: eventTypeSchema,
  guestCount: z.number().int().min(1, 'Ange antal gäster'),
  message: z.string().min(1, 'Skriv ett meddelande').max(2000, 'Meddelandet får max vara 2000 tecken'),
})

export const connectAccountSchema = z.object({
  companyName: z.string().min(1, 'Företagsnamn krävs'),
  orgNumber: z.string().min(1, 'Organisationsnummer krävs'),
  phone: z.string().min(1, 'Telefonnummer krävs'),
  addressLine1: z.string().min(1, 'Adress krävs'),
  city: z.string().min(1, 'Stad krävs'),
  postalCode: z.string().min(1, 'Postnummer krävs'),
  repFirstName: z.string().min(1, 'Förnamn krävs'),
  repLastName: z.string().min(1, 'Efternamn krävs'),
  repDobDay: z.number().int().min(1).max(31),
  repDobMonth: z.number().int().min(1).max(12),
  repDobYear: z.number().int().min(1900).max(new Date().getFullYear()),
  iban: z.string().min(1, 'IBAN krävs'),
  accountHolderName: z.string().min(1, 'Kontoinnehavare krävs'),
})

export const updateProfileSchema = z.object({
  full_name: z.string().min(1, 'Namn kan inte vara tomt').optional(),
  phone: z.string().optional(),
})

// --- FormData helper ---

/** Parse venue FormData into a plain object suitable for venueFormSchema.safeParse() */
export function parseVenueFormData(formData: FormData) {
  const getStr = (key: string) => (formData.get(key) as string) || null
  const getInt = (key: string) => {
    const val = formData.get(key) as string
    if (!val) return null
    const parsed = parseInt(val, 10)
    return Number.isNaN(parsed) ? null : parsed
  }

  return {
    name: (formData.get('name') as string) || '',
    description: getStr('description'),
    address: (formData.get('address') as string) || '',
    city: (formData.get('city') as string) || 'Stockholm',
    area: getStr('area'),
    venue_types: formData.getAll('venue_types') as string[],
    vibes: formData.getAll('vibes') as string[],
    capacity_standing: getInt('capacity_standing'),
    capacity_seated: getInt('capacity_seated'),
    capacity_conference: getInt('capacity_conference'),
    min_guests: getInt('min_guests') ?? 1,
    price_per_hour: getInt('price_per_hour'),
    price_half_day: getInt('price_half_day'),
    price_full_day: getInt('price_full_day'),
    price_evening: getInt('price_evening'),
    price_notes: getStr('price_notes'),
    amenities: formData.getAll('amenities') as string[],
    contact_email: getStr('contact_email'),
    contact_phone: getStr('contact_phone'),
    website: getStr('website'),
  }
}
