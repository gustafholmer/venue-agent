-- Add verification token to booking_requests for secure public access
ALTER TABLE booking_requests
ADD COLUMN IF NOT EXISTS verification_token text;

-- Index for efficient token lookups
CREATE INDEX IF NOT EXISTS idx_booking_verification_token
ON booking_requests(verification_token)
WHERE verification_token IS NOT NULL;

-- Add comment explaining the column
COMMENT ON COLUMN booking_requests.verification_token IS
'Token for secure public access to booking confirmation without auth';
