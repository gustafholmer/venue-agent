import { createClient as createServiceClient } from '@supabase/supabase-js'
import { encrypt, decrypt } from './encryption'
import { getCalendarProvider } from './index'

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('Missing Supabase service role configuration')
  }
  return createServiceClient(url, key)
}

/**
 * Get a valid access token for a calendar connection.
 * If the token is expired, refreshes it and updates the DB.
 * Returns null if the connection doesn't exist or refresh fails.
 */
export async function getValidAccessToken(connectionId: string): Promise<{
  accessToken: string
  provider: string
  connectionId: string
} | null> {
  const supabase = getServiceClient()

  const { data: connection, error } = await supabase
    .from('calendar_connections')
    .select('*')
    .eq('id', connectionId)
    .single()

  if (error || !connection) {
    console.error('Failed to fetch calendar connection:', error)
    return null
  }

  const expiresAt = new Date(connection.token_expires_at)
  const now = new Date()
  // Refresh 5 minutes before expiry to avoid edge cases
  const needsRefresh = expiresAt.getTime() - now.getTime() < 5 * 60 * 1000

  if (!needsRefresh) {
    return {
      accessToken: decrypt(connection.encrypted_access_token),
      provider: connection.provider,
      connectionId: connection.id,
    }
  }

  // Refresh the token
  try {
    const provider = getCalendarProvider(connection.provider)
    const decryptedRefreshToken = decrypt(connection.encrypted_refresh_token)
    const newTokens = await provider.refreshToken(decryptedRefreshToken)

    // Update the stored tokens
    const { error: updateError } = await supabase
      .from('calendar_connections')
      .update({
        encrypted_access_token: encrypt(newTokens.accessToken),
        encrypted_refresh_token: encrypt(newTokens.refreshToken),
        token_expires_at: newTokens.expiresAt.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', connectionId)

    if (updateError) {
      console.error('Failed to update refreshed tokens:', updateError)
      return null
    }

    return {
      accessToken: newTokens.accessToken,
      provider: connection.provider,
      connectionId: connection.id,
    }
  } catch (err) {
    console.error('Failed to refresh calendar token:', err)
    return null
  }
}
