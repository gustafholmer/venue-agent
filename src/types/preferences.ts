import { z } from 'zod'

export const ParsedFiltersSchema = z.object({
  event_type: z.string().nullable(),
  guest_count: z.number().nullable(),
  areas: z.array(z.string()).nullable(),
  budget_min: z.number().nullable(),
  budget_max: z.number().nullable(),
  preferred_dates: z.array(z.string()).nullable(), // ISO date strings
  preferred_time: z.enum(['morning', 'afternoon', 'evening']).nullable(),
  requirements: z.array(z.string()).nullable(),
})

export type ParsedFilters = z.infer<typeof ParsedFiltersSchema>

export interface ParsedPreferences {
  filters: ParsedFilters
  vibe_description: string
  flexible_dates: boolean
}
