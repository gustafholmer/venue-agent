-- Add roles column (text array, default to customer)
ALTER TABLE profiles ADD COLUMN roles text[] NOT NULL DEFAULT '{customer}';

-- Migrate existing data: copy user_type values into roles array
UPDATE profiles SET roles = ARRAY[user_type::text];

-- Drop old column and enum
ALTER TABLE profiles DROP COLUMN user_type;
DROP TYPE IF EXISTS user_role;

-- Update index
DROP INDEX IF EXISTS idx_profiles_user_type;
CREATE INDEX idx_profiles_roles ON profiles USING GIN(roles);

-- Update auto-create profile trigger
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, roles)
  VALUES (new.id, new.email, '{customer}');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
