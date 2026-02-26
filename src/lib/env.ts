import { z } from 'zod'

// Check demo mode without importing from demo-mode.ts (avoid circular deps)
const isDemo =
  !process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL === 'your_supabase_url'

// --- Client env (NEXT_PUBLIC_* vars) ---

const clientSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().min(1),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
})

const demoClientSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().optional().default(''),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional().default(''),
})

// --- Server env ---

const serverSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  STRIPE_SECRET_KEY: z.string().min(1),
  STRIPE_WEBHOOK_SECRET: z.string().min(1),
  GEMINI_API_KEY: z.string().optional().default(''),
  CALENDAR_ENCRYPTION_KEY: z.string().optional().default(''),
  CRON_SECRET: z.string().min(1),
})

const demoServerSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional().default(''),
  STRIPE_SECRET_KEY: z.string().optional().default(''),
  STRIPE_WEBHOOK_SECRET: z.string().optional().default(''),
  GEMINI_API_KEY: z.string().optional().default(''),
  CALENDAR_ENCRYPTION_KEY: z.string().optional().default(''),
  CRON_SECRET: z.string().optional().default(''),
})

// --- Types ---

type ClientEnv = z.infer<typeof clientSchema>
type ServerEnv = z.infer<typeof serverSchema>

// --- Lazy initialization ---

let _clientEnv: ClientEnv | null = null
let _serverEnv: ServerEnv | null = null

function getClientEnv(): ClientEnv {
  if (_clientEnv) return _clientEnv

  const schema = isDemo ? demoClientSchema : clientSchema
  const result = schema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  })

  if (!result.success) {
    console.error(
      'Saknade klient-miljövariabler:',
      result.error.flatten().fieldErrors
    )
    throw new Error(
      'Saknade klient-miljövariabler. Se .env.example för nödvändiga variabler.'
    )
  }

  _clientEnv = result.data as ClientEnv
  return _clientEnv
}

function getServerEnv(): ServerEnv {
  if (_serverEnv) return _serverEnv

  const schema = isDemo ? demoServerSchema : serverSchema
  const result = schema.safeParse({
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    CALENDAR_ENCRYPTION_KEY: process.env.CALENDAR_ENCRYPTION_KEY,
    CRON_SECRET: process.env.CRON_SECRET,
  })

  if (!result.success) {
    console.error(
      'Saknade server-miljövariabler:',
      result.error.flatten().fieldErrors
    )
    throw new Error(
      'Saknade server-miljövariabler. Se .env.example för nödvändiga variabler.'
    )
  }

  _serverEnv = result.data as ServerEnv
  return _serverEnv
}

// --- Exports (lazy proxies) ---

export const clientEnv = new Proxy({} as ClientEnv, {
  get(_, prop: string) {
    return getClientEnv()[prop as keyof ClientEnv]
  },
})

export const serverEnv = new Proxy({} as ServerEnv, {
  get(_, prop: string) {
    return getServerEnv()[prop as keyof ServerEnv]
  },
})
