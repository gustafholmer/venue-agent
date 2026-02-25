-- Create booking_modifications table
CREATE TABLE IF NOT EXISTS booking_modifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_request_id UUID NOT NULL REFERENCES booking_requests(id) ON DELETE CASCADE,
  proposed_by UUID NOT NULL REFERENCES profiles(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  proposed_event_date DATE,
  proposed_start_time TIME,
  proposed_end_time TIME,
  proposed_guest_count INTEGER,
  proposed_base_price NUMERIC,
  proposed_platform_fee NUMERIC,
  proposed_total_price NUMERIC,
  proposed_venue_payout NUMERIC,
  reason TEXT,
  responded_at TIMESTAMPTZ,
  decline_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- One pending modification per booking
CREATE UNIQUE INDEX idx_one_pending_modification_per_booking
  ON booking_modifications (booking_request_id)
  WHERE status = 'pending';

-- Index for querying modifications by booking
CREATE INDEX idx_booking_modifications_booking_id
  ON booking_modifications (booking_request_id);

-- Enable RLS
ALTER TABLE booking_modifications ENABLE ROW LEVEL SECURITY;

-- RLS: Users can read modifications for bookings they're a party to
CREATE POLICY "Users can view modifications for their bookings"
  ON booking_modifications FOR SELECT
  USING (
    proposed_by = auth.uid()
    OR booking_request_id IN (
      SELECT br.id FROM booking_requests br
      JOIN venues v ON br.venue_id = v.id
      WHERE br.customer_id = auth.uid() OR v.owner_id = auth.uid()
    )
  );

-- RLS: Users can insert modifications for bookings they're a party to
CREATE POLICY "Users can propose modifications for their bookings"
  ON booking_modifications FOR INSERT
  WITH CHECK (
    proposed_by = auth.uid()
    AND booking_request_id IN (
      SELECT br.id FROM booking_requests br
      JOIN venues v ON br.venue_id = v.id
      WHERE br.customer_id = auth.uid() OR v.owner_id = auth.uid()
    )
  );

-- RLS: Users can update modifications they're authorized to respond to
CREATE POLICY "Users can respond to modifications"
  ON booking_modifications FOR UPDATE
  USING (
    proposed_by != auth.uid()
    AND booking_request_id IN (
      SELECT br.id FROM booking_requests br
      JOIN venues v ON br.venue_id = v.id
      WHERE br.customer_id = auth.uid() OR v.owner_id = auth.uid()
    )
  );

-- RLS: Proposers can delete their own pending modifications
CREATE POLICY "Proposers can cancel their modifications"
  ON booking_modifications FOR DELETE
  USING (
    proposed_by = auth.uid()
    AND status = 'pending'
  );

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_booking_modifications_updated_at
  BEFORE UPDATE ON booking_modifications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
