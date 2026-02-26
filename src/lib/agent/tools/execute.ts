import type { SupabaseClient } from '@supabase/supabase-js'
import type { VenueAgentConfig, PricingRules } from '@/types/agent-booking'
import { checkAvailability } from './check-availability'
import { calculatePrice } from './calculate-price'
import { getVenueInfo } from './get-venue-info'
import { proposeBooking } from './propose-booking'
import { escalateToOwner } from './escalate-to-owner'
import { searchOtherVenues } from './search-other-venues'

export interface ToolContext {
  venueId: string
  conversationId: string
  customerId?: string
  serviceClient: SupabaseClient
  venue: Record<string, unknown>
  config: VenueAgentConfig
}

/**
 * Execute an agent tool by name with the given arguments and context.
 * Returns the result as a plain object. Catches errors and returns { error: message }.
 */
export async function executeAgentTool(
  name: string,
  args: Record<string, unknown>,
  context: ToolContext
): Promise<Record<string, unknown>> {
  try {
    switch (name) {
      case 'check_availability': {
        const result = await checkAvailability(
          {
            date: args.date as string,
            startTime: args.startTime as string | undefined,
            endTime: args.endTime as string | undefined,
          },
          context.venueId,
          context.serviceClient
        )
        return result as unknown as Record<string, unknown>
      }

      case 'calculate_price': {
        const pricingRules = (context.config.pricing_rules as PricingRules) || null
        const venuePricing = {
          price_per_hour: context.venue.price_per_hour as number | null,
          price_half_day: context.venue.price_half_day as number | null,
          price_full_day: context.venue.price_full_day as number | null,
          price_evening: context.venue.price_evening as number | null,
        }
        const result = calculatePrice(
          {
            guestCount: args.guestCount as number,
            durationHours: args.durationHours as number,
            eventType: args.eventType as string,
            packageName: args.packageName as string | undefined,
          },
          pricingRules,
          venuePricing
        )
        return result as unknown as Record<string, unknown>
      }

      case 'get_venue_info': {
        const result = getVenueInfo(
          { topic: args.topic as string },
          context.venue,
          context.config
        )
        return result as unknown as Record<string, unknown>
      }

      case 'propose_booking': {
        const result = await proposeBooking(
          {
            date: args.date as string,
            startTime: args.startTime as string,
            endTime: args.endTime as string,
            guestCount: args.guestCount as number,
            eventType: args.eventType as string,
            price: args.price as number,
            extras: args.extras as string[] | undefined,
            customerNote: args.customerNote as string | undefined,
          },
          {
            venueId: context.venueId,
            conversationId: context.conversationId,
            customerId: context.customerId,
          },
          context.venue,
          context.serviceClient
        )
        return result as unknown as Record<string, unknown>
      }

      case 'escalate_to_owner': {
        const result = await escalateToOwner(
          {
            reason: args.reason as string,
            customerRequest: args.customerRequest as string,
            context: args.context as Record<string, unknown> | undefined,
          },
          {
            venueId: context.venueId,
            conversationId: context.conversationId,
            customerId: context.customerId,
          },
          context.venue,
          context.serviceClient
        )
        return result as unknown as Record<string, unknown>
      }

      case 'search_other_venues': {
        const result = await searchOtherVenues(
          { requirements: args.requirements as string },
          context.venueId
        )
        return result as unknown as Record<string, unknown>
      }

      default:
        return { error: `Unknown tool: ${name}` }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred'
    console.error(`Error executing tool ${name}:`, error)
    return { error: message }
  }
}
