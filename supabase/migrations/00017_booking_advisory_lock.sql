-- Atomic booking creation with advisory lock to prevent race conditions.
-- Two concurrent requests for the same venue+date will be serialised so
-- only the first one can succeed.

CREATE OR REPLACE FUNCTION create_booking_if_available(
  p_venue_id uuid,
  p_event_date date,
  p_customer_id uuid,
  p_event_type text,
  p_event_description text,
  p_guest_count int,
  p_start_time time,
  p_end_time time,
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text,
  p_company_name text,
  p_base_price int,
  p_platform_fee int,
  p_total_price int,
  p_venue_payout int,
  p_verification_token text
)
RETURNS TABLE(booking_id uuid, error_code text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_booking_id uuid;
BEGIN
  -- Acquire a transaction-scoped advisory lock keyed on venue+date.
  -- This serialises concurrent callers so the checks + insert are atomic.
  PERFORM pg_advisory_xact_lock(hashtext(p_venue_id::text || p_event_date::text));

  -- 1. Check if the date is blocked by the venue owner
  IF EXISTS (
    SELECT 1 FROM venue_blocked_dates
    WHERE venue_id = p_venue_id AND blocked_date = p_event_date
  ) THEN
    RETURN QUERY SELECT NULL::uuid, 'date_blocked'::text;
    RETURN;
  END IF;

  -- 2. Check if there is already an accepted or pending booking
  IF EXISTS (
    SELECT 1 FROM booking_requests
    WHERE venue_id = p_venue_id
      AND event_date = p_event_date
      AND status IN ('accepted', 'pending')
  ) THEN
    RETURN QUERY SELECT NULL::uuid, 'date_booked'::text;
    RETURN;
  END IF;

  -- 3. All clear -- insert the booking
  INSERT INTO booking_requests (
    venue_id,
    customer_id,
    event_type,
    event_description,
    guest_count,
    event_date,
    start_time,
    end_time,
    customer_name,
    customer_email,
    customer_phone,
    company_name,
    status,
    base_price,
    platform_fee,
    total_price,
    venue_payout,
    verification_token
  ) VALUES (
    p_venue_id,
    p_customer_id,
    p_event_type,
    p_event_description,
    p_guest_count,
    p_event_date,
    p_start_time,
    p_end_time,
    p_customer_name,
    p_customer_email,
    p_customer_phone,
    p_company_name,
    'pending',
    p_base_price,
    p_platform_fee,
    p_total_price,
    p_venue_payout,
    p_verification_token
  )
  RETURNING id INTO v_booking_id;

  RETURN QUERY SELECT v_booking_id, NULL::text;
END;
$$;
