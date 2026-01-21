import type { Venue, VenuePhoto, BookingRequest } from '@/types/database'

// Mock venues for demo mode
export const MOCK_VENUES: (Venue & { primaryPhotoUrl?: string | null })[] = [
  {
    id: '1',
    owner_id: 'owner-1',
    name: 'Sodra Teatern',
    slug: 'sodra-teatern',
    description: 'Historisk teaterlokal pa Sodermalm med fantastisk utsikt over Stockholm. Perfekt for konferenser, fester och AW. Lokalen har anor fran 1800-talet och erbjuder en unik atmosfar med vackra originaldetaljer. Var stora sal rymmer upp till 300 gaester staende och var mindre salong passar utmarkt for intimare tillstallningar.',
    address: 'Mosebacke torg 1-3',
    city: 'Stockholm',
    area: 'Sodermalm',
    latitude: 59.3178,
    longitude: 18.0714,
    capacity_standing: 300,
    capacity_seated: 150,
    capacity_conference: 100,
    min_guests: 20,
    price_per_hour: 5000,
    price_half_day: 15000,
    price_full_day: 25000,
    price_evening: 18000,
    price_notes: 'Minsta bokning 3 timmar. Catering kan arrangeras.',
    amenities: ['Projektor', 'Ljudsystem', 'Bar', 'Scen', 'Garderob', 'WiFi'],
    venue_types: ['Fest', 'Konferens', 'AW', 'Konsert'],
    vibes: ['Historisk', 'Elegant', 'Unik'],
    website: 'https://sodrateatern.com',
    contact_email: 'event@sodrateatern.com',
    contact_phone: '08-123 45 67',
    status: 'published',
    description_embedding: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    primaryPhotoUrl: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=800&h=600&fit=crop',
  },
  {
    id: '2',
    owner_id: 'owner-2',
    name: 'Fotografiska Event',
    slug: 'fotografiska',
    description: 'Varldskant fotomuseum med eventlokaler och restaurang. Imponerande miljo for foretagsevent med utsikt over Stockholms inlopp. Vara lokaler kombinerar konst, mat och upplevelser pa ett unikt satt.',
    address: 'Stadsgaardshamnen 22',
    city: 'Stockholm',
    area: 'Sodermalm',
    latitude: 59.3178,
    longitude: 18.0850,
    capacity_standing: 500,
    capacity_seated: 200,
    capacity_conference: 80,
    min_guests: 30,
    price_per_hour: 8000,
    price_half_day: 25000,
    price_full_day: 45000,
    price_evening: 35000,
    price_notes: 'Inkluderar grundljud och ljus. Catering via vart kok.',
    amenities: ['Projektor', 'Ljudsystem', 'Catering', 'AV-utrustning', 'Garderob', 'WiFi'],
    venue_types: ['Konferens', 'Middag', 'Lansering', 'Galakval'],
    vibes: ['Modern', 'Inspirerande', 'Premium'],
    website: 'https://fotografiska.com',
    contact_email: 'events@fotografiska.com',
    contact_phone: '08-234 56 78',
    status: 'published',
    description_embedding: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    primaryPhotoUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&h=600&fit=crop',
  },
  {
    id: '3',
    owner_id: 'owner-3',
    name: 'Berns Salonger',
    slug: 'berns-salonger',
    description: 'Klassisk festlokal mitt i Stockholm med anor fran 1863. Berns erbjuder flera olika salonger for alla typer av event, fran intima middagar till stora galor. Kand for sin magnifika arkitektur och centrala lage vid Berzelii Park.',
    address: 'Berzelii Park',
    city: 'Stockholm',
    area: 'Norrmalm',
    latitude: 59.3328,
    longitude: 18.0735,
    capacity_standing: 800,
    capacity_seated: 400,
    capacity_conference: 200,
    min_guests: 50,
    price_per_hour: 10000,
    price_half_day: 35000,
    price_full_day: 60000,
    price_evening: 45000,
    price_notes: 'Olika priser beroende pa salong. Kontakta oss for offert.',
    amenities: ['Projektor', 'Ljudsystem', 'Scen', 'Ljusrigg', 'Bar', 'Kok', 'Garderob'],
    venue_types: ['Gala', 'Konsert', 'Fest', 'Konferens', 'Brollop'],
    vibes: ['Lyxig', 'Klassisk', 'Festlig'],
    website: 'https://berns.se',
    contact_email: 'event@berns.se',
    contact_phone: '08-345 67 89',
    status: 'published',
    description_embedding: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    primaryPhotoUrl: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=800&h=600&fit=crop',
  },
  {
    id: '4',
    owner_id: 'owner-4',
    name: 'Clarion Sign Konferens',
    slug: 'clarion-sign-konferens',
    description: 'Moderna konferenslokaler i centrala Stockholm med allt fran mindre motesrum till stora konferensalar. Perfekt for moten, utbildningar och workshops med professionell service och teknik.',
    address: 'Oestragotagatan 89',
    city: 'Stockholm',
    area: 'Norrmalm',
    latitude: 59.3449,
    longitude: 18.0686,
    capacity_standing: 200,
    capacity_seated: 150,
    capacity_conference: 180,
    min_guests: 10,
    price_per_hour: 3000,
    price_half_day: 10000,
    price_full_day: 18000,
    price_evening: 12000,
    price_notes: 'Fika och lunch kan bestallas. Teknikpaket ingar.',
    amenities: ['Projektor', 'Whiteboard', 'Videokonferens', 'WiFi', 'Mikrofon', 'Fika'],
    venue_types: ['Konferens', 'Mote', 'Workshop', 'Utbildning'],
    vibes: ['Professionell', 'Modern', 'Central'],
    website: 'https://clarionsign.se',
    contact_email: 'konferens@clarionsign.se',
    contact_phone: '08-456 78 90',
    status: 'published',
    description_embedding: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    primaryPhotoUrl: 'https://images.unsplash.com/photo-1431540015161-0bf868a2d407?w=800&h=600&fit=crop',
  },
  {
    id: '5',
    owner_id: 'owner-5',
    name: 'Tradgaarden',
    slug: 'tradgaarden',
    description: 'Unik eventlokal under Skanstullsbron med industriell charm och kreativ atmosfar. Perfekt for festivaler, konserter och stora fester. Kombinerar inomhus- och utomhusytor for maximal flexibilitet.',
    address: 'Hammarby Sjostad',
    city: 'Stockholm',
    area: 'Sodermalm',
    latitude: 59.3052,
    longitude: 18.0786,
    capacity_standing: 1500,
    capacity_seated: 500,
    capacity_conference: 300,
    min_guests: 100,
    price_per_hour: 15000,
    price_half_day: 50000,
    price_full_day: 90000,
    price_evening: 70000,
    price_notes: 'Helgpriser kan variera. Saasongsoppet april-september.',
    amenities: ['Scen', 'Ljudsystem', 'Ljusrigg', 'Bar', 'Utomhusyta', 'Lastkaj'],
    venue_types: ['Festival', 'Konsert', 'Fest', 'Foeretagsevent'],
    vibes: ['Industriell', 'Kreativ', 'Energisk'],
    website: 'https://tradgarden.com',
    contact_email: 'booking@tradgarden.com',
    contact_phone: '08-567 89 01',
    status: 'published',
    description_embedding: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    primaryPhotoUrl: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800&h=600&fit=crop',
  },
]

