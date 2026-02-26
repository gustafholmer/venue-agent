'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { updateNotificationPreferences, getNotificationPreferences } from '@/actions/account/update-notification-preferences'

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
      setProfile({
        full_name: formData.full_name || null,
        company_name: formData.company_name || null,
        phone: formData.phone || null,
      })
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

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto animate-pulse">
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
    <div className="max-w-2xl mx-auto">
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
      <div className="bg-white border border-[#e7e5e4] rounded-xl p-6">
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
    </div>
  )
}
