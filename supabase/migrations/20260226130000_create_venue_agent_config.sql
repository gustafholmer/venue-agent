-- Agent configuration per venue
CREATE TABLE IF NOT EXISTS venue_agent_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  pricing_rules jsonb NOT NULL DEFAULT '{}',
  booking_params jsonb NOT NULL DEFAULT '{}',
  event_types jsonb NOT NULL DEFAULT '{}',
  policies jsonb NOT NULL DEFAULT '{}',
  faq_entries jsonb NOT NULL DEFAULT '[]',
  agent_language text NOT NULL DEFAULT 'sv' CHECK (agent_language IN ('sv', 'en')),
  agent_enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT venue_agent_config_venue_unique UNIQUE (venue_id)
);

CREATE INDEX idx_venue_agent_config_venue_id ON venue_agent_config(venue_id);
CREATE INDEX idx_venue_agent_config_enabled ON venue_agent_config(venue_id) WHERE agent_enabled = true;

ALTER TABLE venue_agent_config ENABLE ROW LEVEL SECURITY;

-- Venue owners can manage their own config
CREATE POLICY "Venue owners can view own config"
  ON venue_agent_config FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM venues WHERE venues.id = venue_agent_config.venue_id AND venues.owner_id = auth.uid()
  ));

CREATE POLICY "Venue owners can insert own config"
  ON venue_agent_config FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM venues WHERE venues.id = venue_agent_config.venue_id AND venues.owner_id = auth.uid()
  ));

CREATE POLICY "Venue owners can update own config"
  ON venue_agent_config FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM venues WHERE venues.id = venue_agent_config.venue_id AND venues.owner_id = auth.uid()
  ));

-- Public can read config for published venues with agent enabled (needed for chat widget)
CREATE POLICY "Public can read enabled agent config"
  ON venue_agent_config FOR SELECT
  USING (
    agent_enabled = true AND EXISTS (
      SELECT 1 FROM venues WHERE venues.id = venue_agent_config.venue_id AND venues.status = 'published'
    )
  );

-- Trigger for updated_at
CREATE TRIGGER update_venue_agent_config_updated_at
  BEFORE UPDATE ON venue_agent_config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
