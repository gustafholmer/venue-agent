CREATE TABLE listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  price INTEGER NOT NULL,
  rooms DECIMAL(2,1) NOT NULL,
  area_sqm INTEGER NOT NULL,
  address TEXT NOT NULL,
  district TEXT NOT NULL,
  city TEXT NOT NULL DEFAULT 'Stockholm',
  latitude DECIMAL(9,6),
  longitude DECIMAL(9,6),
  features TEXT[] DEFAULT '{}',
  monthly_fee INTEGER,
  year_built INTEGER,
  images TEXT[] DEFAULT '{}',
  embedding VECTOR(768),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for vector similarity search
CREATE INDEX ON listings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 10);

-- Index for common filters
CREATE INDEX idx_listings_price ON listings(price);
CREATE INDEX idx_listings_rooms ON listings(rooms);
CREATE INDEX idx_listings_district ON listings(district);

-- Enable RLS
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;

-- Public read access for listings
CREATE POLICY "Listings are viewable by everyone" ON listings
  FOR SELECT USING (true);
