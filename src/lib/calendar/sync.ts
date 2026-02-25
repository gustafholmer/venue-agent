import { createClient as createServiceClient } from '@supabase/supabase-js'
import { getCalendarProvider } from './index'
import { getValidAccessToken } from './token-manager'
import type { SyncOptions, SyncResult } from './types'

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('Missing Supabase service role configuration')
  }
  return createServiceClient(url, key)
}

/**
 * Sync a Tryffle entity (blocked date or booking) to Google Calendar.
 * Never throws — returns { synced: false } on any failure.
 * Returns { synced: true } on success or if no calendar is configured.
 */
export async function syncToCalendar(
  venueId: string,
  options: SyncOptions
): Promise<SyncResult> {
  try {
    const supabase = getServiceClient()

    // Check if this venue has a calendar mapping
    const { data: mapping } = await supabase
      .from('venue_calendar_mappings')
      .select('id, connection_id, external_calendar_id, sync_enabled')
      .eq('venue_id', venueId)
      .single()

    // No mapping or sync disabled — nothing to do, not a failure
    if (!mapping || !mapping.sync_enabled) {
      return { synced: true }
    }

    // Get a valid access token
    const tokenResult = await getValidAccessToken(mapping.connection_id)
    if (!tokenResult) {
      console.error(`Calendar sync failed: could not get access token for venue ${venueId}`)
      return { synced: false, calendarSyncFailed: true }
    }

    const provider = getCalendarProvider(tokenResult.provider)

    if (options.action === 'create') {
      if (!options.event) {
        console.error('Calendar sync: create action requires an event')
        return { synced: false, calendarSyncFailed: true }
      }

      const externalEventId = await provider.createEvent(
        tokenResult.accessToken,
        mapping.external_calendar_id,
        options.event
      )

      // Record the sync
      await supabase.from('calendar_sync_events').upsert(
        {
          venue_calendar_mapping_id: mapping.id,
          entity_type: options.entityType,
          entity_id: options.entityId,
          external_event_id: externalEventId,
          last_synced_at: new Date().toISOString(),
        },
        { onConflict: 'venue_calendar_mapping_id,entity_type,entity_id' }
      )

      return { synced: true }
    }

    if (options.action === 'delete') {
      // Look up the external event ID
      const { data: syncEvent } = await supabase
        .from('calendar_sync_events')
        .select('id, external_event_id')
        .eq('venue_calendar_mapping_id', mapping.id)
        .eq('entity_type', options.entityType)
        .eq('entity_id', options.entityId)
        .single()

      if (!syncEvent) {
        // Nothing to delete — event was never synced
        return { synced: true }
      }

      await provider.deleteEvent(
        tokenResult.accessToken,
        mapping.external_calendar_id,
        syncEvent.external_event_id
      )

      // Remove the sync record
      await supabase
        .from('calendar_sync_events')
        .delete()
        .eq('id', syncEvent.id)

      return { synced: true }
    }

    return { synced: true }
  } catch (err) {
    console.error('Calendar sync error:', err)
    return { synced: false, calendarSyncFailed: true }
  }
}
