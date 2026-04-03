-- WARNING: Run these queries in your Supabase SQL Editor.
-- They are designed to fit your current data while adding necessary app columns.

-- 1. Ensure Profiles Table matches app requirements
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE,
  full_name text,
  role text DEFAULT 'customer' CHECK (role IN ('admin', 'customer')),
  updated_at timestamp with time zone DEFAULT now()
);

-- 2. Ensure Event Table has all app columns
CREATE TABLE IF NOT EXISTS public.Event (
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

-- 3. Ensure Booking Table is correctly structured
CREATE TABLE IF NOT EXISTS public.Booking (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id text NOT NULL UNIQUE,
  event_id uuid REFERENCES public.Event(id),
  event_title text,
  attendee_name text NOT NULL,
  tier_label text,
  tier_price numeric,
  currency text DEFAULT 'XAF',
  status text DEFAULT 'confirmed',
  created_date timestamp with time zone DEFAULT now()
);

-- 4. Shop Items
CREATE TABLE IF NOT EXISTS public.shopitem (
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

-- 5. System Settings
CREATE TABLE IF NOT EXISTS public.systemsettings (
  key text NOT NULL PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamp with time zone DEFAULT now()
);

-- TRIGGER: Automatically create a profile when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name', 'customer');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if trigger exists before creating
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created') THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
  END IF;
END $$;

-- 6. Storage Setup Reminder
-- Please go to the Supabase Dashboard -> Storage -> Create a bucket named "events" and make it public.

-- 7. Row Level Security (Basics)
ALTER TABLE public.Event ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopitem ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.Booking ENABLE ROW LEVEL SECURITY;

-- Public can read events and shop items
CREATE POLICY "Public Read Events" ON public.Event FOR SELECT USING (true);
CREATE POLICY "Public Read Shop" ON public.shopitem FOR SELECT USING (true);

-- Users can read their own profiles
CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);

-- Admins can do everything (Example for profile role check)
-- NOTE: You must manually set your user's role to 'admin' in the profiles table to gain access.
CREATE POLICY "Admins have full access" ON public.Event TO authenticated 
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Repeat similar policies for other tables if needed.
