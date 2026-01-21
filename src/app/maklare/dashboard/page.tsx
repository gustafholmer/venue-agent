import { Button } from '@/components/ui/button'
import { isDemoMode } from '@/lib/demo-mode'

const MOCK_MAKLARE_LISTINGS = [
  {
    id: '1',
    title: 'Ljus 2:a med balkong',
    address: 'Bondegatan 42',
    district: 'Södermalm',
    price: 3950000,
    status: 'early_access',
    public_date: '2026-02-01',
    matches: 14,
    bookings: 3,
  },
  {
    id: '2',
    title: 'Modern 3:a i Vasastan',
    address: 'Odengatan 88',
    district: 'Vasastan',
    price: 5200000,
    status: 'early_access',
    public_date: '2026-01-28',
    matches: 22,
    bookings: 5,
  },
  {
    id: '3',
    title: 'Charmig 2:a på Kungsholmen',
    address: 'Fleminggatan 25',
    district: 'Kungsholmen',
    price: 3400000,
    status: 'public',
    public_date: null,
    matches: 8,
    bookings: 2,
  },
]

const MOCK_BOOKINGS = [
  {
    id: '1',
    listing_title: 'Ljus 2:a med balkong',
    buyer_name: 'Anna Lindqvist',
    buyer_email: 'anna.lindqvist@gmail.com',
    buyer_phone: '070-234 56 78',
    requested_at: '2026-01-21',
    status: 'pending',
    buyer_message: 'Hej! Jag är mycket intresserad av lägenheten. Söker en tvåa för mig och min sambo. Finns det möjlighet att boka visning denna helg?',
  },
  {
    id: '2',
    listing_title: 'Modern 3:a i Vasastan',
    buyer_name: 'Erik Johansson',
    buyer_email: 'erik.j@hotmail.com',
    buyer_phone: '073-456 78 90',
    requested_at: '2026-01-20',
    status: 'confirmed',
    viewing_time: '2026-01-25 14:00',
  },
  {
    id: '3',
    listing_title: 'Modern 3:a i Vasastan',
    buyer_name: 'Maria Svensson',
    buyer_email: 'maria.svensson@outlook.com',
    buyer_phone: '076-123 45 67',
    requested_at: '2026-01-19',
    status: 'confirmed',
    viewing_time: '2026-01-25 15:00',
  },
  {
    id: '4',
    listing_title: 'Ljus 2:a med balkong',
    buyer_name: 'Johan Berg',
    buyer_email: 'johan.berg@icloud.com',
    buyer_phone: '070-987 65 43',
    requested_at: '2026-01-18',
    status: 'pending',
    buyer_message: 'Har banklån klart och är redo att slå till snabbt om lägenheten passar!',
  },
  {
    id: '5',
    listing_title: 'Charmig 2:a på Kungsholmen',
    buyer_name: 'Lisa Ek',
    buyer_email: 'lisa.ek@gmail.com',
    buyer_phone: '072-345 67 89',
    requested_at: '2026-01-17',
    status: 'completed',
    viewing_time: '2026-01-20 11:00',
  },
]

async function getDashboardData() {
  if (isDemoMode()) {
    return {
      maklare: { name: 'Demo Mäklare', company: 'Mäklarfirma AB' },
      listings: MOCK_MAKLARE_LISTINGS,
      bookings: MOCK_BOOKINGS,
    }
  }

  const { createClient } = await import('@/lib/supabase/server')
  const { redirect } = await import('next/navigation')
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return redirect('/maklare/sign-in')
  }

  const { data: maklare } = await supabase
    .from('maklare')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (!maklare) {
    return redirect('/maklare/sign-up')
  }

  const { data: listings } = await supabase
    .from('listings')
    .select('*')
    .eq('maklare_id', maklare.id)
    .order('created_at', { ascending: false })

  const { data: bookings } = await supabase
    .from('bookings')
    .select('*, listings(title)')
    .eq('maklare_id', maklare.id)
    .order('requested_at', { ascending: false })

  return { maklare, listings: listings || [], bookings: bookings || [] }
}

