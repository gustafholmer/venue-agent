import { createClient } from '@supabase/supabase-js'
import { GoogleGenerativeAI } from '@google/generative-ai'
import 'dotenv/config'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
const embeddingModel = genAI.getGenerativeModel({ model: 'text-embedding-004' })

const DISTRICTS = [
  'Södermalm', 'Vasastan', 'Östermalm', 'Kungsholmen', 'Norrmalm',
  'Hägersten', 'Årsta', 'Hammarby Sjöstad', 'Solna', 'Sundbyberg'
]

const FEATURES = [
  'balkong', 'hiss', 'parkering', 'tvättstuga', 'förråd',
  'öppen spis', 'badkar', 'diskmaskin', 'parkettgolv', 'kakelugn'
]

interface ListingData {
  title: string
  description: string
  price: number
  rooms: number
  area_sqm: number
  address: string
  district: string
  features: string[]
  monthly_fee: number
  year_built: number
}

async function generateListing(district: string, rooms: number): Promise<ListingData> {
  const priceRanges: Record<number, [number, number]> = {
    1: [2000000, 3500000],
    2: [3000000, 5000000],
    3: [4500000, 7000000],
    4: [6000000, 10000000],
  }

  const [minPrice, maxPrice] = priceRanges[Math.min(rooms, 4)]
  const price = Math.round((minPrice + Math.random() * (maxPrice - minPrice)) / 100000) * 100000
  const area = Math.round(25 + rooms * 20 + Math.random() * 20)
  const fee = Math.round((2000 + Math.random() * 3000) / 100) * 100
  const year = 1890 + Math.floor(Math.random() * 130)

  // Random features (2-5)
  const numFeatures = 2 + Math.floor(Math.random() * 4)
  const shuffled = [...FEATURES].sort(() => Math.random() - 0.5)
  const selectedFeatures = shuffled.slice(0, numFeatures)

  const prompt = `Generera en realistisk svensk bostadsannons för en ${rooms}:a i ${district}, Stockholm.

Pris: ${price.toLocaleString('sv-SE')} kr
Storlek: ${area} kvm
Avgift: ${fee} kr/mån
Byggnadsår: ${year}
Egenskaper: ${selectedFeatures.join(', ')}

Svara ENDAST med JSON:
{
  "title": "Kort lockande titel (max 50 tecken)",
  "description": "Beskrivning på 2-3 meningar som beskriver lägenheten",
  "address": "Realistisk gatuadress i ${district}"
}`

  const result = await model.generateContent(prompt)
  const response = result.response.text()
  const jsonMatch = response.match(/\{[\s\S]*\}/)

  if (!jsonMatch) {
    throw new Error('Could not parse listing from response')
  }

  const parsed = JSON.parse(jsonMatch[0])

  return {
    title: parsed.title,
    description: parsed.description,
    price,
    rooms,
    area_sqm: area,
    address: parsed.address,
    district,
    features: selectedFeatures,
    monthly_fee: fee,
    year_built: year,
  }
}

async function generateEmbedding(listing: ListingData): Promise<number[]> {
  const text = `${listing.title}\n${listing.description}\n${listing.features.join(', ')}`
  const result = await embeddingModel.embedContent(text)
  return result.embedding.values
}

async function seed() {
  console.log('Starting seed...')

  // Generate 50 listings: 5 per district
  const listings: ListingData[] = []

  for (const district of DISTRICTS) {
    const roomDistribution = [1, 2, 2, 3, 3] // More 2-3 room apartments
    for (const rooms of roomDistribution) {
      console.log(`Generating ${rooms}-room listing in ${district}...`)
      const listing = await generateListing(district, rooms)
      listings.push(listing)
      // Rate limiting
      await new Promise(r => setTimeout(r, 500))
    }
  }

  console.log(`Generated ${listings.length} listings. Creating embeddings...`)

  // Generate embeddings and insert
  for (let i = 0; i < listings.length; i++) {
    const listing = listings[i]
    console.log(`Processing ${i + 1}/${listings.length}: ${listing.title}`)

    const embedding = await generateEmbedding(listing)

    const { error } = await supabase.from('listings').insert({
      ...listing,
      city: 'Stockholm',
      embedding: `[${embedding.join(',')}]`,
    })

    if (error) {
      console.error(`Error inserting listing:`, error)
    }

    // Rate limiting
    await new Promise(r => setTimeout(r, 300))
  }

  console.log('Seed complete!')
}

seed().catch(console.error)
