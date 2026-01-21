-- User roles
CREATE TYPE "user_role" AS ENUM ('customer', 'venue_owner', 'admin');

-- Booking lifecycle
CREATE TYPE "booking_status" AS ENUM (
  'pending',
  'accepted',
  'declined',
  'cancelled',
  'completed',
  'paid_out'
);

-- Venue status
CREATE TYPE "venue_status" AS ENUM ('draft', 'published', 'paused');

-- Notification types
CREATE TYPE "notification_type" AS ENUM (
  'booking_request',
  'booking_accepted',
  'booking_declined',
  'booking_cancelled',
  'new_message',
  'new_match',
  'payment_completed',
  'payout_sent',
  'review_request'
);

-- Entity types for notifications
CREATE TYPE "entity_type" AS ENUM ('booking', 'venue', 'message', 'search');

-- Create profiles table (replaces users + maklare)
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email text NOT NULL UNIQUE,
  full_name text,
  phone text,
  user_type user_role NOT NULL DEFAULT 'customer',
  company_name text,
  org_number text,
  stripe_account_id text,
  stripe_account_status text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can read own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Service role can insert (for trigger)
CREATE POLICY "Service role can insert profiles" ON profiles
  FOR INSERT WITH CHECK (true);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, user_type)
  VALUES (new.id, new.email, 'customer');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if exists, then create
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Index
CREATE INDEX idx_profiles_user_type ON profiles(user_type);
CREATE INDEX idx_profiles_stripe_account ON profiles(stripe_account_id) WHERE stripe_account_id IS NOT NULL;

-- Trigger to auto-update updated_at on row modifications
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
