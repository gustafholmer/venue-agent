'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { updateProfile } from '@/actions/account/update-profile'
import { updateNotificationPreferences, getNotificationPreferences } from '@/actions/account/update-notification-preferences'
import { createClient } from '@/lib/supabase/client'

interface NotificationPreferences {
  email_booking_accepted: boolean
  email_new_message: boolean
  email_new_match: boolean
  email_reminders: boolean
}

export default function AccountSettingsPage() {
  const [isLoadingProfile, setIsLoadingProfile] = useState(true)
  const [isLoadingPrefs, setIsLoadingPrefs] = useState(true)
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [isSavingPrefs, setIsSavingPrefs] = useState(false)

  const [profileError, setProfileError] = useState<string | null>(null)
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null)
  const [prefsError, setPrefsError] = useState<string | null>(null)
  const [prefsSuccess, setPrefsSuccess] = useState<string | null>(null)

  // Profile form state
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')

  // Notification preferences state
  const [prefs, setPrefs] = useState<NotificationPreferences>({
    email_booking_accepted: true,
    email_new_message: true,
    email_new_match: true,
    email_reminders: true,
  })

  useEffect(() => {
    async function loadProfile() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        setEmail(user.email || '')

        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, phone')
          .eq('id', user.id)
          .single()

        if (profile) {
          setFullName(profile.full_name || '')
          setPhone(profile.phone || '')
        }
      }
      setIsLoadingProfile(false)
    }

    async function loadPreferences() {
      const result = await getNotificationPreferences()
      if (result.success && result.preferences) {
        setPrefs({
          email_booking_accepted: result.preferences.email_booking_accepted ?? true,
          email_new_message: result.preferences.email_new_message ?? true,
          email_new_match: result.preferences.email_new_match ?? true,
          email_reminders: result.preferences.email_reminders ?? true,
        })
      }
      setIsLoadingPrefs(false)
    }

    loadProfile()
    loadPreferences()
  }, [])

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSavingProfile(true)
    setProfileError(null)
    setProfileSuccess(null)

    const result = await updateProfile({
      full_name: fullName,
      phone: phone || undefined,
    })

    if (result.success) {
      setProfileSuccess('Profilen har sparats')
      setTimeout(() => setProfileSuccess(null), 3000)
    } else {
      setProfileError(result.error || 'Kunde inte spara profilen')
    }

    setIsSavingProfile(false)
  }

  const handleSavePreferences = async () => {
    setIsSavingPrefs(true)
    setPrefsError(null)
    setPrefsSuccess(null)

    const result = await updateNotificationPreferences({
      email_booking_accepted: prefs.email_booking_accepted,
      email_new_message: prefs.email_new_message,
      email_new_match: prefs.email_new_match,
      email_reminders: prefs.email_reminders,
    })

    if (result.success) {
      setPrefsSuccess('Inställningarna har sparats')
      setTimeout(() => setPrefsSuccess(null), 3000)
    } else {
      setPrefsError(result.error || 'Kunde inte spara inställningarna')
    }

    setIsSavingPrefs(false)
  }

  const handlePrefsChange = (key: keyof NotificationPreferences) => {
    setPrefs(prev => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  const isLoading = isLoadingProfile || isLoadingPrefs

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white border border-[#e5e7eb] rounded-xl p-12 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[#1e3a8a] border-t-transparent"></div>
          <p className="text-[#6b7280] mt-2">Laddar inställningar...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-[#111827]">Inställningar</h1>
        <p className="text-[#6b7280] mt-1">
          Hantera din profil och aviseringsinställningar
        </p>
      </div>

      {/* Personal info section */}
      <div className="bg-white border border-[#e5e7eb] rounded-xl p-6 mb-6">
        <h2 className="text-lg font-semibold text-[#111827] mb-4">Personlig information</h2>

        {profileError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {profileError}
          </div>
        )}
        {profileSuccess && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
            {profileSuccess}
          </div>
        )}

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#374151] mb-1">
              Namn
            </label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Ditt namn"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#374151] mb-1">
              E-post
            </label>
            <Input
              value={email}
              disabled
              className="bg-[#f9fafb] text-[#6b7280]"
            />
            <p className="mt-1 text-xs text-[#6b7280]">
              E-postadressen kan inte ändras
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#374151] mb-1">
              Telefon
            </label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Ditt telefonnummer"
              type="tel"
            />
          </div>

          <div className="pt-2">
            <Button type="submit" disabled={isSavingProfile}>
              {isSavingProfile ? 'Sparar...' : 'Spara ändringar'}
            </Button>
          </div>
        </form>
      </div>

      {/* Notification preferences section */}
      <div className="bg-white border border-[#e5e7eb] rounded-xl p-6">
        <h2 className="text-lg font-semibold text-[#111827] mb-4">Aviseringar</h2>
        <p className="text-sm text-[#6b7280] mb-6">
          Välj vilka e-postaviseringar du vill ta emot
        </p>

        {prefsError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {prefsError}
          </div>
        )}
        {prefsSuccess && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
            {prefsSuccess}
          </div>
        )}

        <div className="space-y-4">
          <label className="flex items-center justify-between p-3 bg-[#f9fafb] rounded-lg cursor-pointer hover:bg-[#f3f4f6] transition-colors">
            <div>
              <p className="font-medium text-[#111827]">Bokningsbekräftelser</p>
              <p className="text-sm text-[#6b7280]">När din bokning godkänns eller nekas</p>
            </div>
            <input
              type="checkbox"
              checked={prefs.email_booking_accepted}
              onChange={() => handlePrefsChange('email_booking_accepted')}
              className="w-5 h-5 text-[#1e3a8a] rounded focus:ring-[#1e3a8a]"
            />
          </label>

          <label className="flex items-center justify-between p-3 bg-[#f9fafb] rounded-lg cursor-pointer hover:bg-[#f3f4f6] transition-colors">
            <div>
              <p className="font-medium text-[#111827]">Nya meddelanden</p>
              <p className="text-sm text-[#6b7280]">När du får ett nytt meddelande från en lokalägare</p>
            </div>
            <input
              type="checkbox"
              checked={prefs.email_new_message}
              onChange={() => handlePrefsChange('email_new_message')}
              className="w-5 h-5 text-[#1e3a8a] rounded focus:ring-[#1e3a8a]"
            />
          </label>

          <label className="flex items-center justify-between p-3 bg-[#f9fafb] rounded-lg cursor-pointer hover:bg-[#f3f4f6] transition-colors">
            <div>
              <p className="font-medium text-[#111827]">Nya matchningar</p>
              <p className="text-sm text-[#6b7280]">När vi hittar lokaler som matchar din sökning</p>
            </div>
            <input
              type="checkbox"
              checked={prefs.email_new_match}
              onChange={() => handlePrefsChange('email_new_match')}
              className="w-5 h-5 text-[#1e3a8a] rounded focus:ring-[#1e3a8a]"
            />
          </label>

          <label className="flex items-center justify-between p-3 bg-[#f9fafb] rounded-lg cursor-pointer hover:bg-[#f3f4f6] transition-colors">
            <div>
              <p className="font-medium text-[#111827]">Påminnelser</p>
              <p className="text-sm text-[#6b7280]">Påminnelser om kommande event</p>
            </div>
            <input
              type="checkbox"
              checked={prefs.email_reminders}
              onChange={() => handlePrefsChange('email_reminders')}
              className="w-5 h-5 text-[#1e3a8a] rounded focus:ring-[#1e3a8a]"
            />
          </label>
        </div>

        <div className="pt-6">
          <Button onClick={handleSavePreferences} disabled={isSavingPrefs}>
            {isSavingPrefs ? 'Sparar...' : 'Spara aviseringsinställningar'}
          </Button>
        </div>
      </div>
    </div>
  )
}
