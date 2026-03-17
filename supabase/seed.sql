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

-- Venue 6: Art Gallery (Gamla Stan)
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
  '10101010-1010-1010-1010-101010101010',
  '11111111-1111-1111-1111-111111111111',
  'Galleri Gamla Stan',
  'galleri-gamla-stan',
  'Charmigt galleri i hjärtat av Gamla Stan med medeltida valv och kalkstensväggar. Perfekt för vernissager, intima middagar och exklusiva mingel. Lokalens unika karaktär ger varje event en historisk dimension.',
  'Österlånggatan 31',
  'Stockholm',
  'Gamla Stan',
  59.324891,
  18.070542,
  60,
  35,
  20,
  10,
  3500,
  12000,
  20000,
  15000,
  'Konstverk kan visas under eventet. Cateringsamarbete med lokala restauranger.',
  ARRAY['wifi', 'garderob', 'handikappanpassad'],
  ARRAY['middag', 'fotografering', 'aw'],
  ARRAY['klassisk', 'intim'],
  'https://galleri-gamlastan.se',
  'info@galleri-gamlastan.se',
  '+46701234567',
  'published'
);

-- Venue 7: Brewery Event Space (Södermalm)
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
  '20202020-2020-2020-2020-202020202020',
  '22222222-2222-2222-2222-222222222222',
  'Brygghusets Eventlokal',
  'brygghuset',
  'Rymlig eventlokal i ett aktivt bryggeri på Södermalm. Koppartankar och bryggutrustning skapar en unik bakgrund. Ölprovningar kan kombineras med eventet. Passar för allt från firmafester till produktlanseringar.',
  'Ringvägen 52',
  'Stockholm',
  'Södermalm',
  59.311245,
  18.062318,
  180,
  90,
  40,
  15,
  3500,
  11000,
  19000,
  14000,
  'Ölprovning kan bokas som tillval. Enklare mat serveras från vårt kök.',
  ARRAY['bar', 'ljudsystem', 'wifi', 'kok', 'scen'],
  ARRAY['fest', 'aw', 'middag'],
  ARRAY['industriell', 'festlig'],
  'https://brygghuset-event.se',
  'event@brygghuset.se',
  '+46707654321',
  'published'
);

-- Venue 8: Outdoor Garden Venue (Djurgården)
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
  '30303030-3030-3030-3030-303030303030',
  '11111111-1111-1111-1111-111111111111',
  'Djurgårdsterrassen',
  'djurgardsterrassen',
  'Vacker trädgårdslokal på Djurgården med utsikt över vattnet. Orangeri och utomhusterrass omgiven av grönska. Perfekt för sommarfester, bröllop och trädgårdsmiddagar. Inomhusdel med glasväggar för sämre väder.',
  'Djurgårdsvägen 68',
  'Stockholm',
  'Djurgården',
  59.326147,
  18.098253,
  200,
  120,
  NULL,
  20,
  5000,
  18000,
  30000,
  22000,
  'Säsongsöppen april-oktober. Regnskydd finns. Parkering på Djurgården.',
  ARRAY['utomhus', 'bar', 'parkering', 'kok', 'handikappanpassad'],
  ARRAY['fest', 'middag', 'fotografering'],
  ARRAY['klassisk', 'festlig'],
  'https://djurgardsterrassen.se',
  'bokning@djurgardsterrassen.se',
  '+46701234567',
  'published'
);

-- Venue 9: Conference Center (Solna)
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
  '40404040-4040-4040-4040-404040404040',
  '22222222-2222-2222-2222-222222222222',
  'Arenastaden Konferens',
  'arenastaden-konferens',
  'Toppmodern konferensanläggning i Arenastaden med flera salar i olika storlekar. Komplett AV-utrustning, breakout-rum och generösa foyéytor. Nära kollektivtrafik och med gott om parkering.',
  'Evenemangsgatan 17',
  'Stockholm',
  'Solna',
  59.364921,
  18.003758,
  400,
  300,
  350,
  10,
  4000,
  14000,
  24000,
  16000,
  'Flera salar kan kombineras. Teknikpaket och konferensvärd ingår.',
  ARRAY['projektor', 'ljudsystem', 'mikrofon', 'whiteboard', 'wifi', 'parkering', 'garderob', 'handikappanpassad'],
  ARRAY['konferens', 'workshop', 'mote'],
  ARRAY['professionell', 'modern'],
  'https://arenastaden-konferens.se',
  'bokning@arenastaden-konferens.se',
  '+46707654321',
  'published'
);

