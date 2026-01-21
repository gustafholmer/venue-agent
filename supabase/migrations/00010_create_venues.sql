-- Venues table
CREATE TABLE IF NOT EXISTS venues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,

  name text NOT NULL,
  slug text UNIQUE,
  description text,

  address text NOT NULL,
  city text DEFAULT 'Stockholm',
  area text,
  latitude decimal(9,6),
  longitude decimal(9,6),

  capacity_standing int CHECK (capacity_standing IS NULL OR capacity_standing >= 0),
  capacity_seated int CHECK (capacity_seated IS NULL OR capacity_seated >= 0),
  capacity_conference int CHECK (capacity_conference IS NULL OR capacity_conference >= 0),
  min_guests int DEFAULT 1 CHECK (min_guests IS NULL OR min_guests >= 1),

  price_per_hour int CHECK (price_per_hour IS NULL OR price_per_hour >= 0),
  price_half_day int CHECK (price_half_day IS NULL OR price_half_day >= 0),
  price_full_day int CHECK (price_full_day IS NULL OR price_full_day >= 0),
  price_evening int CHECK (price_evening IS NULL OR price_evening >= 0),
  price_notes text,

  amenities text[] DEFAULT '{}',
  venue_types text[] DEFAULT '{}',
  vibes text[] DEFAULT '{}',

  website text,
  contact_email text,
  contact_phone text,

  status venue_status DEFAULT 'draft',
  description_embedding vector(768),

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Venue photos
CREATE TABLE IF NOT EXISTS venue_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid REFERENCES venues(id) ON DELETE CASCADE NOT NULL,
  url text NOT NULL,
  alt_text text,
  sort_order int DEFAULT 0,
  is_primary boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Venue blocked dates
CREATE TABLE IF NOT EXISTS venue_blocked_dates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid REFERENCES venues(id) ON DELETE CASCADE NOT NULL,
  blocked_date date NOT NULL,
  reason text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(venue_id, blocked_date)
);

-- Enable RLS
ALTER TABLE venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE venue_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE venue_blocked_dates ENABLE ROW LEVEL SECURITY;

-- Venues: public read for published, owner can manage own
CREATE POLICY "Anyone can read published venues" ON venues
  FOR SELECT USING (status = 'published');

CREATE POLICY "Owners can read own venues" ON venues
  FOR SELECT USING (owner_id = auth.uid());

CREATE POLICY "Owners can insert own venues" ON venues
  FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners can update own venues" ON venues
  FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "Owners can delete own venues" ON venues
  FOR DELETE USING (owner_id = auth.uid());

-- Photos: same as venue
CREATE POLICY "Anyone can read photos of published venues" ON venue_photos
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM venues WHERE id = venue_id AND status = 'published')
  );

CREATE POLICY "Owners can manage own venue photos" ON venue_photos
  FOR ALL USING (
    EXISTS (SELECT 1 FROM venues WHERE id = venue_id AND owner_id = auth.uid())
  );

-- Blocked dates: owner only
CREATE POLICY "Owners can manage blocked dates" ON venue_blocked_dates
  FOR ALL USING (
    EXISTS (SELECT 1 FROM venues WHERE id = venue_id AND owner_id = auth.uid())
  );

-- Indexes
CREATE INDEX idx_venues_status ON venues(status);
CREATE INDEX idx_venues_owner ON venues(owner_id);
CREATE INDEX idx_venues_area ON venues(area);
CREATE INDEX idx_venues_city ON venues(city);
CREATE INDEX idx_venue_photos_venue ON venue_photos(venue_id);
CREATE INDEX idx_venue_photos_primary ON venue_photos(venue_id) WHERE is_primary = true;
CREATE INDEX idx_venue_blocked_dates_venue ON venue_blocked_dates(venue_id);
CREATE INDEX idx_venue_blocked_dates_date ON venue_blocked_dates(venue_id, blocked_date);

-- Vector similarity index (partial index skips NULL embeddings)
CREATE INDEX idx_venues_embedding ON venues
  USING ivfflat (description_embedding vector_cosine_ops)
  WITH (lists = 100)
  WHERE description_embedding IS NOT NULL;

-- Generate slug from name
CREATE OR REPLACE FUNCTION generate_venue_slug()
RETURNS trigger AS $$
DECLARE
  base_slug text;
  final_slug text;
  counter int := 0;
BEGIN
  -- Convert name to lowercase slug
  base_slug := lower(regexp_replace(NEW.name, '[^a-zA-Z0-9åäöÅÄÖ]+', '-', 'g'));
  base_slug := trim(both '-' from base_slug);
  final_slug := base_slug;

  -- Check for uniqueness and add counter if needed
  WHILE EXISTS (SELECT 1 FROM venues WHERE slug = final_slug AND id != NEW.id) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;

  NEW.slug := final_slug;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_venue_slug
  BEFORE INSERT OR UPDATE OF name ON venues
  FOR EACH ROW
  WHEN (NEW.slug IS NULL OR NEW.slug = '')
  EXECUTE FUNCTION generate_venue_slug();

-- Trigger to auto-update updated_at on venues (uses function from 00009)
CREATE TRIGGER update_venues_updated_at
  BEFORE UPDATE ON venues
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
