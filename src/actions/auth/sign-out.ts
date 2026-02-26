'use server'

import { logger } from '@/lib/logger'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { isRedirectError } from 'next/dist/client/components/redirect-error'

export async function signOut() {
  try {
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/')
  } catch (error) {
    if (isRedirectError(error)) throw error
    logger.error('Sign out error', { error })
    throw error
  }
}
