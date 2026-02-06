'use client'

import { useActionState } from 'react'
import { signUp, type SignUpState } from '@/actions/auth/sign-up'
import { Button } from '@/components/ui/button'

interface SignUpFormPrivateProps {
  returnUrl: string | null
  signInLink: string
}

const initialState: SignUpState = {
  error: null,
}

export function SignUpFormPrivate({ returnUrl, signInLink }: SignUpFormPrivateProps) {
  const [state, formAction, isPending] = useActionState(signUp, initialState)

  return (
    <>
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="accountType" value="private" />
        {returnUrl && (
          <input type="hidden" name="returnUrl" value={returnUrl} />
        )}

        {state.error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
            {state.error}
          </div>
        )}

        <div>
          <label htmlFor="fullName" className="block text-sm text-[#374151] mb-1.5">
            Fullständigt namn*
          </label>
          <input
            id="fullName"
            name="fullName"
            type="text"
            required
            className="w-full h-11 px-4 border border-[#e5e7eb] rounded-xl text-[#111827] placeholder:text-[#9ca3af] focus:outline-none focus:border-[#1e3a8a]"
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm text-[#374151] mb-1.5">
            E-post*
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            placeholder="namn@exempel.se"
            className="w-full h-11 px-4 border border-[#e5e7eb] rounded-xl text-[#111827] placeholder:text-[#9ca3af] focus:outline-none focus:border-[#1e3a8a]"
          />
        </div>

        <div>
          <label htmlFor="phone" className="block text-sm text-[#374151] mb-1.5">
            Telefon
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            className="w-full h-11 px-4 border border-[#e5e7eb] rounded-xl text-[#111827] placeholder:text-[#9ca3af] focus:outline-none focus:border-[#1e3a8a]"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm text-[#374151] mb-1.5">
            Lösenord*
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            placeholder="Minst 8 tecken"
            className="w-full h-11 px-4 border border-[#e5e7eb] rounded-xl text-[#111827] placeholder:text-[#9ca3af] focus:outline-none focus:border-[#1e3a8a]"
          />
        </div>

        <Button type="submit" className="w-full" loading={isPending}>
          Skapa konto
        </Button>
      </form>

      <p className="text-center text-sm text-[#6b7280] mt-6">
        Har du redan ett konto?{' '}
        <a href={signInLink} className="text-[#1e3a8a] hover:underline">
          Logga in
        </a>
      </p>
    </>
  )
}
