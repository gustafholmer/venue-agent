'use client'

import { useActionState } from 'react'
import { signIn, type SignInState } from '@/actions/auth/sign-in'
import { Button } from '@/components/ui/button'

interface SignInFormProps {
  returnUrl: string | null
  signUpLink: string
  defaultEmail: string | null
}

const initialState: SignInState = {
  error: null,
}

export function SignInForm({ returnUrl, signUpLink, defaultEmail }: SignInFormProps) {
  const [state, formAction, isPending] = useActionState(signIn, initialState)

  return (
    <>
      <form action={formAction} className="space-y-4">
        {returnUrl && (
          <input type="hidden" name="returnUrl" value={returnUrl} />
        )}

        {state.error && (
          <div id="sign-in-error" className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm" role="alert">
            {state.error}
          </div>
        )}

        <div>
          <label htmlFor="email" className="block text-sm text-[#57534e] mb-1.5">
            E-post
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            defaultValue={defaultEmail ?? undefined}
            placeholder="namn@exempel.se"
            aria-invalid={!!state.error}
            aria-describedby={state.error ? 'sign-in-error' : undefined}
            className="w-full h-11 px-4 border border-[#e7e5e4] rounded-xl text-[#1a1a1a] placeholder:text-[#a8a29e] focus:outline-none focus:border-[#c45a3b]"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm text-[#57534e] mb-1.5">
            Lösenord
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            placeholder="••••••••"
            aria-invalid={!!state.error}
            aria-describedby={state.error ? 'sign-in-error' : undefined}
            className="w-full h-11 px-4 border border-[#e7e5e4] rounded-xl text-[#1a1a1a] placeholder:text-[#a8a29e] focus:outline-none focus:border-[#c45a3b]"
          />
        </div>

        <Button type="submit" className="w-full" loading={isPending}>
          Logga in
        </Button>
      </form>

      <p className="text-center text-sm text-[#78716c] mt-6">
        Inget konto?{' '}
        <a href={signUpLink} className="text-[#c45a3b] hover:underline">
          Skapa ett här
        </a>
      </p>
    </>
  )
}
