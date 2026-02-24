'use client'

import { useActionState } from 'react'
import { signUp, type SignUpState } from '@/actions/auth/sign-up'
import { Button } from '@/components/ui/button'

interface SignUpFormPrivateProps {
  returnUrl: string | null
  signInLink: string
}

const initialState: SignUpState = {
  fieldErrors: {},
  formError: null,
}

const inputBase = 'w-full h-11 px-4 border rounded-xl text-[#1a1a1a] placeholder:text-[#a8a29e] focus:outline-none'
const inputNormal = `${inputBase} border-[#e7e5e4] focus:border-[#c45a3b]`
const inputError = `${inputBase} border-red-400 focus:border-red-400`

export function SignUpFormPrivate({ returnUrl, signInLink }: SignUpFormPrivateProps) {
  const [state, formAction, isPending] = useActionState(signUp, initialState)

  return (
    <>
      <form action={formAction} noValidate className="space-y-4">
        <input type="hidden" name="accountType" value="private" />
        {returnUrl && (
          <input type="hidden" name="returnUrl" value={returnUrl} />
        )}

        {state.formError && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
            {state.formError}
          </div>
        )}

        <div>
          <label htmlFor="fullName" className="block text-sm text-[#57534e] mb-1.5">
            Fullständigt namn*
          </label>
          <input
            id="fullName"
            name="fullName"
            type="text"
            defaultValue={state.fields?.fullName}
            className={state.fieldErrors.fullName ? inputError : inputNormal}
          />
          {state.fieldErrors.fullName && (
            <p className="text-red-600 text-xs mt-1">{state.fieldErrors.fullName}</p>
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
            defaultValue={state.fields?.email}
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
            defaultValue={state.fields?.phone}
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
