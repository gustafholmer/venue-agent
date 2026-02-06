-- Add unique constraint on org_number (partial — only for non-null values)
CREATE UNIQUE INDEX idx_profiles_org_number_unique ON profiles(org_number) WHERE org_number IS NOT NULL;
