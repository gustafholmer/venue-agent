'use server'

import { logger } from '@/lib/logger'

import Stripe from 'stripe'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { getStripe } from '@/lib/stripe'
import { rateLimit, RATE_LIMITS, RATE_LIMIT_ERROR } from '@/lib/rate-limit'
import { connectAccountSchema } from '@/lib/validation/schemas'

export interface CreateConnectAccountInput {
  companyName: string
  orgNumber: string
  phone: string
  addressLine1: string
  city: string
  postalCode: string
  repFirstName: string
  repLastName: string
  repDobDay: number
  repDobMonth: number
  repDobYear: number
  iban: string
  accountHolderName: string
}

type Result =
  | { success: true }
  | { success: false; error: string }

export async function createConnectAccount(
  input: CreateConnectAccountInput
): Promise<Result> {
  try {
    // Check rate limit
    const rateLimitResult = await rateLimit('create-connect-account', RATE_LIMITS.createConnectAccount)
    if (!rateLimitResult.success) {
      return { success: false, error: RATE_LIMIT_ERROR }
    }

    // Validate input
    const parsed = connectAccountSchema.safeParse(input)
    if (!parsed.success) {
      return { success: false, error: 'Ogiltiga uppgifter' }
    }
    const validInput = parsed.data

    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: 'Ej inloggad' }
    }

    // Check if user already has a connected account
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_account_id')
      .eq('id', user.id)
      .single()

    if (profile?.stripe_account_id) {
      return { success: false, error: 'Du har redan ett anslutet konto' }
    }

    // Get client IP for ToS acceptance
    const headersList = await headers()
    const ip =
      headersList.get('x-forwarded-for')?.split(',')[0] ||
      headersList.get('x-real-ip') ||
      'unknown'

    const stripe = getStripe()

    // Create Custom connected account
    const account = await stripe.accounts.create({
      type: 'custom',
      country: 'SE',
      email: user.email,
      business_type: 'company',
      company: {
        name: validInput.companyName,
        tax_id: validInput.orgNumber,
        phone: validInput.phone,
        address: {
          line1: validInput.addressLine1,
          city: validInput.city,
          postal_code: validInput.postalCode,
          country: 'SE',
        },
        owners_provided: true,
        directors_provided: true,
        executives_provided: true,
      },
      external_account: {
        object: 'bank_account',
        country: 'SE',
        currency: 'sek',
        account_holder_name: validInput.accountHolderName,
        account_holder_type: 'company',
        account_number: validInput.iban,
      },
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      tos_acceptance: {
        date: Math.floor(Date.now() / 1000),
        ip,
      },
      business_profile: {
        mcc: '7922',
      },
    })

    // Add representative
    await stripe.accounts.createPerson(account.id, {
      first_name: validInput.repFirstName,
      last_name: validInput.repLastName,
      email: user.email,
      phone: validInput.phone,
      dob: {
        day: validInput.repDobDay,
        month: validInput.repDobMonth,
        year: validInput.repDobYear,
      },
      address: {
        line1: validInput.addressLine1,
        city: validInput.city,
        postal_code: validInput.postalCode,
        country: 'SE',
      },
      relationship: {
        representative: true,
        executive: true,
        owner: true,
        director: true,
        percent_ownership: 100,
        title: 'VD',
      },
    })

    // Update profile with Stripe account info
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        stripe_account_id: account.id,
        stripe_account_status: 'pending',
      })
      .eq('id', user.id)

    if (updateError) {
      // Rollback: delete the Stripe account if DB update fails
      await stripe.accounts.del(account.id).catch((deleteError) => {
        logger.error('Failed to rollback Stripe account', { deleteError })
      })
      return { success: false, error: 'Kunde inte spara kontoinformation' }
    }

    return { success: true }
  } catch (error) {
    logger.error('Error creating Connect account', { error })

    if (error instanceof Stripe.errors.StripeError) {
      return { success: false, error: error.message }
    }

    return { success: false, error: 'Ett oväntat fel uppstod' }
  }
}
