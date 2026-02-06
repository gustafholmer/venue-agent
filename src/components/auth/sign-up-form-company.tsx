'use client'

import { useActionState, useState } from 'react'
import { signUp, type SignUpState } from '@/actions/auth/sign-up'
import { Button } from '@/components/ui/button'

interface SignUpFormCompanyProps {
  returnUrl: string | null
  signInLink: string
}

const initialState: SignUpState = {
  error: null,
}

function generateTestOrgNumber(): string {
  const part1 = String(Math.floor(Math.random() * 1000000)).padStart(6, '0')
  const part2 = String(Math.floor(Math.random() * 10000)).padStart(4, '0')
  return `${part1}-${part2}`
}

export function SignUpFormCompany({ returnUrl, signInLink }: SignUpFormCompanyProps) {
  const [state, formAction, isPending] = useActionState(signUp, initialState)
  const [testOrgNumber] = useState(() => generateTestOrgNumber())

  return (
    <>
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="accountType" value="company" />
        {returnUrl && (
          <input type="hidden" name="returnUrl" value={returnUrl} />
        )}

        {state.error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
            {state.error}
          </div>
        )}

        <div>
          <label htmlFor="contactPerson" className="block text-sm text-[#374151] mb-1.5">
            Kontaktperson*
          </label>
          <input
            id="contactPerson"
            name="contactPerson"
            type="text"
            required
            className="w-full h-11 px-4 border border-[#e5e7eb] rounded-xl text-[#111827] placeholder:text-[#9ca3af] focus:outline-none focus:border-[#1e3a8a]"
          />
        </div>

        <div>
          <label htmlFor="companyName" className="block text-sm text-[#374151] mb-1.5">
            Företagsnamn*
          </label>
          <input
            id="companyName"
            name="companyName"
            type="text"
            required
            className="w-full h-11 px-4 border border-[#e5e7eb] rounded-xl text-[#111827] placeholder:text-[#9ca3af] focus:outline-none focus:border-[#1e3a8a]"
          />
        </div>

        <div>
          <label htmlFor="orgNumber" className="block text-sm text-[#374151] mb-1.5">
            Organisationsnummer*
          </label>
          <input
            id="orgNumber"
            name="orgNumber"
            type="text"
            required
            maxLength={11}
            defaultValue={testOrgNumber}
            placeholder="556123-4567"
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
