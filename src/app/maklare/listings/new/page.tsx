import { createListing } from '@/actions/maklare/create-listing'
import { Button } from '@/components/ui/button'

export default function NewListingPage() {
  return (
    <main className="min-h-screen bg-[#f9fafb] py-8 px-6">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <a href="/maklare/dashboard" className="text-sm text-[#6b7280] hover:text-[#1e3a8a]">
            ← Tillbaka till dashboard
          </a>
          <h1 className="font-[family-name:var(--font-playfair)] text-3xl text-[#111827] mt-4">
            Lägg till objekt
          </h1>
          <p className="text-[#6b7280] mt-1">
            Objektet visas för matchade köpare innan det går ut på Hemnet
          </p>
        </div>

        <form action={createListing} className="bg-white border border-[#e5e7eb] rounded-xl p-6 space-y-6">
          {/* Address & Location */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="address" className="block text-sm font-medium text-[#374151] mb-1.5">
                Adress *
              </label>
              <input
                id="address"
                name="address"
                type="text"
                required
                placeholder="Götgatan 42"
                className="w-full h-11 px-4 border border-[#e5e7eb] rounded-lg text-[#111827] placeholder:text-[#9ca3af] focus:outline-none focus:border-[#1e3a8a]"
              />
            </div>
            <div>
              <label htmlFor="district" className="block text-sm font-medium text-[#374151] mb-1.5">
                Område *
              </label>
              <select
                id="district"
                name="district"
                required
                className="w-full h-11 px-4 border border-[#e5e7eb] rounded-lg text-[#111827] focus:outline-none focus:border-[#1e3a8a]"
              >
                <option value="">Välj område</option>
                <option value="Södermalm">Södermalm</option>
                <option value="Vasastan">Vasastan</option>
                <option value="Östermalm">Östermalm</option>
                <option value="Kungsholmen">Kungsholmen</option>
                <option value="Norrmalm">Norrmalm</option>
                <option value="Hägersten">Hägersten</option>
                <option value="Årsta">Årsta</option>
                <option value="Hammarby Sjöstad">Hammarby Sjöstad</option>
                <option value="Solna">Solna</option>
                <option value="Sundbyberg">Sundbyberg</option>
              </select>
            </div>
          </div>

          {/* Price & Size */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="price" className="block text-sm font-medium text-[#374151] mb-1.5">
                Pris (SEK) *
              </label>
              <input
                id="price"
                name="price"
                type="number"
                required
                placeholder="3500000"
                className="w-full h-11 px-4 border border-[#e5e7eb] rounded-lg text-[#111827] placeholder:text-[#9ca3af] focus:outline-none focus:border-[#1e3a8a]"
              />
            </div>
            <div>
              <label htmlFor="rooms" className="block text-sm font-medium text-[#374151] mb-1.5">
                Antal rum *
              </label>
              <input
                id="rooms"
                name="rooms"
                type="number"
                step="0.5"
                required
                placeholder="2.5"
                className="w-full h-11 px-4 border border-[#e5e7eb] rounded-lg text-[#111827] placeholder:text-[#9ca3af] focus:outline-none focus:border-[#1e3a8a]"
              />
            </div>
            <div>
              <label htmlFor="area_sqm" className="block text-sm font-medium text-[#374151] mb-1.5">
                Storlek (m²) *
              </label>
              <input
                id="area_sqm"
                name="area_sqm"
                type="number"
                required
                placeholder="55"
                className="w-full h-11 px-4 border border-[#e5e7eb] rounded-lg text-[#111827] placeholder:text-[#9ca3af] focus:outline-none focus:border-[#1e3a8a]"
              />
            </div>
          </div>

          {/* Additional info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="monthly_fee" className="block text-sm font-medium text-[#374151] mb-1.5">
                Avgift (SEK/mån)
              </label>
              <input
                id="monthly_fee"
                name="monthly_fee"
                type="number"
                placeholder="3200"
                className="w-full h-11 px-4 border border-[#e5e7eb] rounded-lg text-[#111827] placeholder:text-[#9ca3af] focus:outline-none focus:border-[#1e3a8a]"
              />
            </div>
            <div>
              <label htmlFor="year_built" className="block text-sm font-medium text-[#374151] mb-1.5">
                Byggår
              </label>
              <input
                id="year_built"
                name="year_built"
                type="number"
                placeholder="1925"
                className="w-full h-11 px-4 border border-[#e5e7eb] rounded-lg text-[#111827] placeholder:text-[#9ca3af] focus:outline-none focus:border-[#1e3a8a]"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-[#374151] mb-1.5">
              Beskrivning *
            </label>
            <textarea
              id="description"
              name="description"
              required
              rows={4}
              placeholder="Beskriv objektet..."
              className="w-full px-4 py-3 border border-[#e5e7eb] rounded-lg text-[#111827] placeholder:text-[#9ca3af] focus:outline-none focus:border-[#1e3a8a] resize-none"
            />
          </div>

          {/* Features */}
          <div>
            <label htmlFor="features" className="block text-sm font-medium text-[#374151] mb-1.5">
              Egenskaper
            </label>
            <input
              id="features"
              name="features"
              type="text"
              placeholder="balkong, hiss, parkettgolv (kommaseparerat)"
              className="w-full h-11 px-4 border border-[#e5e7eb] rounded-lg text-[#111827] placeholder:text-[#9ca3af] focus:outline-none focus:border-[#1e3a8a]"
            />
          </div>

          {/* Public date */}
          <div>
            <label htmlFor="public_date" className="block text-sm font-medium text-[#374151] mb-1.5">
              Publiceringsdatum på Hemnet
            </label>
            <input
              id="public_date"
              name="public_date"
              type="date"
              className="w-full h-11 px-4 border border-[#e5e7eb] rounded-lg text-[#111827] focus:outline-none focus:border-[#1e3a8a]"
            />
            <p className="text-xs text-[#6b7280] mt-1">
              Lämna tomt om objektet inte ska publiceras på Hemnet
            </p>
          </div>

          <div className="pt-4">
            <Button type="submit" className="w-full">
              Lägg till objekt
            </Button>
          </div>
        </form>
      </div>
    </main>
  )
}
