-- Seed data for venue-agent local development
-- Run with: supabase db reset

SET session_replication_role = replica;

-- Clear existing data (in reverse dependency order)
TRUNCATE messages CASCADE;
TRUNCATE booking_requests CASCADE;
TRUNCATE searches CASCADE;
TRUNCATE venue_blocked_dates CASCADE;
TRUNCATE venue_photos CASCADE;
TRUNCATE venues CASCADE;
TRUNCATE profiles CASCADE;
DELETE FROM auth.users;

-- ============================================================================
-- Test Users
-- Password for all test users: "test"
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
  role
) VALUES (
  '11111111-1111-1111-1111-111111111111',
  '00000000-0000-0000-0000-000000000000',
  'owner@test.com',
  crypt('test', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  false,
  'authenticated'
);

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
  role
) VALUES (
  '22222222-2222-2222-2222-222222222222',
  '00000000-0000-0000-0000-000000000000',
  'owner2@test.com',
  crypt('test', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  false,
  'authenticated'
);

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
  role
) VALUES (
  '33333333-3333-3333-3333-333333333333',
  '00000000-0000-0000-0000-000000000000',
  'customer@test.com',
  crypt('test', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  false,
  'authenticated'
);

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
  role
) VALUES (
  '44444444-4444-4444-4444-444444444444',
  '00000000-0000-0000-0000-000000000000',
  'customer2@test.com',
  crypt('test', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  false,
  'authenticated'
);

-- ============================================================================
-- Profiles (auto-created by trigger, but we override with more details)
-- ============================================================================

UPDATE profiles SET
  full_name = 'Anna Andersson',
  phone = '+46701234567',
  user_type = 'venue_owner',
  company_name = 'Andersson Events AB',
  org_number = '5591234567'
WHERE id = '11111111-1111-1111-1111-111111111111';

UPDATE profiles SET
  full_name = 'Erik Eriksson',
  phone = '+46707654321',
  user_type = 'venue_owner',
  company_name = 'Eriksson Lokaler AB',
  org_number = '5599876543'
WHERE id = '22222222-2222-2222-2222-222222222222';

UPDATE profiles SET
  full_name = 'Maria Svensson',
  phone = '+46709998877',
  user_type = 'customer'
WHERE id = '33333333-3333-3333-3333-333333333333';

UPDATE profiles SET
  full_name = 'Johan Johansson',
  phone = '+46701112233',
  user_type = 'customer',
  company_name = 'Johansson Consulting'
WHERE id = '44444444-4444-4444-4444-444444444444';

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

-- ============================================================================
-- Searches
-- ============================================================================

INSERT INTO searches (
  id,
  customer_id,
  event_type,
  guest_count,
  areas,
  budget_min,
  budget_max,
  preferred_date,
  preferred_time,
  requirements,
  vibe_description,
  raw_input,
  contact_email,
  contact_name,
  notify_new_matches,
  notify_until
) VALUES (
  '11111111-0000-0000-0000-000000000001',
  '33333333-3333-3333-3333-333333333333',
  'Företagsfest',
  50,
  ARRAY['Södermalm', 'Kungsholmen'],
  10000,
  20000,
  CURRENT_DATE + INTERVAL '30 days',
  'evening',
  ARRAY['catering', 'sound_system'],
  'Vi vill ha en avslappnad men proffsig känsla för vår årliga företagsfest',
  'Hej! Vi söker lokal för företagsfest, ca 50 pers, gärna industriell känsla, budget runt 15k',
  'customer@test.com',
  'Maria Svensson',
  true,
  CURRENT_DATE + INTERVAL '60 days'
);

INSERT INTO searches (
  id,
  customer_id,
  event_type,
  guest_count,
  areas,
  budget_min,
  budget_max,
  preferred_date,
  preferred_time,
  requirements,
  vibe_description,
  raw_input,
  contact_email,
  contact_name
) VALUES (
  '11111111-0000-0000-0000-000000000002',
  '44444444-4444-4444-4444-444444444444',
  'Workshop',
  20,
  ARRAY['Vasastan', 'Norrmalm'],
  5000,
  10000,
  CURRENT_DATE + INTERVAL '14 days',
  'daytime',
  ARRAY['projector', 'wifi'],
  'Kreativ workshop med fokus på brainstorming',
  'Letar efter lokal för workshop, 20 deltagare, behöver projektor och whiteboard',
  'customer2@test.com',
  'Johan Johansson'
);

-- ============================================================================
-- Booking Requests
-- ============================================================================

-- Pending booking
INSERT INTO booking_requests (
  id,
  venue_id,
  customer_id,
  search_id,
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
  venue_payout
) VALUES (
  '22222222-0000-0000-0000-000000000001',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '33333333-3333-3333-3333-333333333333',
  '11111111-0000-0000-0000-000000000001',
  'Företagsfest',
  'Årlig företagsfest med middag och underhållning för ca 50 anställda.',
  50,
  CURRENT_DATE + INTERVAL '30 days',
  '18:00',
  '23:00',
  'Maria Svensson',
  'customer@test.com',
  '+46709998877',
  NULL,
  'pending',
  12000,
  1800,
  13800,
  10200
);

-- Accepted booking
INSERT INTO booking_requests (
  id,
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
  responded_at
) VALUES (
  '22222222-0000-0000-0000-000000000002',
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  '44444444-4444-4444-4444-444444444444',
  'Workshop',
  'Kreativ workshop för ledningsgruppen.',
  15,
  CURRENT_DATE + INTERVAL '10 days',
  '09:00',
  '16:00',
  'Johan Johansson',
  'customer2@test.com',
  '+46701112233',
  'Johansson Consulting',
  'accepted',
  7000,
  1050,
  8050,
  5950,
  now() - INTERVAL '2 days'
);

-- Completed booking (past)
INSERT INTO booking_requests (
  id,
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
  status,
  base_price,
  platform_fee,
  total_price,
  venue_payout,
  responded_at,
  captured_at
) VALUES (
  '22222222-0000-0000-0000-000000000003',
  'dddddddd-dddd-dddd-dddd-dddddddddddd',
  '33333333-3333-3333-3333-333333333333',
  'Vinprovning',
  'Privat vinprovning för vänner.',
  12,
  CURRENT_DATE - INTERVAL '7 days',
  '18:00',
  '22:00',
  'Maria Svensson',
  'customer@test.com',
  '+46709998877',
  'completed',
  8000,
  1200,
  9200,
  6800,
  CURRENT_DATE - INTERVAL '14 days',
  CURRENT_DATE - INTERVAL '7 days'
);

-- ============================================================================
-- Messages
-- ============================================================================

-- Messages for the pending booking
INSERT INTO messages (booking_request_id, sender_id, content, is_read, read_at, created_at) VALUES
  ('22222222-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333', 'Hej! Jag undrar om det finns möjlighet att få catering ordnad via er?', true, now() - INTERVAL '1 hour', now() - INTERVAL '2 hours'),
  ('22222222-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Absolut! Vi samarbetar med flera cateringfirmor. Jag kan skicka över information om våra partners.', true, now() - INTERVAL '30 minutes', now() - INTERVAL '1 hour'),
  ('22222222-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333', 'Perfekt, tack! Det låter bra.', false, NULL, now() - INTERVAL '15 minutes');

-- Messages for the accepted booking
INSERT INTO messages (booking_request_id, sender_id, content, is_read, created_at) VALUES
  ('22222222-0000-0000-0000-000000000002', '44444444-4444-4444-4444-444444444444', 'Tack för accepterad bokning! Kan vi komma förbi dagen innan för att rigga?', true, now() - INTERVAL '1 day'),
  ('22222222-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'Självklart, det går bra. Lokalen är ledig från kl 15 dagen innan.', true, now() - INTERVAL '12 hours');

SET session_replication_role = DEFAULT;
