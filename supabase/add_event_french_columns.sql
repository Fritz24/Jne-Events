-- Run this in the Supabase SQL editor to enable French event titles/venues.
ALTER TABLE jne_events ADD COLUMN IF NOT EXISTS title_fr text;
ALTER TABLE jne_events ADD COLUMN IF NOT EXISTS venue_fr text;
