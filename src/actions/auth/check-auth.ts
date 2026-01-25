'use server'

import { createClient } from '@/lib/supabase/server'

export async function checkAuth(): Promise<{
  isAuthenticated: boolean
  userId?: string
  email?: string
}> {
  const supabase = await createClient()

  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return { isAuthenticated: false }
  }

  return {
    isAuthenticated: true,
    userId: user.id,
    email: user.email,
  }
}
