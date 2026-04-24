-- ==========================================
-- JNE Events Data Migration Helpers
-- ==========================================
-- Run these queries in your OLD Supabase SQL Editor.
-- They will generate the INSERT statements you need for the NEW database.

-- 1. Generate INSERTs for all existing Bookings
-- run this and copy the results
SELECT 
  'INSERT INTO public.jne_bookings (id, ticket_id, event_id, event_title, attendee_name, tier_label, tier_price, currency, status, created_date) VALUES ' ||
  string_agg(
    format('(%L, %L, %L, %L, %L, %L, %L, %L, %L, %L)', 
      id, ticket_id, event_id, event_title, attendee_name, tier_label, tier_price, currency, status, created_date
    ), 
    ','
  ) || ' ON CONFLICT (id) DO NOTHING;'
FROM public."Booking";

-- 2. Generate INSERTs for all Shop Items
SELECT 
  'INSERT INTO public.jne_shop_items (id, name, description, price, currency, category, image_url, available, created_at) VALUES ' ||
  string_agg(
    format('(%L, %L, %L, %L, %L, %L, %L, %L, %L)', 
      id, name, description, price, currency, category, image_url, available, created_at
    ), 
    ','
  ) || ' ON CONFLICT (id) DO NOTHING;'
FROM public.shopitem;

-- 3. VERIFY YOUR ADMIN STATUS
-- Run this in your NEW database SQL Editor to see if you have admin rights:
SELECT email, is_super_admin, active_platforms 
FROM public.users 
WHERE email = 'YOUR_EMAIL_HERE';

-- 4. If the result above shows is_super_admin = false, fix it with:
UPDATE public.users 
SET is_super_admin = true 
WHERE email = 'YOUR_EMAIL_HERE';
