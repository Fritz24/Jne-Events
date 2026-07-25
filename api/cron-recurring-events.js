import { createClient } from "@supabase/supabase-js";

export const config = {
  api: { bodyParser: true },
};

export default async function handler(req, res) {
  // 1. Authorization check for Vercel Cron Security
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    if (process.env.NODE_ENV === "production" && process.env.CRON_SECRET) {
      return res.status(401).json({ message: "Unauthorized" });
    }
  }

  // 2. Read Env Variables safely
  const cleanEnvVar = (val) => {
    if (!val) return "";
    return val.replace(/^["']|["']$/g, "").trim();
  };

  const supabaseUrl = cleanEnvVar(process.env.VITE_SUPABASE_URL);
  const supabaseAnonKey = cleanEnvVar(process.env.VITE_SUPABASE_ANON_KEY);

  if (!supabaseUrl || !supabaseAnonKey) {
    return res.status(500).json({
      message: "Supabase connection details are missing in environment variables.",
    });
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  try {
    // 3. Fetch all active recurring templates
    const { data: templates, error: templateError } = await supabase
      .from("jne_events")
      .select("*")
      .eq("is_recurring", true);

    if (templateError) throw templateError;

    if (!templates || templates.length === 0) {
      return res.status(200).json({ message: "No recurring event templates found.", spawned: 0 });
    }

    const spawnedEvents = [];
    const daysAhead = 14; // Pre-schedule events up to 2 weeks out

    // Helper to calculate weekly occurrence dates
    const getUpcomingOccurrences = (pattern, templateDateStr) => {
      const daysOfWeek = {
        sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6
      };
      const match = pattern.toLowerCase().match(/^weekly_(\w+)$/);
      if (!match) return [];
      
      const targetDay = daysOfWeek[match[1]];
      if (targetDay === undefined) return [];
      
      const occurrences = [];
      const now = new Date();
      const templateDate = new Date(templateDateStr);
      const targetHours = templateDate.getHours();
      const targetMinutes = templateDate.getMinutes();
      
      for (let i = 0; i <= daysAhead; i++) {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
        if (d.getDay() === targetDay) {
          d.setHours(targetHours, targetMinutes, 0, 0);
          occurrences.push(d);
        }
      }
      return occurrences;
    };

    // 4. Process each template
    for (const template of templates) {
      if (!template.recurrence_pattern) continue;

      const targetOccurrences = getUpcomingOccurrences(
        template.recurrence_pattern,
        template.date
      );

      for (const occurrenceDate of targetOccurrences) {
        const dateStr = occurrenceDate.toISOString();
        
        // Define a window around the target date to check if it's already created
        const dateStart = new Date(occurrenceDate.getTime() - 60000).toISOString();
        const dateEnd = new Date(occurrenceDate.getTime() + 60000).toISOString();

        // Check if an event for this template already exists on this date
        const { data: existing, error: checkError } = await supabase
          .from("jne_events")
          .select("id")
          .eq("parent_recurring_id", template.id)
          .gte("date", dateStart)
          .lte("date", dateEnd)
          .limit(1);

        if (checkError) {
          console.error(`Error checking existing events for template ${template.id}:`, checkError);
          continue;
        }

        // If it doesn't exist, spawn it!
        if (!existing || existing.length === 0) {
          const spawnPayload = {
            title: template.title,
            title_fr: template.title_fr,
            type: template.type,
            description: template.description,
            venue: template.venue,
            venue_fr: template.venue_fr,
            city: template.city,
            venue_description: template.venue_description,
            price: template.price,
            currency: template.currency,
            whatsapp_number: template.whatsapp_number,
            whatsapp_message: template.whatsapp_message,
            featured: template.featured,
            capacity: template.capacity,
            status: "upcoming",
            artist_or_movie: template.artist_or_movie,
            genre: template.genre,
            image_url: template.image_url,
            ticket_tiers: template.ticket_tiers,
            is_recurring: false,
            parent_recurring_id: template.id,
            date: dateStr,
          };

          const { data: spawned, error: spawnError } = await supabase
            .from("jne_events")
            .insert([spawnPayload])
            .select()
            .single();

          if (spawnError) {
            console.error(`Failed to spawn event from template ${template.id} for date ${dateStr}:`, spawnError);
          } else {
            spawnedEvents.push({ id: spawned.id, title: spawned.title, date: spawned.date });
          }
        }
      }
    }

    return res.status(200).json({
      message: `Successfully ran recurring events cron job.`,
      spawned_count: spawnedEvents.length,
      spawned_events: spawnedEvents,
    });
  } catch (error) {
    console.error("Cron job internal error:", error);
    return res.status(500).json({
      message: "Cron execution failed.",
      error: error.message,
    });
  }
}
