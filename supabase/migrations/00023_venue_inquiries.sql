-- Add new enum values
ALTER TYPE "notification_type" ADD VALUE IF NOT EXISTS 'new_inquiry';
ALTER TYPE "entity_type" ADD VALUE IF NOT EXISTS 'inquiry';

-- Inquiry status enum
CREATE TYPE "inquiry_status" AS ENUM ('open', 'closed', 'converted');

-- Create venue_inquiries table
CREATE TABLE IF NOT EXISTS venue_inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid REFERENCES venues(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  event_date date NOT NULL,
  event_type text NOT NULL,
  guest_count integer NOT NULL,
  message text NOT NULL,
  status inquiry_status DEFAULT 'open' NOT NULL,
  booking_request_id uuid REFERENCES booking_requests(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Alter messages table: make booking_request_id nullable, add venue_inquiry_id
ALTER TABLE messages ALTER COLUMN booking_request_id DROP NOT NULL;
ALTER TABLE messages ADD COLUMN venue_inquiry_id uuid REFERENCES venue_inquiries(id) ON DELETE CASCADE;

-- Check constraint: exactly one of booking_request_id or venue_inquiry_id must be set
ALTER TABLE messages ADD CONSTRAINT messages_thread_check
  CHECK (
    (booking_request_id IS NOT NULL AND venue_inquiry_id IS NULL) OR
    (booking_request_id IS NULL AND venue_inquiry_id IS NOT NULL)
  );

-- Indexes
CREATE INDEX idx_venue_inquiries_venue ON venue_inquiries(venue_id);
CREATE INDEX idx_venue_inquiries_user ON venue_inquiries(user_id);
CREATE INDEX idx_venue_inquiries_status ON venue_inquiries(venue_id, status);
CREATE INDEX idx_messages_inquiry ON messages(venue_inquiry_id);

-- Unique constraint: one open inquiry per user per venue
CREATE UNIQUE INDEX idx_unique_open_inquiry ON venue_inquiries(venue_id, user_id)
  WHERE status = 'open';

-- RLS
ALTER TABLE venue_inquiries ENABLE ROW LEVEL SECURITY;

-- Users can read their own inquiries
CREATE POLICY "Users can read own inquiries" ON venue_inquiries
  FOR SELECT USING (user_id = auth.uid());

-- Venue owners can read inquiries for their venue
CREATE POLICY "Venue owners can read venue inquiries" ON venue_inquiries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM venues WHERE id = venue_id AND owner_id = auth.uid()
    )
  );

-- Users can create inquiries
CREATE POLICY "Users can create inquiries" ON venue_inquiries
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Venue owners can update inquiry status (close)
CREATE POLICY "Venue owners can update inquiry status" ON venue_inquiries
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM venues WHERE id = venue_id AND owner_id = auth.uid()
    )
  );

-- Users can update their own inquiries (for conversion)
CREATE POLICY "Users can update own inquiries" ON venue_inquiries
  FOR UPDATE USING (user_id = auth.uid());

-- Update messages RLS to also cover inquiry threads
DROP POLICY IF EXISTS "Booking participants can read messages" ON messages;
CREATE POLICY "Thread participants can read messages" ON messages
  FOR SELECT USING (
    (
      booking_request_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM booking_requests br
        WHERE br.id = booking_request_id
        AND (br.customer_id = auth.uid() OR EXISTS (
          SELECT 1 FROM venues WHERE id = br.venue_id AND owner_id = auth.uid()
        ))
      )
    ) OR (
      venue_inquiry_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM venue_inquiries vi
        WHERE vi.id = venue_inquiry_id
        AND (vi.user_id = auth.uid() OR EXISTS (
          SELECT 1 FROM venues WHERE id = vi.venue_id AND owner_id = auth.uid()
        ))
      )
    )
  );

DROP POLICY IF EXISTS "Booking participants can send messages" ON messages;
CREATE POLICY "Thread participants can send messages" ON messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid() AND (
      (
        booking_request_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM booking_requests br
          WHERE br.id = booking_request_id
          AND (br.customer_id = auth.uid() OR EXISTS (
            SELECT 1 FROM venues WHERE id = br.venue_id AND owner_id = auth.uid()
          ))
        )
      ) OR (
        venue_inquiry_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM venue_inquiries vi
          WHERE vi.id = venue_inquiry_id
          AND (vi.user_id = auth.uid() OR EXISTS (
            SELECT 1 FROM venues WHERE id = vi.venue_id AND owner_id = auth.uid()
          ))
        )
      )
    )
  );
