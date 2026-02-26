-- Action cards for venue owner action feed
CREATE TABLE IF NOT EXISTS agent_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL REFERENCES agent_conversations(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  action_type text NOT NULL CHECK (action_type IN ('booking_approval', 'escalation', 'counter_offer')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'declined', 'modified', 'expired')),
  summary jsonb NOT NULL DEFAULT '{}',
  owner_response jsonb,
  booking_request_id uuid REFERENCES booking_requests(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

CREATE INDEX idx_agent_actions_venue_id ON agent_actions(venue_id);
CREATE INDEX idx_agent_actions_conversation_id ON agent_actions(conversation_id);
CREATE INDEX idx_agent_actions_status ON agent_actions(venue_id, status) WHERE status = 'pending';
CREATE INDEX idx_agent_actions_created_at ON agent_actions(created_at DESC);

ALTER TABLE agent_actions ENABLE ROW LEVEL SECURITY;

-- Venue owners can view and update actions for their venues
CREATE POLICY "Venue owners can view own actions"
  ON agent_actions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM venues WHERE venues.id = agent_actions.venue_id AND venues.owner_id = auth.uid()
  ));

CREATE POLICY "Venue owners can update own actions"
  ON agent_actions FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM venues WHERE venues.id = agent_actions.venue_id AND venues.owner_id = auth.uid()
  ));

-- Customers can view their own actions (for counter-offers)
CREATE POLICY "Customers can view own actions"
  ON agent_actions FOR SELECT
  USING (customer_id = auth.uid());

-- Add new notification types
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'agent_booking_approval';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'agent_escalation';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'agent_counter_offer';

-- Add 'agent_action' entity type for notification routing
ALTER TYPE entity_type ADD VALUE IF NOT EXISTS 'agent_action';

CREATE TRIGGER update_agent_actions_updated_at
  BEFORE UPDATE ON agent_actions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
