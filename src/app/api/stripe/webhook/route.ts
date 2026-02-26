import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { createServiceClient } from '@/lib/supabase/service'
import { serverEnv } from '@/lib/env'

export async function POST(request: NextRequest) {
  const stripe = getStripe()
  const body = await request.text()
  const sig = request.headers.get('stripe-signature')

  if (!sig) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  let event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      serverEnv.STRIPE_WEBHOOK_SECRET
    )
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type === 'account.updated') {
    const account = event.data.object

    let status: string
    if (account.charges_enabled && account.payouts_enabled) {
      status = 'verified'
    } else if (account.requirements?.disabled_reason) {
      status = 'restricted'
    } else {
      status = 'pending'
    }

    const supabase = createServiceClient()
    const { error } = await supabase
      .from('profiles')
      .update({ stripe_account_status: status })
      .eq('stripe_account_id', account.id)

    if (error) {
      console.error('Failed to update account status:', error)
    }
  }

  return NextResponse.json({ received: true })
}
