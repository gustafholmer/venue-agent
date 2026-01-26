'use client'

import { useActionState } from 'react'
import { signIn, type SignInState } from '@/actions/auth/sign-in'
import { Button } from '@/components/ui/button'

interface SignInFormProps {
  returnUrl: string | null
  signUpLink: string
}

const initialState: SignInState = {
  error: null,
}

export function SignInForm({ returnUrl, signUpLink }: SignInFormProps) {
  const [state, formAction, isPending] = useActionState(signIn, initialState)

  return (
    <>
      <form action={formAction} className="space-y-4">
        {returnUrl && (
          <input type="hidden" name="returnUrl" value={returnUrl} />
        )}

        {state.error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
            {state.error}
          </div>
        )}

        <div>
          <label htmlFor="email" className="block text-sm text-[#374151] mb-1.5">
            E-post
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
          <label htmlFor="password" className="block text-sm text-[#374151] mb-1.5">
            Lösenord
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            placeholder="••••••••"
            className="w-full h-11 px-4 border border-[#e5e7eb] rounded-xl text-[#111827] placeholder:text-[#9ca3af] focus:outline-none focus:border-[#1e3a8a]"
          />
        </div>

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? 'Loggar in...' : 'Logga in'}
        </Button>
      </form>

      <p className="text-center text-sm text-[#6b7280] mt-6">
        Inget konto?{' '}
        <a href={signUpLink} className="text-[#1e3a8a] hover:underline">
          Skapa ett här
        </a>
      </p>
    </>
  )
}
