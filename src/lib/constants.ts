// Shared constants used across the application.
// Single source of truth for event types, venue types, vibes, amenities, areas, and time options.

export const EVENT_TYPES = [
  { value: 'aw', label: 'AW / Afterwork' },
  { value: 'konferens', label: 'Konferens' },
  { value: 'fest', label: 'Fest / Firande' },
  { value: 'workshop', label: 'Workshop' },
  { value: 'middag', label: 'Middag / Bankett' },
  { value: 'foretag', label: 'Företagsevent' },
  { value: 'privat', label: 'Privat tillställning' },
  { value: 'annat', label: 'Annat' },
] as const

export const ALLOWED_EVENT_TYPE_VALUES: readonly string[] = EVENT_TYPES.map(t => t.value)

export const VENUE_TYPES = [
  { value: 'konferens', label: 'Konferens' },
  { value: 'fest', label: 'Fest' },
  { value: 'aw', label: 'AW' },
  { value: 'workshop', label: 'Workshop' },
  { value: 'fotografering', label: 'Fotografering' },
  { value: 'mote', label: 'Mote' },
  { value: 'middag', label: 'Middag' },
] as const

export const VIBES = [
  { value: 'modern', label: 'Modern' },
  { value: 'klassisk', label: 'Klassisk' },
  { value: 'industriell', label: 'Industriell' },
  { value: 'intim', label: 'Intim' },
  { value: 'festlig', label: 'Festlig' },
  { value: 'professionell', label: 'Professionell' },
] as const

export const AMENITIES = [
  { value: 'projektor', label: 'Projektor' },
  { value: 'ljudsystem', label: 'Ljudsystem' },
  { value: 'mikrofon', label: 'Mikrofon' },
  { value: 'whiteboard', label: 'Whiteboard' },
  { value: 'wifi', label: 'WiFi' },
  { value: 'parkering', label: 'Parkering' },
  { value: 'kok', label: 'Kok' },
  { value: 'bar', label: 'Bar' },
  { value: 'utomhus', label: 'Utomhus' },
  { value: 'scen', label: 'Scen' },
  { value: 'garderob', label: 'Garderob' },
  { value: 'handikappanpassad', label: 'Handikappanpassad' },
] as const

export const AREAS = [
  'Sodermalm',
  'Vasastan',
  'Ostermalm',
  'Kungsholmen',
  'Norrmalm',
  'Gamla Stan',
  'Djurgarden',
  'Hammarby Sjostad',
  'Hagerstrom',
  'Solna',
  'Sundbyberg',
] as const

export const TIME_OPTIONS = [
  '08:00', '09:00', '10:00', '11:00', '12:00', '13:00',
  '14:00', '15:00', '16:00', '17:00', '18:00', '19:00',
  '20:00', '21:00', '22:00', '23:00',
] as const
