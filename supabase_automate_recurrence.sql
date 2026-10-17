-- ====================================================================
-- 1. ONE-TIME CLEANUP (Run this to remove spawned Friday duplicates)
-- ====================================================================
-- Turn off recurring flag on the past Sep 25 movie so it stops generating Fridays
UPDATE public.jne_events
SET is_recurring = false
WHERE id = 'e85eb360-0f31-40e7-8ef8-7853c75312df';

-- Delete the unwanted auto-spawned Friday duplicates that have 0 bookings
DELETE FROM public.jne_events
WHERE id IN (
  '6aede91d-2b41-416f-a916-d797b79a988a',
  '2c2400e9-b072-4626-a145-90a27b3c8a98',
  '5fca7084-d026-4bff-8496-3c2825e0bfef'
);

-- ====================================================================
-- 2. AUTOMATED RECURRENCE & STATUS MANAGEMENT (Safe Function)
-- ====================================================================
CREATE EXTENSION IF NOT EXISTS pg_cron;

CREATE OR REPLACE FUNCTION public.auto_update_event_statuses()
RETURNS void AS $$
DECLARE
    rec RECORD;
    next_date TIMESTAMPTZ;
    existing_count INT;
    target_dow INT;
    cur_dow INT;
    days_until INT;
    target_time TIME;
BEGIN
    -- Step A: Mark past events as completed
    UPDATE public.jne_events
    SET status = 'completed'
    WHERE status = 'upcoming' 
    AND date < NOW();

    -- Step B: Only generate occurrences for ACTIVE templates (never completed or cancelled)
    FOR rec IN 
        SELECT * FROM public.jne_events 
        WHERE is_recurring = true
          AND status IN ('upcoming', 'ongoing')
    LOOP
        cur_dow := EXTRACT(DOW FROM NOW())::INT;
        target_time := rec.date::TIME;

        -- Determine target day of week
        IF rec.recurrence_pattern = 'weekly_sunday' THEN target_dow := 0;
        ELSIF rec.recurrence_pattern = 'weekly_monday' THEN target_dow := 1;
        ELSIF rec.recurrence_pattern = 'weekly_tuesday' THEN target_dow := 2;
        ELSIF rec.recurrence_pattern = 'weekly_wednesday' THEN target_dow := 3;
        ELSIF rec.recurrence_pattern = 'weekly_thursday' THEN target_dow := 4;
        ELSIF rec.recurrence_pattern = 'weekly_friday' THEN target_dow := 5;
        ELSIF rec.recurrence_pattern = 'weekly_saturday' THEN target_dow := 6;
        ELSE target_dow := EXTRACT(DOW FROM rec.date)::INT;
        END IF;

        days_until := (target_dow - cur_dow + 7) % 7;
        IF days_until = 0 AND (NOW()::TIME > target_time) THEN
            days_until := 7;
        END IF;

        next_date := (CURRENT_DATE + days_until * INTERVAL '1 day') + target_time;

        -- Check if an event instance already exists for this parent around this date
        SELECT COUNT(*) INTO existing_count
        FROM public.jne_events
        WHERE (id = rec.id OR parent_recurring_id = rec.id)
          AND date >= (next_date - INTERVAL '1 hour')
          AND date <= (next_date + INTERVAL '1 hour');

        -- If no event exists for that date, spawn the upcoming instance
        IF existing_count = 0 THEN
            INSERT INTO public.jne_events (
                title, title_fr, type, description, date, venue, venue_fr,
                city, venue_description, price, currency, whatsapp_number,
                whatsapp_message, featured, capacity, status, artist_or_movie,
                genre, image_url, ticket_tiers, is_recurring, parent_recurring_id
            ) VALUES (
                rec.title, rec.title_fr, rec.type, rec.description, next_date, rec.venue, rec.venue_fr,
                rec.city, rec.venue_description, rec.price, rec.currency, rec.whatsapp_number,
                rec.whatsapp_message, rec.featured, rec.capacity, 'upcoming', rec.artist_or_movie,
                rec.genre, rec.image_url, rec.ticket_tiers, false, rec.id
            );
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Schedule the midnight cron job
DO $$
BEGIN
    PERFORM cron.unschedule('auto_complete_past_events');
EXCEPTION WHEN OTHERS THEN
END $$;

SELECT cron.schedule(
    'auto_complete_past_events',
    '0 0 * * *',
    $$SELECT public.auto_update_event_statuses()$$
);

-- ====================================================================
-- 4. INDUSTRY-STANDARD PRICE SYNC (Fix legacy events with price = 0)
-- ====================================================================
-- Automatically synchronizes the base starting price for all events with their lowest ticket tier
UPDATE public.jne_events
SET price = COALESCE(
  (
    SELECT MIN((elem->>'price')::numeric)
    FROM jsonb_array_elements(ticket_tiers::jsonb) AS elem
    WHERE elem->>'price' IS NOT NULL AND elem->>'price' != ''
  ),
  price,
  0
)
WHERE ticket_tiers IS NOT NULL AND jsonb_array_length(ticket_tiers::jsonb) > 0;

