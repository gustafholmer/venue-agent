-- Agent conversation sessions (per-venue, persistent)
CREATE TABLE IF NOT EXISTS agent_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'waiting_for_owner', 'completed', 'expired')),
  messages jsonb NOT NULL DEFAULT '[]',
  collected_booking_data jsonb NOT NULL DEFAULT '{}',
  tier smallint CHECK (tier IS NULL OR tier IN (1, 2, 3)),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_agent_conversations_venue_id ON agent_conversations(venue_id);
CREATE INDEX idx_agent_conversations_customer_id ON agent_conversations(customer_id);
CREATE INDEX idx_agent_conversations_status ON agent_conversations(status) WHERE status = 'active';
CREATE INDEX idx_agent_conversations_expires_at ON agent_conversations(expires_at);

ALTER TABLE agent_conversations ENABLE ROW LEVEL SECURITY;

-- Customers can view their own conversations
CREATE POLICY "Customers can view own conversations"
  ON agent_conversations FOR SELECT
  USING (customer_id = auth.uid());

-- Customers can insert conversations
CREATE POLICY "Customers can create conversations"
  ON agent_conversations FOR INSERT
  WITH CHECK (customer_id = auth.uid() OR customer_id IS NULL);

-- Venue owners can view conversations for their venues
CREATE POLICY "Venue owners can view venue conversations"
  ON agent_conversations FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM venues WHERE venues.id = agent_conversations.venue_id AND venues.owner_id = auth.uid()
  ));

CREATE TRIGGER update_agent_conversations_updated_at
  BEFORE UPDATE ON agent_conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
