-- Match venues by embedding similarity
CREATE OR REPLACE FUNCTION match_venues(
  query_embedding vector(768),
  match_count int DEFAULT 10,
  venue_ids uuid[] DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  name text,
  slug text,
  description text,
  address text,
  city text,
  area text,
  capacity_standing int,
  capacity_seated int,
  capacity_conference int,
  price_per_hour int,
  price_half_day int,
  price_full_day int,
  price_evening int,
  amenities text[],
  venue_types text[],
  vibes text[],
  status venue_status,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  -- Input validation: ensure match_count is at least 1
  IF match_count < 1 THEN
    match_count := 10;
  END IF;

  RETURN QUERY
  SELECT
    v.id,
    v.name,
    v.slug,
    v.description,
    v.address,
    v.city,
    v.area,
    v.capacity_standing,
    v.capacity_seated,
    v.capacity_conference,
    v.price_per_hour,
    v.price_half_day,
    v.price_full_day,
    v.price_evening,
    v.amenities,
    v.venue_types,
    v.vibes,
    v.status,
    1 - (v.description_embedding <=> query_embedding) AS similarity
  FROM venues v
  WHERE
    v.status = 'published'
    AND v.description_embedding IS NOT NULL
    AND (venue_ids IS NULL OR v.id = ANY(venue_ids))
  ORDER BY v.description_embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

COMMENT ON FUNCTION match_venues(vector, int, uuid[]) IS
'Find venues by embedding similarity. Returns up to match_count published venues ordered by semantic similarity. Optional venue_ids filters to specific venues.';

-- Check venue availability for dates
CREATE OR REPLACE FUNCTION check_venue_availability(
  p_venue_id uuid,
  p_dates date[]
)
RETURNS TABLE (
  check_date date,
  is_available boolean
)
LANGUAGE plpgsql
AS $$
BEGIN
  -- Input validation: return empty if no dates provided
  IF p_dates IS NULL OR array_length(p_dates, 1) = 0 THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    d.check_date,
    NOT EXISTS (
      SELECT 1 FROM venue_blocked_dates vbd
      WHERE vbd.venue_id = p_venue_id AND vbd.blocked_date = d.check_date
    ) AND NOT EXISTS (
      SELECT 1 FROM booking_requests br
      WHERE br.venue_id = p_venue_id
        AND br.event_date = d.check_date
        AND br.status IN ('pending', 'accepted')
    ) AS is_available
  FROM unnest(p_dates) AS d(check_date);
END;
$$;

COMMENT ON FUNCTION check_venue_availability(uuid, date[]) IS
'Check if a venue is available on specific dates. Returns each date with is_available boolean. Unavailable if date is blocked or has pending/accepted booking.';
