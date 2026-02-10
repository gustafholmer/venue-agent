-- Drop review-related indexes
DROP INDEX IF EXISTS idx_reviews_venue;
DROP INDEX IF EXISTS idx_reviews_customer;
DROP INDEX IF EXISTS idx_reviews_booking;
DROP INDEX IF EXISTS idx_reviews_rating;

-- Drop review-related RLS policies
DROP POLICY IF EXISTS "Anyone can read reviews" ON reviews;
DROP POLICY IF EXISTS "Customers can insert reviews for their bookings" ON reviews;
DROP POLICY IF EXISTS "Venue owners can respond to reviews" ON reviews;

-- Drop reviews table
DROP TABLE IF EXISTS reviews;

-- Remove review_request from notification_type enum
-- PostgreSQL doesn't support DROP VALUE from enum, so we recreate it
ALTER TYPE notification_type RENAME TO notification_type_old;

CREATE TYPE notification_type AS ENUM (
  'booking_request',
  'booking_accepted',
  'booking_declined',
  'booking_cancelled',
  'new_message',
  'new_match',
  'payment_completed',
  'payout_sent'
);

ALTER TABLE notifications
  ALTER COLUMN type TYPE notification_type
  USING type::text::notification_type;

DROP TYPE notification_type_old;

-- Remove email_review_request column from notification_preferences
ALTER TABLE notification_preferences DROP COLUMN IF EXISTS email_review_request;
