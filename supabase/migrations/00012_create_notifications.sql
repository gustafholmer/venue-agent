-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type notification_type NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  entity_type entity_type NOT NULL,
  entity_id text NOT NULL,
  is_read boolean DEFAULT false,
  read_at timestamptz,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

-- Notification preferences
CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  email_booking_request boolean DEFAULT true,
  email_booking_accepted boolean DEFAULT true,
  email_new_message boolean DEFAULT true,
  email_new_match boolean DEFAULT true,
  email_reminders boolean DEFAULT true,
  email_review_request boolean DEFAULT true,
  updated_at timestamptz DEFAULT now()
);

-- Saved venues (favorites)
CREATE TABLE IF NOT EXISTS saved_venues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  venue_id uuid REFERENCES venues(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(customer_id, venue_id)
);

-- Shared lists
CREATE TABLE IF NOT EXISTS shared_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  share_token text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  creator_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  creator_email text,
  title text,
  venue_ids uuid[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '30 days')
);

-- Reviews
CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_request_id uuid REFERENCES booking_requests(id) ON DELETE CASCADE NOT NULL UNIQUE,
  venue_id uuid REFERENCES venues(id) ON DELETE CASCADE NOT NULL,
  customer_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  rating int NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text text,
  venue_response text,
  created_at timestamptz DEFAULT now()
);

-- Agent sessions
CREATE TABLE IF NOT EXISTS agent_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  state text NOT NULL DEFAULT 'idle',
  requirements jsonb DEFAULT '{}',
  matched_venues jsonb,
  messages jsonb[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '24 hours')
);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_sessions ENABLE ROW LEVEL SECURITY;

-- Notifications: users see own
CREATE POLICY "Users can read own notifications" ON notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Service role can insert notifications" ON notifications
  FOR INSERT WITH CHECK (true);

-- Notification preferences
CREATE POLICY "Users can manage own notification preferences" ON notification_preferences
  FOR ALL USING (user_id = auth.uid());

-- Saved venues
CREATE POLICY "Users can manage own saved venues" ON saved_venues
  FOR ALL USING (customer_id = auth.uid());

-- Shared lists: public read by token, creator can manage
CREATE POLICY "Anyone can read shared lists" ON shared_lists
  FOR SELECT USING (true);

CREATE POLICY "Creators can manage own shared lists" ON shared_lists
  FOR ALL USING (creator_id = auth.uid());

-- Reviews: public read, customers can insert for their bookings
CREATE POLICY "Anyone can read reviews" ON reviews
  FOR SELECT USING (true);

CREATE POLICY "Customers can insert reviews for their bookings" ON reviews
  FOR INSERT WITH CHECK (
    customer_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM booking_requests
      WHERE id = booking_request_id AND customer_id = auth.uid()
    )
  );

CREATE POLICY "Venue owners can respond to reviews" ON reviews
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM venues WHERE id = venue_id AND owner_id = auth.uid()
    )
  );

-- Agent sessions
CREATE POLICY "Users can manage own agent sessions" ON agent_sessions
  FOR ALL USING (customer_id = auth.uid());

-- Indexes
CREATE INDEX idx_notification_user_id ON notifications(user_id);
CREATE INDEX idx_notification_user_unread ON notifications(user_id, is_read)
  WHERE is_read = false;
CREATE INDEX idx_notification_created_at ON notifications(created_at DESC);
CREATE INDEX idx_saved_venues_customer ON saved_venues(customer_id);
CREATE INDEX idx_saved_venues_venue ON saved_venues(venue_id);
CREATE INDEX idx_shared_lists_creator ON shared_lists(creator_id);
CREATE INDEX idx_reviews_venue ON reviews(venue_id);
CREATE INDEX idx_reviews_customer ON reviews(customer_id);
CREATE INDEX idx_reviews_booking ON reviews(booking_request_id);
CREATE INDEX idx_reviews_rating ON reviews(venue_id, rating);
CREATE INDEX idx_agent_sessions_customer ON agent_sessions(customer_id);
CREATE INDEX idx_agent_sessions_expires ON agent_sessions(expires_at);

-- Trigger for updated_at on agent_sessions (uses function from 00009)
CREATE TRIGGER update_agent_sessions_updated_at
  BEFORE UPDATE ON agent_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for updated_at on notification_preferences (uses function from 00009)
CREATE TRIGGER update_notification_preferences_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
