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

    // Helper to calculate occurrence dates based on smart interval or legacy recurrence fields
    const getUpcomingOccurrences = (template) => {
      const occurrences = [];
      const now = new Date();
      const leadDays = Number(template.recurrence_lead_days || 14);
      const lookaheadEnd = new Date(now.getTime() + leadDays * 24 * 60 * 60 * 1000);

      // Base anchor date
      if (!template.date) return [];
      const baseDate = new Date(template.date);
      if (isNaN(baseDate.getTime())) return [];

      const targetHours = baseDate.getHours();
      const targetMinutes = baseDate.getMinutes();

      // Check if end criteria met
      if (template.recurrence_end_type === "until_date" && template.recurrence_until) {
        const untilDate = new Date(template.recurrence_until);
        if (now > untilDate) return [];
      }

      const unit = template.recurrence_unit || (template.recurrence_freq === "monthly" ? "months" : "weeks");
      const interval = Math.max(1, Number(template.recurrence_interval || (template.recurrence_freq === "biweekly" ? 2 : 1)));

      // --- DAYS ---
      if (unit === "days") {
        let cur = new Date(baseDate);
        while (cur <= lookaheadEnd) {
          if (cur > baseDate && cur >= now && cur <= lookaheadEnd) {
            occurrences.push(new Date(cur));
          }
          cur = new Date(cur.getTime() + interval * 24 * 60 * 60 * 1000);
        }
      }

      // --- WEEKS ---
      else if (unit === "weeks") {
        let targetDays = [baseDate.getDay()];
        if (template.recurrence_days) {
          const raw = Array.isArray(template.recurrence_days)
            ? template.recurrence_days
            : String(template.recurrence_days).split(",");
          const parsed = raw.map(s => Number(String(s).trim())).filter(n => !isNaN(n) && n >= 0 && n <= 6);
          if (parsed.length > 0) targetDays = parsed;
        } else if (template.recurrence_day !== undefined && template.recurrence_day !== null) {
          targetDays = [Number(template.recurrence_day)];
        } else if (template.recurrence_pattern?.startsWith("weekly_")) {
          const dayNames = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };
          const match = template.recurrence_pattern.match(/^weekly_(\w+)$/);
          if (match && dayNames[match[1]] !== undefined) targetDays = [dayNames[match[1]]];
        }

        let currentWeekSunday = new Date(baseDate);
        currentWeekSunday.setDate(currentWeekSunday.getDate() - currentWeekSunday.getDay());

        let weekOffset = 0;
        const maxWeeks = Math.ceil(leadDays / 7) + 8;

        while (weekOffset <= maxWeeks) {
          for (const dayIdx of targetDays.slice().sort((a, b) => a - b)) {
            const candidate = new Date(currentWeekSunday);
            candidate.setDate(currentWeekSunday.getDate() + (weekOffset * 7) + dayIdx);
            candidate.setHours(targetHours, targetMinutes, 0, 0);

            if (candidate > baseDate && candidate >= now && candidate <= lookaheadEnd) {
              if (!occurrences.some(o => o.getTime() === candidate.getTime())) {
                occurrences.push(candidate);
              }
            }
          }
          weekOffset += interval;
        }
      }

      // --- MONTHS ---
      else if (unit === "months") {
        const monthMode = template.recurrence_month_mode || (template.recurrence_month_type === "day" ? "same_weekday" : "same_date");
        const maxMonths = Math.ceil(leadDays / 30) + 2;

        for (let mOffset = interval; mOffset <= maxMonths; mOffset += interval) {
          const targetYear = baseDate.getFullYear();
          const targetMonth = baseDate.getMonth() + mOffset;

          if (monthMode === "same_date") {
            const targetDay = baseDate.getDate();
            const d = new Date(targetYear, targetMonth, targetDay, targetHours, targetMinutes, 0, 0);
            const expectedMonth = ((targetMonth % 12) + 12) % 12;
            let finalDate = d;
            if (d.getMonth() !== expectedMonth) {
              finalDate = new Date(targetYear, targetMonth + 1, 0, targetHours, targetMinutes, 0, 0);
            }
            if (finalDate > baseDate && finalDate >= now && finalDate <= lookaheadEnd) {
              occurrences.push(finalDate);
            }
          } else {
            // same_weekday: e.g. 4th Thursday
            const dayOfWeek = baseDate.getDay();
            const nthWeek = Math.floor((baseDate.getDate() - 1) / 7) + 1;
            let found = null;
            let c = 0;
            for (let day = 1; day <= 31; day++) {
              const testD = new Date(targetYear, targetMonth, day, targetHours, targetMinutes, 0, 0);
              if (testD.getMonth() !== (((targetMonth % 12) + 12) % 12)) break;
              if (testD.getDay() === dayOfWeek) {
                c++;
                if (c === nthWeek) {
                  found = testD;
                  break;
                }
                found = testD;
              }
            }
            if (found && found > baseDate && found >= now && found <= lookaheadEnd) {
              occurrences.push(found);
            }
          }
        }
      }

      return occurrences;
    };

    // 4. Process each template
    for (const template of templates) {
      const targetOccurrences = getUpcomingOccurrences(template);

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
