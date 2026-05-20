-- 1. Create the Subscribers table for the Newsletter
CREATE TABLE IF NOT EXISTS public.jne_subscribers (
    email text PRIMARY KEY,
    status text DEFAULT 'active',
    source text,
    created_at timestamp with time zone DEFAULT now()
);

-- 2. Allow public inserts and updates into the Newsletter subscribers table
ALTER TABLE public.jne_subscribers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can subscribe" ON public.jne_subscribers;
CREATE POLICY "Public can subscribe" 
    ON public.jne_subscribers 
    FOR INSERT 
    WITH CHECK (true);

DROP POLICY IF EXISTS "Public can update subscription" ON public.jne_subscribers;
CREATE POLICY "Public can update subscription" 
    ON public.jne_subscribers 
    FOR UPDATE 
    USING (true);

-- 3. Fix the RLS on the main 'users' table so users can tag themselves to platforms upon login
-- This allows a logged-in user to update their own row (specifically to append 'events' to their active_platforms)
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
CREATE POLICY "Users can update their own profile"
    ON public.users
    FOR UPDATE
    USING (auth.uid() = auth_id)
    WITH CHECK (auth.uid() = auth_id);

-- 4. Automatically fix the missing tags for existing users in the database
-- This instantly fixes Natasha, Danièle, and your new test account by adding 'events' 
-- to anyone who has an empty array or null platforms, so they finally appear perfectly in your dashboard!
UPDATE public.users 
SET active_platforms = ARRAY['events'] 
WHERE active_platforms IS NULL OR array_length(active_platforms, 1) IS NULL;
