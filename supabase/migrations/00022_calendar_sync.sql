-- Calendar sync tables for Google Calendar integration

-- OAuth token storage per user-provider
CREATE TABLE IF NOT EXISTS calendar_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  provider text NOT NULL,
  encrypted_access_token text NOT NULL,
  encrypted_refresh_token text NOT NULL,
  token_expires_at timestamptz NOT NULL,
  provider_email text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, provider)
);

-- Which calendar each venue syncs to
CREATE TABLE IF NOT EXISTS venue_calendar_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid REFERENCES venues(id) ON DELETE CASCADE NOT NULL UNIQUE,
  connection_id uuid REFERENCES calendar_connections(id) ON DELETE CASCADE NOT NULL,
  external_calendar_id text NOT NULL,
  sync_enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Maps Tryffle entities (bookings, blocked dates) to external calendar events
CREATE TABLE IF NOT EXISTS calendar_sync_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_calendar_mapping_id uuid REFERENCES venue_calendar_mappings(id) ON DELETE CASCADE NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  external_event_id text NOT NULL,
  last_synced_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(venue_calendar_mapping_id, entity_type, entity_id)
);

-- Enable RLS
ALTER TABLE calendar_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE venue_calendar_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_sync_events ENABLE ROW LEVEL SECURITY;

-- calendar_connections: users can CRUD own connections
CREATE POLICY "Users can manage own calendar connections" ON calendar_connections
  FOR ALL USING (user_id = auth.uid());

-- venue_calendar_mappings: venue owners can CRUD
CREATE POLICY "Venue owners can manage calendar mappings" ON venue_calendar_mappings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM venues
      WHERE id = venue_id AND owner_id = auth.uid()
    )
  );

-- calendar_sync_events: venue owners can view/insert/delete via venue ownership chain
CREATE POLICY "Venue owners can select sync events" ON calendar_sync_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM venue_calendar_mappings vcm
      JOIN venues v ON v.id = vcm.venue_id
      WHERE vcm.id = venue_calendar_mapping_id AND v.owner_id = auth.uid()
    )
  );

CREATE POLICY "Venue owners can insert sync events" ON calendar_sync_events
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM venue_calendar_mappings vcm
      JOIN venues v ON v.id = vcm.venue_id
      WHERE vcm.id = venue_calendar_mapping_id AND v.owner_id = auth.uid()
    )
  );

CREATE POLICY "Venue owners can delete sync events" ON calendar_sync_events
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM venue_calendar_mappings vcm
      JOIN venues v ON v.id = vcm.venue_id
      WHERE vcm.id = venue_calendar_mapping_id AND v.owner_id = auth.uid()
    )
  );

-- Indexes
CREATE INDEX idx_calendar_connections_user ON calendar_connections(user_id);
CREATE INDEX idx_venue_calendar_mappings_connection ON venue_calendar_mappings(connection_id);
CREATE INDEX idx_calendar_sync_events_mapping ON calendar_sync_events(venue_calendar_mapping_id);
CREATE INDEX idx_calendar_sync_events_entity ON calendar_sync_events(entity_type, entity_id);

-- Trigger for updated_at on calendar_connections (uses function from 00009)
CREATE TRIGGER update_calendar_connections_updated_at
  BEFORE UPDATE ON calendar_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
