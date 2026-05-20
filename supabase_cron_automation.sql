-- 1. Enable the pg_cron extension (Must be run by a Supabase project admin)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Create the function that actually updates the statuses
-- We check if the event date is explicitly in the past.
CREATE OR REPLACE FUNCTION public.auto_update_event_statuses()
RETURNS void AS $$
BEGIN
  UPDATE public.jne_events
  SET status = 'completed'
  WHERE status = 'upcoming' 
  AND date < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Schedule the cron job to run every day at midnight
-- It executes the function we just created above.
SELECT cron.schedule(
  'auto_complete_past_events', -- Name of the cron job
  '0 0 * * *',                 -- Runs at 00:00 (Midnight) every day
  $$SELECT public.auto_update_event_statuses()$$
);

-- Note: If you ever need to stop this automation, run:
-- SELECT cron.unschedule('auto_complete_past_events');
