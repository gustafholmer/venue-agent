'use server'

import { createClient } from '@/lib/supabase/server'

export interface ConnectStatus {
  stripeAccountId: string | null
  stripeAccountStatus: string | null
  companyName: string | null
  orgNumber: string | null
  phone: string | null
}

export async function getConnectStatus(): Promise<ConnectStatus | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('profiles')
    .select(
      'stripe_account_id, stripe_account_status, company_name, org_number, phone'
    )
    .eq('id', user.id)
    .single()

  if (!data) return null

  return {
    stripeAccountId: data.stripe_account_id,
    stripeAccountStatus: data.stripe_account_status,
    companyName: data.company_name,
    orgNumber: data.org_number,
    phone: data.phone,
  }
}