export const MOCK_VENUE_PHOTOS: VenuePhoto[] = [
  { id: '1', venue_id: '1', url: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=800&h=600&fit=crop', alt_text: 'Sodra Teatern huvudsal', is_primary: true, sort_order: 0, created_at: new Date().toISOString() },
  { id: '2', venue_id: '1', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=600&fit=crop', alt_text: 'Sodra Teatern bar', is_primary: false, sort_order: 1, created_at: new Date().toISOString() },
  { id: '3', venue_id: '2', url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&h=600&fit=crop', alt_text: 'Fotografiska eventrum', is_primary: true, sort_order: 0, created_at: new Date().toISOString() },
  { id: '4', venue_id: '2', url: 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=800&h=600&fit=crop', alt_text: 'Fotografiska utsikt', is_primary: false, sort_order: 1, created_at: new Date().toISOString() },
  { id: '5', venue_id: '3', url: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=800&h=600&fit=crop', alt_text: 'Berns stora salongen', is_primary: true, sort_order: 0, created_at: new Date().toISOString() },
  { id: '6', venue_id: '4', url: 'https://images.unsplash.com/photo-1431540015161-0bf868a2d407?w=800&h=600&fit=crop', alt_text: 'Clarion Sign konferensrum', is_primary: true, sort_order: 0, created_at: new Date().toISOString() },
  { id: '7', venue_id: '5', url: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800&h=600&fit=crop', alt_text: 'Tradgarden utomhusscen', is_primary: true, sort_order: 0, created_at: new Date().toISOString() },
]

export const MOCK_BOOKINGS: Partial<BookingRequest>[] = [
  {
    id: 'booking-1',
    venue_id: '1',
    customer_id: 'customer-1',
    event_type: 'AW',
    event_date: '2026-02-15',
    start_time: '17:00',
    end_time: '23:00',
    guest_count: 50,
    customer_name: 'Anna Andersson',
    customer_email: 'anna@example.com',
    status: 'pending',
    base_price: 18000,
    platform_fee: 2160,
    total_price: 20160,
    venue_payout: 18000,
    created_at: new Date().toISOString(),
  },
]

export const MOCK_USER = {
  id: 'mock-user-id',
  email: 'demo@venueagent.se',
}

// Helper function to get mock venue by slug or id
export function getMockVenueBySlug(slugOrId: string) {
  return MOCK_VENUES.find(v => v.slug === slugOrId || v.id === slugOrId) || null
}

// Helper function to get mock photos for a venue
export function getMockPhotosForVenue(venueId: string) {
  return MOCK_VENUE_PHOTOS.filter(p => p.venue_id === venueId)
}

// Helper function to filter mock venues
export function filterMockVenues(filters: {
  area?: string
  capacity?: number
  priceMax?: number
}) {
  let filtered = [...MOCK_VENUES]

  if (filters.area) {
    filtered = filtered.filter(v =>
      v.area?.toLowerCase().includes(filters.area!.toLowerCase())
    )
  }

  if (filters.capacity) {
    filtered = filtered.filter(v => {
      const maxCapacity = Math.max(
        v.capacity_standing || 0,
        v.capacity_seated || 0,
        v.capacity_conference || 0
      )
      return maxCapacity >= filters.capacity!
    })
  }

  if (filters.priceMax) {
    filtered = filtered.filter(v => {
      const price = v.price_evening || v.price_full_day || v.price_half_day
      return !price || price <= filters.priceMax!
    })
  }

  return filtered
}

// Get unique areas from mock venues
export function getMockAreas(): string[] {
  const areas = MOCK_VENUES
    .map(v => v.area)
    .filter((area): area is string => area !== null)
  return [...new Set(areas)].sort()
}
