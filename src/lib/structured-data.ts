const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://venue-agent.se'

export interface OrganizationData {
  name: string
  description: string
  url: string
  logo?: string
}

export interface LocalBusinessData {
  name: string
  description?: string
  address: string
  city: string
  area?: string
  priceRange?: string
  images?: string[]
  url: string
}

export interface BreadcrumbItem {
  name: string
  url: string
}

/**
 * Generate Organization schema for the homepage
 */
export function generateOrganizationSchema(data: OrganizationData): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: data.name,
    description: data.description,
    url: data.url,
    logo: data.logo,
    sameAs: [],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      availableLanguage: ['Swedish', 'English'],
    },
  }
}

/**
 * Generate LocalBusiness schema for venue pages
 */
export function generateLocalBusinessSchema(data: LocalBusinessData): object {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'EventVenue',
    name: data.name,
    url: data.url,
    address: {
      '@type': 'PostalAddress',
      streetAddress: data.address,
      addressLocality: data.area || data.city,
      addressRegion: 'Stockholm',
      addressCountry: 'SE',
    },
  }

  if (data.description) {
    schema.description = data.description
  }

  if (data.priceRange) {
    schema.priceRange = data.priceRange
  }

  if (data.images && data.images.length > 0) {
    schema.image = data.images
  }

  return schema
}

/**
 * Generate BreadcrumbList schema
 */
export function generateBreadcrumbSchema(items: BreadcrumbItem[]): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  }
}

/**
 * Generate JSON-LD script tag content
 */
export function jsonLdScript(schema: object): string {
  return JSON.stringify(schema)
}

/**
 * Default organization data for Venue Agent
 */
export const VENUE_AGENT_ORGANIZATION: OrganizationData = {
  name: 'Venue Agent',
  description: 'AI-driven marknadsplats för eventlokaler i Stockholm. Beskriv ditt event och hitta matchande lokaler med tillgängliga datum.',
  url: BASE_URL,
  logo: `${BASE_URL}/logo.png`,
}

/**
 * Generate price range string from venue prices
 */
export function getPriceRange(prices: {
  price_per_hour?: number | null
  price_half_day?: number | null
  price_full_day?: number | null
  price_evening?: number | null
}): string {
  const allPrices = [
    prices.price_per_hour,
    prices.price_half_day,
    prices.price_full_day,
    prices.price_evening,
  ].filter((p): p is number => p !== null && p !== undefined && p > 0)

  if (allPrices.length === 0) {
    return 'Pris på förfrågan'
  }

  const min = Math.min(...allPrices)
  const max = Math.max(...allPrices)

  if (min === max) {
    return `${min.toLocaleString('sv-SE')} SEK`
  }

  return `${min.toLocaleString('sv-SE')} - ${max.toLocaleString('sv-SE')} SEK`
}