-- Venue 10: Creative Studio (Telefonplan)
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
  '50505050-5050-5050-5050-505050505050',
  '11111111-1111-1111-1111-111111111111',
  'Ateljé Telefonplan',
  'atelje-telefonplan',
  'Kreativ ateljé i den gamla Ericssonbyggnaden med högt i tak och stora industriella fönster. Flexibelt utrymme som enkelt anpassas för workshops, fotoshoots och kreativa events. Rå betong möter moderna detaljer.',
  'Telefonvägen 30',
  'Stockholm',
  'Hägersten',
  59.298312,
  18.017543,
  100,
  60,
  35,
  5,
  2000,
  7000,
  12000,
  9000,
  NULL,
  ARRAY['wifi', 'projektor', 'kok', 'ljudsystem'],
  ARRAY['workshop', 'fotografering', 'fest'],
  ARRAY['modern', 'industriell'],
  'https://atelje-telefonplan.se',
  'hej@atelje-telefonplan.se',
  '+46701234567',
  'published'
);

-- Venue 11: Waterfront Pavilion (Kungsholmen)
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
  '60606060-6060-6060-6060-606060606060',
  '22222222-2222-2222-2222-222222222222',
  'Sjöpaviljongen',
  'sjopaviljongen',
  'Elegant paviljong vid Kungsholmens strand med panoramautsikt över Riddarfjärden. Ljusa lokaler med sjöutsikt åt alla håll. Passar för middagar, release-fester och företagsmingel i en avslappnad men stilfull miljö.',
  'Norr Mälarstrand 64',
  'Stockholm',
  'Kungsholmen',
  59.328456,
  18.021873,
  120,
  70,
  30,
  12,
  4500,
  15000,
  26000,
  18000,
  'Uteservering vid kajen sommartid. Egen brygga för båttransport.',
  ARRAY['bar', 'kok', 'utomhus', 'garderob', 'wifi', 'handikappanpassad'],
  ARRAY['middag', 'fest', 'aw'],
  ARRAY['klassisk', 'intim'],
  NULL,
  'bokning@sjopaviljongen.se',
  '+46707654321',
  'published'
);

-- Venue 13: Draft venue (not published)
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

-- Photos for Galleri Gamla Stan
INSERT INTO venue_photos (venue_id, url, alt_text, sort_order, is_primary) VALUES
  ('10101010-1010-1010-1010-101010101010', 'https://images.unsplash.com/photo-1572947650440-e8a97ef053b2', 'Galleri med valv', 0, true),
  ('10101010-1010-1010-1010-101010101010', 'https://images.unsplash.com/photo-1594732832278-abd644401426', 'Vernissage i galleriet', 1, false);

-- Photos for Brygghuset
INSERT INTO venue_photos (venue_id, url, alt_text, sort_order, is_primary) VALUES
  ('20202020-2020-2020-2020-202020202020', 'https://images.unsplash.com/photo-1559526324-593bc073d938', 'Bryggeri eventlokal', 0, true),
  ('20202020-2020-2020-2020-202020202020', 'https://images.unsplash.com/photo-1532634922-8fe0b757fb13', 'Koppartankar', 1, false);

-- Photos for Djurgårdsterrassen
INSERT INTO venue_photos (venue_id, url, alt_text, sort_order, is_primary) VALUES
  ('30303030-3030-3030-3030-303030303030', 'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3', 'Trädgårdsfest', 0, true),
  ('30303030-3030-3030-3030-303030303030', 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d', 'Terrass vid vattnet', 1, false);

-- Photos for Arenastaden Konferens
INSERT INTO venue_photos (venue_id, url, alt_text, sort_order, is_primary) VALUES
  ('40404040-4040-4040-4040-404040404040', 'https://images.unsplash.com/photo-1431540015161-0bf868a2d407', 'Konferenssal', 0, true),
  ('40404040-4040-4040-4040-404040404040', 'https://images.unsplash.com/photo-1497215842964-222b430dc094', 'Breakout-rum', 1, false);

-- Photos for Ateljé Telefonplan
INSERT INTO venue_photos (venue_id, url, alt_text, sort_order, is_primary) VALUES
  ('50505050-5050-5050-5050-505050505050', 'https://images.unsplash.com/photo-1497366216548-37526070297c', 'Ateljé med industriella fönster', 0, true);

-- Photos for Sjöpaviljongen
INSERT INTO venue_photos (venue_id, url, alt_text, sort_order, is_primary) VALUES
  ('60606060-6060-6060-6060-606060606060', 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3', 'Paviljong vid vattnet', 0, true),
  ('60606060-6060-6060-6060-606060606060', 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3', 'Kvällsevent', 1, false);

-- ============================================================================
-- Blocked Dates
-- ============================================================================

-- Block some dates for Salongerna (busy venue)
INSERT INTO venue_blocked_dates (venue_id, blocked_date, reason) VALUES
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', CURRENT_DATE + INTERVAL '7 days', 'Privat bröllop'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', CURRENT_DATE + INTERVAL '14 days', 'Företagsevent'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', CURRENT_DATE + INTERVAL '21 days', 'Underhåll');

SET session_replication_role = DEFAULT;
