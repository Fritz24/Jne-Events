-- ==========================================
-- JNE Events Ecosystem Integration Script
-- ==========================================
-- This script is idempotent (can be run multiple times).

-- 1. Tables Creation
CREATE TABLE IF NOT EXISTS public.jne_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  type text DEFAULT 'movie_night',
  description text,
  date timestamp with time zone,
  venue text,
  price numeric DEFAULT 0,
  currency text DEFAULT 'XAF',
  whatsapp_number text,
  whatsapp_message text,
  featured boolean DEFAULT false,
  capacity integer DEFAULT 0,
  status text DEFAULT 'upcoming',
  artist_or_movie text,
  genre text,
  image_url text,
  ticket_tiers jsonb DEFAULT '[]'::jsonb,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.jne_bookings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id text NOT NULL UNIQUE,
  event_id uuid REFERENCES public.jne_events(id) ON DELETE CASCADE,
  event_title text,
  attendee_name text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  tier_label text,
  tier_price numeric,
  currency text DEFAULT 'XAF',
  status text DEFAULT 'confirmed',
  created_date timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.jne_shop_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  price numeric DEFAULT 0,
  currency text DEFAULT 'XAF',
  category text DEFAULT 'Snacks',
  image_url text,
  available boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.jne_settings (
  key text NOT NULL PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamp with time zone DEFAULT now()
);

-- 2. Enable RLS
ALTER TABLE public.jne_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jne_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jne_shop_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jne_settings ENABLE ROW LEVEL SECURITY;

-- 3. Idempotent Policy Creation (Drop then Create)
DO $$ 
BEGIN
    -- Events
    DROP POLICY IF EXISTS "Public Read JNE Events" ON public.jne_events;
    CREATE POLICY "Public Read JNE Events" ON public.jne_events FOR SELECT USING (true);
    
    DROP POLICY IF EXISTS "Super Admin Manage JNE Events" ON public.jne_events;
    CREATE POLICY "Super Admin Manage JNE Events" ON public.jne_events
      FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM public.users WHERE auth_id = auth.uid() AND is_super_admin = true));

    -- Shop
    DROP POLICY IF EXISTS "Public Read JNE Shop" ON public.jne_shop_items;
    CREATE POLICY "Public Read JNE Shop" ON public.jne_shop_items FOR SELECT USING (true);
    
    DROP POLICY IF EXISTS "Super Admin Manage JNE Shop" ON public.jne_shop_items;
    CREATE POLICY "Super Admin Manage JNE Shop" ON public.jne_shop_items
      FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM public.users WHERE auth_id = auth.uid() AND is_super_admin = true));

    -- Bookings
    DROP POLICY IF EXISTS "Super Admin View All JNE Bookings" ON public.jne_bookings;
    CREATE POLICY "Super Admin View All JNE Bookings" ON public.jne_bookings
      FOR SELECT TO authenticated
      USING (EXISTS (SELECT 1 FROM public.users WHERE auth_id = auth.uid() AND is_super_admin = true));

    DROP POLICY IF EXISTS "Users view own JNE bookings" ON public.jne_bookings;
    CREATE POLICY "Users view own JNE bookings" ON public.jne_bookings
      FOR SELECT TO authenticated
      USING (auth.uid() = user_id);
END $$;

-- 4. Storage Bucket Support
INSERT INTO storage.buckets (id, name, public) 
VALUES ('events', 'events', true)
ON CONFLICT (id) DO NOTHING;

DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Authenticated JNE Upload" ON storage.objects;
    CREATE POLICY "Authenticated JNE Upload" ON storage.objects FOR INSERT TO authenticated 
    WITH CHECK (bucket_id = 'events');

    DROP POLICY IF EXISTS "Public JNE View" ON storage.objects;
    CREATE POLICY "Public JNE View" ON storage.objects FOR SELECT TO public 
    USING (bucket_id = 'events');
END $$;

-- 5. Migrated Data (Initial Event)
INSERT INTO public.jne_events (id, title, type, description, date, venue, price, currency, whatsapp_number, whatsapp_message, featured, capacity, status, artist_or_movie, genre, image_url, ticket_tiers, created_at)
VALUES (
    'c1e76e71-5133-4756-87c2-867111c72ff8', 
    'Under the stars: Horror Night', 
    'movie_night', 
    '', 
    '2026-04-25T17:30:00+00:00', 
    'Opposite College Mevick Etoug Ebe', 
    8500, 
    'XAF', 
    '+23781770020', 
    '', 
    false, 
    50, 
    'upcoming', 
    'Undertone', 
    'Horror', 
    'https://eqzqgrmhgknphouxdodo.supabase.co/storage/v1/object/public/images/event-images/0.383869224991258.PNG', 
    '[{"label":"Standard","price":8500,"description":"","seat_included":true,"drink_included":false,"snack_included":false,"headphones_included":true},{"label":"Cinema Combo","price":10000,"description":"","seat_included":true,"drink_included":true,"snack_included":true,"headphones_included":true},{"label":"Date Night","price":20000,"description":"X2","seat_included":true,"drink_included":true,"snack_included":true,"headphones_included":true}]'::jsonb, 
    '2026-04-02T16:18:10.052124+00:00'
) ON CONFLICT (id) DO NOTHING;

-- 6. EMERGENCY ADMIN ACCESS
-- If you are seeing "Access Denied", run the following query with your email
-- to grant yourself super-admin access in the ecosystem:
--
-- UPDATE public.users 
-- SET is_super_admin = true 
-- WHERE email = 'YOUR_EMAIL_HERE';
