import { createClient } from '@supabase/supabase-js'
import { clientEnv, serverEnv } from '@/lib/env'

export function createServiceClient() {
  return createClient(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    serverEnv.SUPABASE_SERVICE_ROLE_KEY
  )
}
