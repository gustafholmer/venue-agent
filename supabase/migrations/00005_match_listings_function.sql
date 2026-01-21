CREATE OR REPLACE FUNCTION match_listings(
  query_embedding VECTOR(768),
  match_count INT,
  listing_ids UUID[]
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  price INTEGER,
  rooms DECIMAL(2,1),
  area_sqm INTEGER,
  address TEXT,
  district TEXT,
  features TEXT[],
  monthly_fee INTEGER,
  year_built INTEGER,
  images TEXT[],
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    l.id,
    l.title,
    l.description,
    l.price,
    l.rooms,
    l.area_sqm,
    l.address,
    l.district,
    l.features,
    l.monthly_fee,
    l.year_built,
    l.images,
    1 - (l.embedding <=> query_embedding) AS similarity
  FROM listings l
  WHERE l.id = ANY(listing_ids)
    AND l.embedding IS NOT NULL
  ORDER BY l.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
