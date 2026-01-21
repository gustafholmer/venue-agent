'use server'

import { createClient } from '@/lib/supabase/server'
import type { NotificationType, EntityType, Json } from '@/types/database'

type NotificationResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string }

interface NotificationPayload {
  recipient: string
  category: NotificationType
  headline: string
  body: string
  reference: {
    kind: EntityType
    id: string
  }
  author?: string
  extra?: Record<string, Json>
}

export async function dispatchNotification(
  payload: NotificationPayload
): Promise<NotificationResult<{ id: string }>> {
  const supabase = await createClient()

  const record = {
    user_id: payload.recipient,
    type: payload.category,
    title: payload.headline,
    message: payload.body,
    entity_type: payload.reference.kind,
    entity_id: payload.reference.id,
    created_by: payload.author ?? null,
    metadata: (payload.extra ?? null) as Json,
    is_read: false,
  }

  const { data, error } = await supabase
    .from('notifications')
    .insert(record)
    .select('id')
    .single()

  if (error) {
    return { ok: false, error: error.message }
  }

  return { ok: true, data: { id: data.id } }
}

export async function dispatchBulkNotifications(
  recipients: string[],
  notification: Omit<NotificationPayload, 'recipient'>
): Promise<NotificationResult<{ count: number }>> {
  if (recipients.length === 0) {
    return { ok: true, data: { count: 0 } }
  }

  const supabase = await createClient()

  const records = recipients.map((recipient) => ({
    user_id: recipient,
    type: notification.category,
    title: notification.headline,
    message: notification.body,
    entity_type: notification.reference.kind,
    entity_id: notification.reference.id,
    created_by: notification.author ?? null,
    metadata: (notification.extra ?? null) as Json,
    is_read: false,
  }))

  const { error } = await supabase.from('notifications').insert(records)

  if (error) {
    return { ok: false, error: error.message }
  }

  return { ok: true, data: { count: recipients.length } }
}
