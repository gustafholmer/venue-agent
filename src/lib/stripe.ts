import Stripe from 'stripe'
import { serverEnv } from '@/lib/env'

export function getStripe() {
  return new Stripe(serverEnv.STRIPE_SECRET_KEY, {
    apiVersion: '2026-01-28.clover',
  })
}
