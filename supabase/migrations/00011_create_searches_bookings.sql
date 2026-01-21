-- Searches table
CREATE TABLE IF NOT EXISTS searches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES profiles(id) ON DELETE SET NULL,

  event_type text,
  guest_count int CHECK (guest_count IS NULL OR guest_count >= 1),
  areas text[] DEFAULT '{}',
  budget_min int,
  budget_max int,
  preferred_date date,
  preferred_time text,
  requirements text[] DEFAULT '{}',
  vibe_description text,

  raw_input text,

  contact_email text,
  contact_name text,

  notify_new_matches boolean DEFAULT false,
  notify_until date,
  last_notified_at timestamptz,

  search_embedding vector(768),

  created_at timestamptz DEFAULT now()
);

-- Booking requests
CREATE TABLE IF NOT EXISTS booking_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  venue_id uuid REFERENCES venues(id) ON DELETE CASCADE NOT NULL,
  customer_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  search_id uuid REFERENCES searches(id) ON DELETE SET NULL,

  event_type text,
  event_description text,
  guest_count int CHECK (guest_count IS NULL OR guest_count >= 1),
  event_date date NOT NULL,
  start_time time,
  end_time time,

  customer_name text NOT NULL,
  customer_email text NOT NULL,
  customer_phone text,
  company_name text,

  status booking_status DEFAULT 'pending',

  base_price int NOT NULL CHECK (base_price >= 0),
  platform_fee int NOT NULL CHECK (platform_fee >= 0),
  total_price int NOT NULL CHECK (total_price >= 0),
  venue_payout int NOT NULL CHECK (venue_payout >= 0),

  stripe_payment_intent_id text,
  stripe_payment_status text,

  created_at timestamptz DEFAULT now(),
  responded_at timestamptz,
  captured_at timestamptz,
  refunded_at timestamptz,

  decline_reason text,
  refund_amount int,
  updated_at timestamptz DEFAULT now(),

  CONSTRAINT valid_time_range CHECK (
    (start_time IS NULL AND end_time IS NULL) OR
    (start_time IS NOT NULL AND end_time IS NOT NULL AND start_time < end_time)
  ),
  CONSTRAINT valid_refund CHECK (refund_amount IS NULL OR refund_amount <= total_price)
);

-- Messages
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_request_id uuid REFERENCES booking_requests(id) ON DELETE CASCADE NOT NULL,
  sender_id uuid REFERENCES profiles(id) ON DELETE SET NULL NOT NULL,
  content text NOT NULL,
  is_read boolean DEFAULT false,
  read_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Searches: users can see own
CREATE POLICY "Users can read own searches" ON searches
  FOR SELECT USING (customer_id = auth.uid());

CREATE POLICY "Users can insert searches" ON searches
  FOR INSERT WITH CHECK (customer_id = auth.uid() OR customer_id IS NULL);

-- Booking requests: customers see own, venue owners see for their venues
CREATE POLICY "Customers can read own bookings" ON booking_requests
  FOR SELECT USING (customer_id = auth.uid());

CREATE POLICY "Venue owners can read bookings for their venues" ON booking_requests
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM venues WHERE id = venue_id AND owner_id = auth.uid())
  );

CREATE POLICY "Customers can insert bookings" ON booking_requests
  FOR INSERT WITH CHECK (customer_id = auth.uid() OR customer_id IS NULL);

CREATE POLICY "Venue owners can update bookings for their venues" ON booking_requests
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM venues WHERE id = venue_id AND owner_id = auth.uid())
  );

-- Messages: participants can read/write
CREATE POLICY "Booking participants can read messages" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM booking_requests br
      WHERE br.id = booking_request_id
      AND (br.customer_id = auth.uid() OR EXISTS (
        SELECT 1 FROM venues WHERE id = br.venue_id AND owner_id = auth.uid()
      ))
    )
  );

CREATE POLICY "Booking participants can send messages" ON messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM booking_requests br
      WHERE br.id = booking_request_id
      AND (br.customer_id = auth.uid() OR EXISTS (
        SELECT 1 FROM venues WHERE id = br.venue_id AND owner_id = auth.uid()
      ))
    )
  );

-- Indexes
CREATE INDEX idx_searches_customer ON searches(customer_id);
CREATE INDEX idx_searches_notify ON searches(notify_new_matches, notify_until)
  WHERE notify_new_matches = true;
CREATE INDEX idx_booking_venue ON booking_requests(venue_id);
CREATE INDEX idx_booking_customer ON booking_requests(customer_id);
CREATE INDEX idx_booking_status ON booking_requests(status);
CREATE INDEX idx_booking_date ON booking_requests(event_date);
CREATE INDEX idx_messages_booking ON messages(booking_request_id);
CREATE INDEX idx_messages_unread ON messages(booking_request_id, is_read)
  WHERE is_read = false;

-- Vector index for semantic search
CREATE INDEX idx_searches_embedding ON searches
  USING ivfflat (search_embedding vector_cosine_ops)
  WITH (lists = 100)
  WHERE search_embedding IS NOT NULL;

-- Triggers for updated_at columns (uses function from 00009)
CREATE TRIGGER update_booking_requests_updated_at
  BEFORE UPDATE ON booking_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_messages_updated_at
  BEFORE UPDATE ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
