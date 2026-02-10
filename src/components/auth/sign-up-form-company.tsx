'use client'

import { useActionState, useState } from 'react'
import { signUp, type SignUpState } from '@/actions/auth/sign-up'
import { Button } from '@/components/ui/button'

interface SignUpFormCompanyProps {
  returnUrl: string | null
  signInLink: string
}

const initialState: SignUpState = {
  fieldErrors: {},
  formError: null,
}

function generateTestOrgNumber(): string {
  const part1 = String(Math.floor(Math.random() * 1000000)).padStart(6, '0')
  const part2 = String(Math.floor(Math.random() * 10000)).padStart(4, '0')
  return `${part1}-${part2}`
}

const inputBase = 'w-full h-11 px-4 border rounded-xl text-[#1a1a1a] placeholder:text-[#a8a29e] focus:outline-none'
const inputNormal = `${inputBase} border-[#e7e5e4] focus:border-[#c45a3b]`
const inputError = `${inputBase} border-red-400 focus:border-red-400`

export function SignUpFormCompany({ returnUrl, signInLink }: SignUpFormCompanyProps) {
  const [state, formAction, isPending] = useActionState(signUp, initialState)
  const [testOrgNumber] = useState(() => generateTestOrgNumber())

  return (
    <>
      <form action={formAction} noValidate className="space-y-4">
        <input type="hidden" name="accountType" value="company" />
        {returnUrl && (
          <input type="hidden" name="returnUrl" value={returnUrl} />
        )}

        {state.formError && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
            {state.formError}
          </div>
        )}

        <div>
          <label htmlFor="contactPerson" className="block text-sm text-[#57534e] mb-1.5">
            Kontaktperson*
          </label>
          <input
            id="contactPerson"
            name="contactPerson"
            type="text"
            className={state.fieldErrors.fullName ? inputError : inputNormal}
          />
          {state.fieldErrors.fullName && (
            <p className="text-red-600 text-xs mt-1">{state.fieldErrors.fullName}</p>
          )}
        </div>

        <div>
          <label htmlFor="companyName" className="block text-sm text-[#57534e] mb-1.5">
            Företagsnamn*
          </label>
          <input
            id="companyName"
            name="companyName"
            type="text"
            className={state.fieldErrors.companyName ? inputError : inputNormal}
          />
          {state.fieldErrors.companyName && (
            <p className="text-red-600 text-xs mt-1">{state.fieldErrors.companyName}</p>
          )}
        </div>

        <div>
          <label htmlFor="orgNumber" className="block text-sm text-[#57534e] mb-1.5">
            Organisationsnummer*
          </label>
          <input
            id="orgNumber"
            name="orgNumber"
            type="text"
            maxLength={11}
            defaultValue={testOrgNumber}
            placeholder="556123-4567"
            className={state.fieldErrors.orgNumber ? inputError : inputNormal}
          />
          {state.fieldErrors.orgNumber && (
            <p className="text-red-600 text-xs mt-1">{state.fieldErrors.orgNumber}</p>
          )}
        </div>

        <div>
          <label htmlFor="email" className="block text-sm text-[#57534e] mb-1.5">
            E-post*
          </label>
          <input
            id="email"
            name="email"
            type="email"
            placeholder="namn@exempel.se"
            className={state.fieldErrors.email ? inputError : inputNormal}
          />
          {state.fieldErrors.email && (
            <p className="text-red-600 text-xs mt-1">{state.fieldErrors.email}</p>
          )}
        </div>

        <div>
          <label htmlFor="phone" className="block text-sm text-[#57534e] mb-1.5">
            Telefon
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            className={inputNormal}
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm text-[#57534e] mb-1.5">
            Lösenord*
          </label>
          <input
            id="password"
            name="password"
            type="password"
            placeholder="Minst 8 tecken, en versal och en siffra"
            className={state.fieldErrors.password ? inputError : inputNormal}
          />
          {state.fieldErrors.password && (
            <p className="text-red-600 text-xs mt-1">{state.fieldErrors.password}</p>
          )}
        </div>

        <Button type="submit" className="w-full" loading={isPending}>
          Skapa konto
        </Button>
      </form>

      <p className="text-center text-sm text-[#78716c] mt-6">
        Har du redan ett konto?{' '}
        <a href={signInLink} className="text-[#c45a3b] hover:underline">
          Logga in
        </a>
      </p>
    </>
  )
}
