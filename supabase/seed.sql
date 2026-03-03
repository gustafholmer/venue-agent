-- Seed data for venue-agent local development
-- Run with: supabase db reset

SET session_replication_role = replica;

-- Clear existing data (in reverse dependency order)
TRUNCATE venue_blocked_dates CASCADE;
TRUNCATE venue_photos CASCADE;
TRUNCATE venues CASCADE;
TRUNCATE profiles CASCADE;
DELETE FROM auth.users;

-- ============================================================================
-- Test Users
-- Password for all test users: "Test1234"
-- ============================================================================

-- Venue Owner 1
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  role,
  aud,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change
) VALUES (
  '11111111-1111-1111-1111-111111111111',
  '00000000-0000-0000-0000-000000000000',
  'owner@test.com',
  crypt('Test1234', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  false,
  'authenticated',
  'authenticated',
  '',
  '',
  '',
  ''
);
INSERT INTO auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
VALUES ('11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'email', '{"sub":"11111111-1111-1111-1111-111111111111","email":"owner@test.com"}', now(), now(), now());

-- Venue Owner 2
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  role,
  aud,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change
) VALUES (
  '22222222-2222-2222-2222-222222222222',
  '00000000-0000-0000-0000-000000000000',
  'owner2@test.com',
  crypt('Test1234', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  false,
  'authenticated',
  'authenticated',
  '',
  '',
  '',
  ''
);
INSERT INTO auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
VALUES ('22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'email', '{"sub":"22222222-2222-2222-2222-222222222222","email":"owner2@test.com"}', now(), now(), now());

-- Customer 1
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  role,
  aud,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change
) VALUES (
  '33333333-3333-3333-3333-333333333333',
  '00000000-0000-0000-0000-000000000000',
  'customer@test.com',
  crypt('Test1234', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  false,
  'authenticated',
  'authenticated',
  '',
  '',
  '',
  ''
);
INSERT INTO auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
VALUES ('33333333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333', 'email', '{"sub":"33333333-3333-3333-3333-333333333333","email":"customer@test.com"}', now(), now(), now());

-- Customer 2
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  role,
  aud,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change
) VALUES (
  '44444444-4444-4444-4444-444444444444',
  '00000000-0000-0000-0000-000000000000',
  'customer2@test.com',
  crypt('Test1234', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  false,
  'authenticated',
  'authenticated',
  '',
  '',
  '',
  ''
);
INSERT INTO auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
VALUES ('44444444-4444-4444-4444-444444444444', '44444444-4444-4444-4444-444444444444', '44444444-4444-4444-4444-444444444444', 'email', '{"sub":"44444444-4444-4444-4444-444444444444","email":"customer2@test.com"}', now(), now(), now());

-- ============================================================================
-- Profiles (auto-created by trigger, but we override with more details)
-- ============================================================================

INSERT INTO profiles (id, email, full_name, phone, roles, company_name, org_number) VALUES
  ('11111111-1111-1111-1111-111111111111', 'owner@test.com', 'Anna Andersson', '+46701234567', '{customer,venue_owner}', 'Andersson Events AB', '5591234567'),
  ('22222222-2222-2222-2222-222222222222', 'owner2@test.com', 'Erik Eriksson', '+46707654321', '{customer,venue_owner}', 'Eriksson Lokaler AB', '5599876543'),
  ('33333333-3333-3333-3333-333333333333', 'customer@test.com', 'Maria Svensson', '+46709998877', '{customer}', NULL, NULL),
  ('44444444-4444-4444-4444-444444444444', 'customer2@test.com', 'Johan Johansson', '+46701112233', '{customer}', 'Johansson Consulting', NULL);

-- ============================================================================
-- Venues
-- ============================================================================

-- Venue 1: Warehouse/Industrial (Södermalm)
INSERT INTO venues (
  id,
  owner_id,
  name,
  slug,
  description,
  address,
  city,
  area,
  latitude,
  longitude,
  capacity_standing,
  capacity_seated,
  capacity_conference,
  min_guests,
  price_per_hour,
  price_half_day,
  price_full_day,
  price_evening,
  price_notes,
  amenities,
  venue_types,
  vibes,
  website,
  contact_email,
  contact_phone,
  status
) VALUES (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '11111111-1111-1111-1111-111111111111',
  'Lagerlokal Söder',
  'lagerlokal-soder',
  'En rå och industriell lokal perfekt för kreativa event. Högt i tak, exponerade tegelstenar och stora fönster som släpper in naturligt ljus. Passar utmärkt för release-fester, pop-up events och fotoshoots.',
  'Hornsgatan 123',
  'Stockholm',
  'Södermalm',
  59.317739,
  18.051062,
  200,
  100,
  50,
  20,
  3000,
  10000,
  18000,
  12000,
  'Priserna inkluderar grundstädning. Catering kan ordnas mot tillägg.',
  ARRAY['wifi', 'sound_system', 'projector', 'kitchen', 'parking', 'wheelchair_accessible'],
  ARRAY['warehouse', 'industrial', 'event_space'],
  ARRAY['industrial', 'creative', 'raw', 'urban'],
  'https://lagerlokal-soder.se',
  'kontakt@lagerlokal-soder.se',
  '+46701234567',
  'published'
);

-- Venue 2: Classic/Elegant (Östermalm)
INSERT INTO venues (
  id,
  owner_id,
  name,
  slug,
  description,
  address,
  city,
  area,
  latitude,
  longitude,
  capacity_standing,
  capacity_seated,
  capacity_conference,
  min_guests,
  price_per_hour,
  price_half_day,
  price_full_day,
  price_evening,
  price_notes,
  amenities,
  venue_types,
  vibes,
  website,
  contact_email,
  contact_phone,
  status
) VALUES (
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  '11111111-1111-1111-1111-111111111111',
  'Salongerna på Strandvägen',
  'salongerna-strandvagen',
  'Eleganta salonger i sekelskiftesbyggnad med utsikt över Nybroviken. Stuckatur, kristallkronor och parkettgolv skapar en exklusiv atmosfär. Perfekt för finare middagar, bröllop och företagsevent.',
  'Strandvägen 45',
  'Stockholm',
  'Östermalm',
  59.332653,
  18.082744,
  120,
  80,
  40,
  15,
  5000,
  18000,
  30000,
  20000,
  'Cateringkök finns. Vi samarbetar med utvalda cateringfirmor.',
  ARRAY['wifi', 'sound_system', 'projector', 'catering_kitchen', 'coat_check', 'wheelchair_accessible'],
  ARRAY['banquet_hall', 'event_space', 'meeting_room'],
  ARRAY['elegant', 'classic', 'luxurious', 'sophisticated'],
  'https://salongerna.se',
  'bokning@salongerna.se',
  '+46701234567',
  'published'
);

-- Venue 3: Modern/Minimalist (Kungsholmen)
INSERT INTO venues (
  id,
  owner_id,
  name,
  slug,
  description,
  address,
  city,
  area,
  latitude,
  longitude,
  capacity_standing,
  capacity_seated,
  capacity_conference,
  min_guests,
  price_per_hour,
  price_half_day,
  price_full_day,
  price_evening,
  price_notes,
  amenities,
  venue_types,
  vibes,
  website,
  contact_email,
  contact_phone,
  status
) VALUES (
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  '22222222-2222-2222-2222-222222222222',
  'Studio K',
  'studio-k',
  'Minimalistisk studio med vit bakgrund och flexibel belysning. Populär bland fotografer och för produktlanseringar. Fullt utrustat kök och loungeområde.',
  'Fleminggatan 78',
  'Stockholm',
  'Kungsholmen',
  59.333689,
  18.034782,
  80,
  50,
  30,
  5,
  2000,
  7000,
  12000,
  8000,
  NULL,
  ARRAY['wifi', 'professional_lighting', 'kitchen', 'lounge', 'sound_system'],
  ARRAY['studio', 'photo_studio', 'event_space'],
  ARRAY['modern', 'minimalist', 'clean', 'professional'],
  'https://studio-k.se',
  'hello@studio-k.se',
  '+46707654321',
  'published'
);

-- Venue 4: Cozy/Intimate (Vasastan)
INSERT INTO venues (
  id,
  owner_id,
  name,
  slug,
  description,
  address,
  city,
  area,
  latitude,
  longitude,
  capacity_standing,
  capacity_seated,
  capacity_conference,
  min_guests,
  price_per_hour,
  price_half_day,
  price_full_day,
  price_evening,
  price_notes,
  amenities,
  venue_types,
  vibes,
  website,
  contact_email,
  contact_phone,
  status
) VALUES (
  'dddddddd-dddd-dddd-dddd-dddddddddddd',
  '22222222-2222-2222-2222-222222222222',
  'Vinkällaren',
  'vinkallaren',
  'Intim vinkällare med valv i tegel från 1800-talet. Perfekt för vinprovningar, små middagar och exklusiva sammankomster. Plats för max 30 gäster skapar en personlig och minnesvärd upplevelse.',
  'Odengatan 52',
  'Stockholm',
  'Vasastan',
  59.344876,
  18.046332,
  35,
  25,
  20,
  8,
  2500,
  8000,
  14000,
  10000,
  'Vin kan köpas direkt från vårt lager till förmånliga priser.',
  ARRAY['wifi', 'wine_storage', 'intimate_lighting', 'catering_available'],
  ARRAY['wine_cellar', 'private_dining', 'event_space'],
  ARRAY['cozy', 'intimate', 'romantic', 'historic'],
  NULL,
  'info@vinkallaren.se',
  '+46707654321',
  'published'
);

-- Venue 5: Rooftop/Outdoor (Slussen)
INSERT INTO venues (
  id,
  owner_id,
  name,
  slug,
  description,
  address,
  city,
  area,
  latitude,
  longitude,
  capacity_standing,
  capacity_seated,
  capacity_conference,
  min_guests,
  price_per_hour,
  price_half_day,
  price_full_day,
  price_evening,
  price_notes,
  amenities,
  venue_types,
  vibes,
  website,
  contact_email,
  contact_phone,
  status
) VALUES (
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
  '11111111-1111-1111-1111-111111111111',
  'Taket vid Slussen',
  'taket-vid-slussen',
  'Spektakulär takterrass med 360-graders utsikt över Stockholm. Passar för sommarfester, rooftop events och after works. Inomhusdel finns för sämre väder.',
  'Katarinavägen 15',
  'Stockholm',
  'Södermalm',
  59.319827,
  18.071844,
  150,
  80,
  NULL,
  25,
  4000,
  15000,
  25000,
  18000,
  'Endast tillgänglig maj-september. Vädergaranti ingår ej.',
  ARRAY['wifi', 'bar', 'outdoor_seating', 'heaters', 'sound_system', 'view'],
  ARRAY['rooftop', 'outdoor', 'bar', 'event_space'],
  ARRAY['trendy', 'panoramic', 'summer', 'social'],
  'https://taket-slussen.se',
  'event@taket-slussen.se',
  '+46701234567',
  'published'
);

-- Venue 6: Draft venue (not published)
INSERT INTO venues (
  id,
  owner_id,
  name,
  slug,
  description,
  address,
  city,
  area,
  latitude,
  longitude,
  capacity_standing,
  capacity_seated,
  price_per_hour,
  amenities,
  venue_types,
  vibes,
  status
) VALUES (
  'ffffffff-ffff-ffff-ffff-ffffffffffff',
  '22222222-2222-2222-2222-222222222222',
  'Ny Lokal (Utkast)',
  'ny-lokal-utkast',
  'Under uppbyggnad...',
  'Sveavägen 100',
  'Stockholm',
  'Norrmalm',
  59.340000,
  18.060000,
  100,
  60,
  2500,
  ARRAY['wifi'],
  ARRAY['event_space'],
  ARRAY['modern'],
  'draft'
);

-- ============================================================================
-- Venue Photos
-- ============================================================================

-- Photos for Lagerlokal Söder
INSERT INTO venue_photos (venue_id, url, alt_text, sort_order, is_primary) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'https://images.unsplash.com/photo-1497366216548-37526070297c', 'Lagerlokal huvudbild', 0, true),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'https://images.unsplash.com/photo-1497366811353-6870744d04b2', 'Industriell interiör', 1, false),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d', 'Event setup', 2, false);

-- Photos for Salongerna
INSERT INTO venue_photos (venue_id, url, alt_text, sort_order, is_primary) VALUES
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3', 'Elegant salong', 0, true),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3', 'Festdukad sal', 1, false);

-- Photos for Studio K
INSERT INTO venue_photos (venue_id, url, alt_text, sort_order, is_primary) VALUES
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'https://images.unsplash.com/photo-1497366216548-37526070297c', 'Modern studio', 0, true),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'https://images.unsplash.com/photo-1497215842964-222b430dc094', 'Lounge area', 1, false);

-- Photos for Vinkällaren
INSERT INTO venue_photos (venue_id, url, alt_text, sort_order, is_primary) VALUES
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3', 'Vinkällare', 0, true);

-- Photos for Taket
INSERT INTO venue_photos (venue_id, url, alt_text, sort_order, is_primary) VALUES
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205', 'Rooftop utsikt', 0, true),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3', 'Fest på taket', 1, false);

-- ============================================================================
-- Blocked Dates
-- ============================================================================

-- Block some dates for Salongerna (busy venue)
INSERT INTO venue_blocked_dates (venue_id, blocked_date, reason) VALUES
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', CURRENT_DATE + INTERVAL '7 days', 'Privat bröllop'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', CURRENT_DATE + INTERVAL '14 days', 'Företagsevent'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', CURRENT_DATE + INTERVAL '21 days', 'Underhåll');

SET session_replication_role = DEFAULT;