export default async function MaklareDashboard() {
  const { maklare, listings, bookings } = await getDashboardData()
  const demoMode = isDemoMode()

  const pendingBookings = bookings.filter((b: { status: string }) => b.status === 'pending')

  return (
    <main className="min-h-screen bg-[#f9fafb]">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Page title */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-[#111827]">Mäklarportal</h1>
            <p className="text-sm text-[#6b7280]">{maklare.name || maklare.company}</p>
          </div>
        </div>
        {demoMode && (
          <div className="bg-[#1e3a8a]/5 border border-[#1e3a8a]/20 rounded-lg px-4 py-3 mb-6 text-sm text-[#1e3a8a]">
            Demo-läge: Data är simulerad. Logga in för att se riktiga objekt.
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white border border-[#e5e7eb] rounded-xl p-4">
            <p className="text-sm text-[#6b7280]">Aktiva objekt</p>
            <p className="text-2xl font-semibold text-[#111827]">{listings.length}</p>
          </div>
          <div className="bg-white border border-[#e5e7eb] rounded-xl p-4">
            <p className="text-sm text-[#6b7280]">Totalt matchade</p>
            <p className="text-2xl font-semibold text-[#111827]">
              {listings.reduce((acc: number, l: { matches?: number }) => acc + (l.matches || 0), 0)}
            </p>
          </div>
          <div className="bg-white border border-[#e5e7eb] rounded-xl p-4">
            <p className="text-sm text-[#6b7280]">Visningsförfrågningar</p>
            <p className="text-2xl font-semibold text-[#111827]">{bookings.length}</p>
          </div>
          <div className="bg-white border border-[#e5e7eb] rounded-xl p-4">
            <p className="text-sm text-[#6b7280]">Väntar på svar</p>
            <p className="text-2xl font-semibold text-[#1e3a8a]">{pendingBookings.length}</p>
          </div>
        </div>

        {/* Quick action */}
        <div className="mb-8">
          <a href="/maklare/listings/new">
            <Button>+ Lägg till nytt objekt</Button>
          </a>
        </div>

        {/* Listings */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-[#111827] mb-4">Dina objekt</h2>
          {listings.length === 0 ? (
            <div className="bg-white border border-[#e5e7eb] rounded-xl p-8 text-center">
              <p className="text-[#6b7280]">Inga objekt ännu</p>
              <a href="/maklare/listings/new" className="text-[#1e3a8a] hover:underline text-sm">
                Lägg till ditt första objekt →
              </a>
            </div>
          ) : (
            <div className="bg-white border border-[#e5e7eb] rounded-xl overflow-hidden">
              <table className="w-full">
                <thead className="bg-[#f9fafb] border-b border-[#e5e7eb]">
                  <tr>
                    <th className="text-left text-sm font-medium text-[#6b7280] px-4 py-3">Objekt</th>
                    <th className="text-left text-sm font-medium text-[#6b7280] px-4 py-3">Pris</th>
                    <th className="text-left text-sm font-medium text-[#6b7280] px-4 py-3">Status</th>
                    <th className="text-left text-sm font-medium text-[#6b7280] px-4 py-3">Matcher</th>
                    <th className="text-left text-sm font-medium text-[#6b7280] px-4 py-3">Visningar</th>
                  </tr>
                </thead>
                <tbody>
                  {listings.map((listing: { id: string; title: string; address: string; district: string; price: number; status: string; public_date?: string; matches?: number; bookings?: number }) => (
                    <tr key={listing.id} className="border-b border-[#e5e7eb] last:border-0">
                      <td className="px-4 py-3">
                        <p className="font-medium text-[#111827]">{listing.title}</p>
                        <p className="text-sm text-[#6b7280]">{listing.address}, {listing.district}</p>
                      </td>
                      <td className="px-4 py-3 text-[#111827]">
                        {(listing.price / 1000000).toFixed(1)} mkr
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          listing.status === 'early_access'
                            ? 'bg-[#1e3a8a]/10 text-[#1e3a8a]'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {listing.status === 'early_access' ? 'Early access' : listing.status}
                        </span>
                        {listing.public_date && (
                          <p className="text-xs text-[#9ca3af] mt-1">
                            Hemnet: {new Date(listing.public_date).toLocaleDateString('sv-SE')}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-[#111827]">{listing.matches || 0}</td>
                      <td className="px-4 py-3 text-[#111827]">{listing.bookings || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Bookings */}
        <div>
          <h2 className="text-lg font-semibold text-[#111827] mb-4">Visningsförfrågningar</h2>
          {bookings.length === 0 ? (
            <div className="bg-white border border-[#e5e7eb] rounded-xl p-8 text-center">
              <p className="text-[#6b7280]">Inga förfrågningar ännu</p>
            </div>
          ) : (
            <div className="space-y-3">
              {bookings.map((booking: { id: string; listing_title?: string; listings?: { title: string }; buyer_name?: string; buyer_email: string; buyer_phone?: string; buyer_message?: string; requested_at: string; status: string; viewing_time?: string }) => (
                <div key={booking.id} className="bg-white border border-[#e5e7eb] rounded-xl p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-medium text-[#111827]">
                        {booking.buyer_name || booking.buyer_email}
                      </p>
                      <p className="text-sm text-[#6b7280]">
                        {booking.listing_title || booking.listings?.title}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        booking.status === 'pending'
                          ? 'bg-amber-50 text-amber-700'
                          : booking.status === 'confirmed'
                          ? 'bg-blue-50 text-blue-700'
                          : 'bg-green-50 text-green-700'
                      }`}>
                        {booking.status === 'pending' ? 'Ny förfrågan' :
                         booking.status === 'confirmed' ? 'Bokad' : 'Genomförd'}
                      </span>
                      <p className="text-xs text-[#9ca3af] mt-1">
                        {new Date(booking.requested_at).toLocaleDateString('sv-SE')}
                      </p>
                    </div>
                  </div>

                  {/* Contact info */}
                  <div className="flex gap-4 text-sm text-[#6b7280] mb-3">
                    <span>{booking.buyer_email}</span>
                    {booking.buyer_phone && <span>{booking.buyer_phone}</span>}
                  </div>

                  {/* Message */}
                  {booking.buyer_message && (
                    <p className="text-sm text-[#4b5563] bg-[#f9fafb] rounded-lg p-3 mb-3">
                      "{booking.buyer_message}"
                    </p>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-3">
                    {booking.status === 'pending' ? (
                      <>
                        <Button size="sm">Bekräfta visning</Button>
                        <Button variant="outline" size="sm">Avböj</Button>
                      </>
                    ) : booking.viewing_time ? (
                      <span className="text-sm text-[#1e3a8a]">
                        Visning: {new Date(booking.viewing_time).toLocaleDateString('sv-SE', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
