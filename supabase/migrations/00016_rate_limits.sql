-- Rate limits table for persistent rate limiting across serverless cold starts
CREATE TABLE IF NOT EXISTS rate_limits (
  identifier text PRIMARY KEY,
  count int NOT NULL DEFAULT 0,
  window_start timestamptz NOT NULL DEFAULT now()
);

-- Index for efficient cleanup of expired windows
CREATE INDEX idx_rate_limits_window_start ON rate_limits (window_start);

-- Atomic rate-limit check using row-level locking, upsert, and window expiry
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_identifier text,
  p_limit int,
  p_window_ms int
)
RETURNS TABLE(allowed boolean, remaining int, reset_at timestamptz)
LANGUAGE plpgsql
AS $$
DECLARE
  v_window_interval interval;
  v_now timestamptz;
  v_row rate_limits%ROWTYPE;
BEGIN
  v_window_interval := (p_window_ms || ' milliseconds')::interval;
  v_now := now();

  -- Try to lock the existing row
  SELECT * INTO v_row
  FROM rate_limits
  WHERE rate_limits.identifier = p_identifier
  FOR UPDATE;

  IF FOUND THEN
    -- Check if the window has expired
    IF v_row.window_start + v_window_interval < v_now THEN
      -- Window expired: reset the counter
      UPDATE rate_limits
      SET count = 1, window_start = v_now
      WHERE rate_limits.identifier = p_identifier;

      allowed := true;
      remaining := p_limit - 1;
      reset_at := v_now + v_window_interval;
      RETURN NEXT;
      RETURN;
    END IF;

    -- Window still active
    IF v_row.count >= p_limit THEN
      -- Limit exceeded
      allowed := false;
      remaining := 0;
      reset_at := v_row.window_start + v_window_interval;
      RETURN NEXT;
      RETURN;
    END IF;

    -- Increment counter
    UPDATE rate_limits
    SET count = count + 1
    WHERE rate_limits.identifier = p_identifier;

    allowed := true;
    remaining := p_limit - (v_row.count + 1);
    reset_at := v_row.window_start + v_window_interval;
    RETURN NEXT;
    RETURN;
  ELSE
    -- No existing row: insert a new one
    INSERT INTO rate_limits (identifier, count, window_start)
    VALUES (p_identifier, 1, v_now)
    ON CONFLICT (identifier) DO UPDATE
    SET count = 1, window_start = v_now;

    allowed := true;
    remaining := p_limit - 1;
    reset_at := v_now + v_window_interval;
    RETURN NEXT;
    RETURN;
  END IF;
END;
$$;

-- Cleanup function to remove entries older than 10 minutes
CREATE OR REPLACE FUNCTION cleanup_rate_limits()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM rate_limits
  WHERE window_start < now() - interval '10 minutes';
END;
$$;
