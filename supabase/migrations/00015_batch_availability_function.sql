-- Batch check venue availability for multiple venues at once
CREATE OR REPLACE FUNCTION check_venues_availability_batch(
  p_venue_ids uuid[],
  p_dates date[]
)
RETURNS TABLE (
  venue_id uuid,
  check_date date,
  is_available boolean
)
LANGUAGE plpgsql
AS $$
BEGIN
  IF p_venue_ids IS NULL OR array_length(p_venue_ids, 1) = 0 THEN
    RETURN;
  END IF;

  IF p_dates IS NULL OR array_length(p_dates, 1) = 0 THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    v.id AS venue_id,
    d.check_date,
    NOT EXISTS (
      SELECT 1 FROM venue_blocked_dates vbd
      WHERE vbd.venue_id = v.id AND vbd.blocked_date = d.check_date
    ) AND NOT EXISTS (
      SELECT 1 FROM booking_requests br
      WHERE br.venue_id = v.id
        AND br.event_date = d.check_date
        AND br.status IN ('pending', 'accepted')
    ) AS is_available
  FROM unnest(p_venue_ids) AS v(id)
  CROSS JOIN unnest(p_dates) AS d(check_date);
END;
$$;

COMMENT ON FUNCTION check_venues_availability_batch(uuid[], date[]) IS
'Batch check availability for multiple venues on multiple dates. Returns (venue_id, check_date, is_available) for each combination.';
