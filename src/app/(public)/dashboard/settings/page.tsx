'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { updateNotificationPreferences, getNotificationPreferences } from '@/actions/account/update-notification-preferences'
import { getCalendarConnection } from '@/actions/calendar/get-connection'
import { listGoogleCalendars } from '@/actions/calendar/list-calendars'
import { disconnectCalendar } from '@/actions/calendar/disconnect'
import { updateVenueCalendarMapping } from '@/actions/calendar/update-venue-mapping'
import type { ExternalCalendar } from '@/lib/calendar/types'

interface Profile {
  full_name: string | null
  company_name: string | null
  phone: string | null
  org_number: string | null
}

interface NotificationPreferences {
  email_booking_request: boolean
  email_new_message: boolean
  email_reminders: boolean
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [email, setEmail] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [formData, setFormData] = useState({
    full_name: '',
    company_name: '',
    phone: '',
  })

  const [prefs, setPrefs] = useState<NotificationPreferences>({
    email_booking_request: true,
    email_new_message: true,
    email_reminders: true,
  })
  const [isSavingPrefs, setIsSavingPrefs] = useState(false)
  const [prefsMessage, setPrefsMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Calendar integration state
  const [calendarConnected, setCalendarConnected] = useState(false)
  const [calendarEmail, setCalendarEmail] = useState<string | null>(null)
  const [calendars, setCalendars] = useState<ExternalCalendar[]>([])
  const [selectedCalendarId, setSelectedCalendarId] = useState<string>('')
  const [syncEnabled, setSyncEnabled] = useState(true)
  const [venueId, setVenueId] = useState<string | null>(null)
  const [calendarLoading, setCalendarLoading] = useState(true)
  const [calendarMessage, setCalendarMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [isDisconnecting, setIsDisconnecting] = useState(false)
  const [isSavingCalendar, setIsSavingCalendar] = useState(false)

  useEffect(() => {
    async function loadProfile() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        setEmail(user.email || '')

        const { data: profileData } = await supabase
          .from('profiles')
          .select('full_name, company_name, phone, org_number')
          .eq('id', user.id)
          .single()

        if (profileData) {
          setProfile(profileData)
          setFormData({
            full_name: profileData.full_name || '',
            company_name: profileData.company_name || '',
            phone: profileData.phone || '',
          })
        }
      }
      setIsLoading(false)
    }

    loadProfile()

    async function loadPreferences() {
      const result = await getNotificationPreferences()
      if (result.success && result.preferences) {
        setPrefs({
          email_booking_request: result.preferences.email_booking_request ?? true,
          email_new_message: result.preferences.email_new_message ?? true,
          email_reminders: result.preferences.email_reminders ?? true,
        })
      }
    }

    loadPreferences()
  }, [])

  useEffect(() => {
    async function loadCalendarState() {
      const supabase = createClient()

      // Check URL params for OAuth callback results
      const params = new URLSearchParams(window.location.search)
      if (params.get('calendar_connected') === 'true') {
        setCalendarMessage({ type: 'success', text: 'Google Kalender kopplad!' })
        // Clean URL
        window.history.replaceState({}, '', window.location.pathname)
      }
      if (params.get('calendar_error')) {
        setCalendarMessage({ type: 'error', text: 'Kunde inte koppla Google Kalender. Försök igen.' })
        window.history.replaceState({}, '', window.location.pathname)
      }

      // Load connection status
      const connection = await getCalendarConnection()
      setCalendarConnected(connection.connected)
      setCalendarEmail(connection.providerEmail || null)

      // Load venue for this owner
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: venue } = await supabase
          .from('venues')
          .select('id')
          .eq('owner_id', user.id)
          .single()

        if (venue) {
          setVenueId(venue.id)

          // Load existing mapping
          const { data: mapping } = await supabase
            .from('venue_calendar_mappings')
            .select('external_calendar_id, sync_enabled')
            .eq('venue_id', venue.id)
            .single()

          if (mapping) {
            setSelectedCalendarId(mapping.external_calendar_id)
            setSyncEnabled(mapping.sync_enabled)
          }
        }
      }

      // Load available calendars if connected
      if (connection.connected) {
        const result = await listGoogleCalendars()
        if (result.success && result.calendars) {
          setCalendars(result.calendars)
        }
      }

      setCalendarLoading(false)
    }

    loadCalendarState()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setMessage(null)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      setMessage({ type: 'error', text: 'Du måste vara inloggad' })
      setIsSaving(false)
      return
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: formData.full_name || null,
        company_name: formData.company_name || null,
        phone: formData.phone || null,
      })
      .eq('id', user.id)

    if (error) {
      setMessage({ type: 'error', text: 'Kunde inte spara ändringar' })
    } else {
      setMessage({ type: 'success', text: 'Ändringar sparade' })
      setProfile((prev) => ({
        ...prev,
        full_name: formData.full_name || null,
        company_name: formData.company_name || null,
        phone: formData.phone || null,
        org_number: prev?.org_number ?? null,
      }))
    }

    setIsSaving(false)
  }

  const handleSavePreferences = async () => {
    setIsSavingPrefs(true)
    setPrefsMessage(null)

    const result = await updateNotificationPreferences({
      email_booking_request: prefs.email_booking_request,
      email_new_message: prefs.email_new_message,
      email_reminders: prefs.email_reminders,
    })

    if (result.success) {
      setPrefsMessage({ type: 'success', text: 'Aviseringsinställningar sparade' })
    } else {
      setPrefsMessage({ type: 'error', text: result.error || 'Kunde inte spara aviseringsinställningar' })
    }

    setIsSavingPrefs(false)
  }

  const handlePrefsChange = (key: keyof NotificationPreferences) => {
    setPrefs(prev => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  const handleDisconnect = async () => {
    if (!confirm('Är du säker? Alla synkade kalenderhändelser kommer att finnas kvar i Google Kalender men nya händelser synkas inte längre.')) return
    setIsDisconnecting(true)
    const result = await disconnectCalendar()
    if (result.success) {
      setCalendarConnected(false)
      setCalendarEmail(null)
      setCalendars([])
      setSelectedCalendarId('')
      setCalendarMessage({ type: 'success', text: 'Google Kalender bortkopplad' })
    } else {
      setCalendarMessage({ type: 'error', text: result.error || 'Något gick fel' })
    }
    setIsDisconnecting(false)
  }

  const handleSaveCalendarMapping = async () => {
    if (!venueId || !selectedCalendarId) return
    setIsSavingCalendar(true)
    const result = await updateVenueCalendarMapping(venueId, selectedCalendarId, syncEnabled)
    if (result.success) {
      setCalendarMessage({ type: 'success', text: 'Kalenderinställningar sparade' })
    } else {
      setCalendarMessage({ type: 'error', text: result.error || 'Något gick fel' })
    }
    setIsSavingCalendar(false)
  }

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="mb-8">
          <div className="h-8 bg-[#e7e5e4] rounded w-32 mb-2" />
          <div className="h-5 bg-[#e7e5e4] rounded w-48" />
        </div>
        <div className="bg-white border border-[#e7e5e4] rounded-xl p-6">
          <div className="space-y-4">
            <div className="h-10 bg-[#e7e5e4] rounded" />
            <div className="h-10 bg-[#e7e5e4] rounded" />
            <div className="h-10 bg-[#e7e5e4] rounded" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-[family-name:var(--font-heading)] text-2xl font-semibold text-[#1a1a1a]">Inställningar</h1>
        <p className="text-[#78716c] mt-1">
          Hantera din profil och aviseringsinställningar
        </p>
      </div>

      {/* Profile form */}
      <div className="bg-white border border-[#e7e5e4] rounded-xl p-6 mb-6">
        <h2 className="text-lg font-semibold text-[#1a1a1a] mb-4">Profilinformation</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-[#57534e] mb-1">
              E-post
            </label>
            <input
              type="email"
              id="email"
              value={email}
              disabled
              className="w-full px-3 py-2 bg-[#faf9f7] border border-[#e7e5e4] rounded-lg text-[#78716c] cursor-not-allowed"
            />
            <p className="mt-1 text-xs text-[#78716c]">
              E-postadressen kan inte ändras
            </p>
          </div>

          {profile?.org_number && (
            <div>
              <label htmlFor="org_number" className="block text-sm font-medium text-[#57534e] mb-1">
                Organisationsnummer
              </label>
              <input
                type="text"
                id="org_number"
                value={profile.org_number}
                disabled
                className="w-full px-3 py-2 bg-[#faf9f7] border border-[#e7e5e4] rounded-lg text-[#78716c] cursor-not-allowed"
              />
            </div>
          )}

          <div>
            <label htmlFor="full_name" className="block text-sm font-medium text-[#57534e] mb-1">
              Fullständigt namn
            </label>
            <input
              type="text"
              id="full_name"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              className="w-full px-3 py-2 border border-[#e7e5e4] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c45a3b] focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="company_name" className="block text-sm font-medium text-[#57534e] mb-1">
              Företagsnamn
            </label>
            <input
              type="text"
              id="company_name"
              value={formData.company_name}
              onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
              className="w-full px-3 py-2 border border-[#e7e5e4] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c45a3b] focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-[#57534e] mb-1">
              Telefonnummer
            </label>
            <input
              type="tel"
              id="phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-3 py-2 border border-[#e7e5e4] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c45a3b] focus:border-transparent"
              placeholder="+46 70 123 45 67"
            />
          </div>

          {message && (
            <div
              className={`p-3 rounded-lg text-sm flex items-start gap-2 ${
                message.type === 'success'
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}
            >
              <span className="flex-1">{message.text}</span>
              <button onClick={() => setMessage(null)} className={`flex-shrink-0 p-1 rounded ${message.type === 'success' ? 'hover:bg-green-100' : 'hover:bg-red-100'}`} aria-label="Stäng"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
          )}

          <div className="pt-2">
            <Button type="submit" loading={isSaving}>
              Spara ändringar
            </Button>
          </div>
        </form>
      </div>

      {/* Notification preferences */}
      <div className="bg-white border border-[#e7e5e4] rounded-xl p-6 mb-6">
        <h2 className="text-lg font-semibold text-[#1a1a1a] mb-4">Aviseringar</h2>
        <p className="text-sm text-[#78716c] mb-6">
          Välj vilka e-postaviseringar du vill ta emot
        </p>

        {prefsMessage && (
          <div
            className={`mb-4 p-3 rounded-lg text-sm flex items-start gap-2 ${
              prefsMessage.type === 'success'
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}
          >
            <span className="flex-1">{prefsMessage.text}</span>
            <button onClick={() => setPrefsMessage(null)} className={`flex-shrink-0 p-1 rounded ${prefsMessage.type === 'success' ? 'hover:bg-green-100' : 'hover:bg-red-100'}`} aria-label="Stäng"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
          </div>
        )}

        <div className="space-y-4">
          <label className="flex items-center justify-between p-3 bg-[#faf9f7] rounded-lg cursor-pointer hover:bg-[#f5f5f4] transition-colors">
            <div>
              <p className="font-medium text-[#1a1a1a]">Bokningsförfrågningar</p>
              <p className="text-sm text-[#78716c]">När en kund skickar en bokningsförfrågan</p>
            </div>
            <input
              type="checkbox"
              checked={prefs.email_booking_request}
              onChange={() => handlePrefsChange('email_booking_request')}
              className="w-5 h-5 text-[#c45a3b] rounded focus:ring-[#c45a3b]"
            />
          </label>

          <label className="flex items-center justify-between p-3 bg-[#faf9f7] rounded-lg cursor-pointer hover:bg-[#f5f5f4] transition-colors">
            <div>
              <p className="font-medium text-[#1a1a1a]">Nya meddelanden</p>
              <p className="text-sm text-[#78716c]">När du får ett nytt meddelande från en kund</p>
            </div>
            <input
              type="checkbox"
              checked={prefs.email_new_message}
              onChange={() => handlePrefsChange('email_new_message')}
              className="w-5 h-5 text-[#c45a3b] rounded focus:ring-[#c45a3b]"
            />
          </label>

          <label className="flex items-center justify-between p-3 bg-[#faf9f7] rounded-lg cursor-pointer hover:bg-[#f5f5f4] transition-colors">
            <div>
              <p className="font-medium text-[#1a1a1a]">Påminnelser</p>
              <p className="text-sm text-[#78716c]">Påminnelser om kommande event</p>
            </div>
            <input
              type="checkbox"
              checked={prefs.email_reminders}
              onChange={() => handlePrefsChange('email_reminders')}
              className="w-5 h-5 text-[#c45a3b] rounded focus:ring-[#c45a3b]"
            />
          </label>
        </div>

        <div className="pt-6">
          <Button onClick={handleSavePreferences} loading={isSavingPrefs}>
            Spara aviseringsinställningar
          </Button>
        </div>
      </div>

      {/* Calendar integration */}
      <div className="bg-white border border-[#e7e5e4] rounded-xl p-6 mb-6">
        <h2 className="text-lg font-semibold text-[#1a1a1a] mb-1">Integrationer</h2>
        <p className="text-[#78716c] text-sm mb-4">
          Koppla externa tjänster till ditt konto
        </p>

        {calendarMessage && (
          <div
            className={`mb-4 p-3 rounded-lg text-sm flex items-start gap-2 ${
              calendarMessage.type === 'success'
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}
          >
            <span className="flex-1">{calendarMessage.text}</span>
            <button
              onClick={() => setCalendarMessage(null)}
              className={`flex-shrink-0 p-1 rounded ${calendarMessage.type === 'success' ? 'hover:bg-green-100' : 'hover:bg-red-100'}`}
              aria-label="Stäng"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-[#f5f3f0] flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-[#57534e]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="font-medium text-[#1a1a1a]">Google Kalender</h3>
            {calendarLoading ? (
              <p className="text-sm text-[#78716c] mt-1">Laddar...</p>
            ) : calendarConnected ? (
              <div className="mt-2 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-[#78716c]">
                    Kopplad som <span className="font-medium text-[#1a1a1a]">{calendarEmail}</span>
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDisconnect}
                    loading={isDisconnecting}
                    className="border-red-300 text-red-600 hover:bg-red-50"
                  >
                    Koppla bort
                  </Button>
                </div>

                {venueId && (
                  <>
                    <div>
                      <label htmlFor="calendar-select" className="block text-sm font-medium text-[#57534e] mb-1">
                        Synka till kalender
                      </label>
                      <select
                        id="calendar-select"
                        value={selectedCalendarId}
                        onChange={(e) => setSelectedCalendarId(e.target.value)}
                        className="w-full px-3 py-2 border border-[#e7e5e4] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c45a3b] focus:border-transparent"
                      >
                        <option value="">Välj kalender...</option>
                        {calendars.map((cal) => (
                          <option key={cal.id} value={cal.id}>
                            {cal.name}{cal.primary ? ' (primär)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={syncEnabled}
                        onChange={(e) => setSyncEnabled(e.target.checked)}
                        className="rounded border-[#e7e5e4] text-[#c45a3b] focus:ring-[#c45a3b]"
                      />
                      <span className="text-sm text-[#57534e]">Synkronisering aktiverad</span>
                    </label>

                    <Button
                      onClick={handleSaveCalendarMapping}
                      loading={isSavingCalendar}
                      disabled={!selectedCalendarId}
                    >
                      Spara kalenderinställningar
                    </Button>
                  </>
                )}
              </div>
            ) : (
              <div className="mt-2">
                <p className="text-sm text-[#78716c] mb-3">
                  Synka blockerade datum och bokningar till din Google Kalender automatiskt.
                </p>
                <Button
                  variant="secondary"
                  onClick={() => { window.location.href = '/api/auth/google-calendar' }}
                >
                  Koppla Google Kalender
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Danger zone */}
      <div className="bg-white border border-red-200 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-red-600 mb-2">Farozonen</h2>
        <p className="text-[#78716c] text-sm mb-4">
          Dessa åtgärder är permanenta och kan inte ångras.
        </p>
        <Button
          variant="outline"
          className="border-red-300 text-red-600 hover:bg-red-50"
          onClick={() => {
            if (confirm('Är du säker på att du vill logga ut?')) {
              const supabase = createClient()
              supabase.auth.signOut().then(() => {
                window.location.href = '/'
              })
            }
          }}
        >
          Logga ut
        </Button>
      </div>
    </div>
  )
}
