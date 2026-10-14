import { supabase } from "@/lib/supabase";

/**
 * Calculates upcoming occurrence dates for a recurring event template
 * within the specified lookahead window (default 14 days).
 */
export function getNextOccurrences(template, maxDaysAhead = 14) {
  if (!template?.date) return [];

  const baseDate = new Date(template.date);
  if (isNaN(baseDate.getTime())) return [];

  const now = new Date();
  const lookaheadEnd = new Date(now.getTime() + maxDaysAhead * 24 * 60 * 60 * 1000);

  const targetHours = baseDate.getHours();
  const targetMinutes = baseDate.getMinutes();

  // If recurrence has an end date that has already passed, return empty
  if (template.recurrence_end_type === "until_date" && template.recurrence_until) {
    const untilDate = new Date(template.recurrence_until);
    if (now > untilDate) return [];
  }

  const occurrences = [];
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
    } else if (template.recurrence_pattern?.startsWith("biweekly_")) {
      const dayNames = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };
      const match = template.recurrence_pattern.match(/^biweekly_(\w+)$/);
      if (match && dayNames[match[1]] !== undefined) targetDays = [dayNames[match[1]]];
    }

    let currentWeekSunday = new Date(baseDate);
    currentWeekSunday.setDate(currentWeekSunday.getDate() - currentWeekSunday.getDay());

    let weekOffset = 0;
    const maxWeeks = Math.ceil(maxDaysAhead / 7) + 8;

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
    const monthMode = template.recurrence_month_mode || "same_date";
    const maxMonths = Math.ceil(maxDaysAhead / 30) + 2;

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

  return occurrences.sort((a, b) => a - b);
}

/**
 * Syncs recurring events automatically.
 * Looks for any recurring template and ensures its next occurrence(s) exist as upcoming events in jne_events.
 * Returns the count of newly spawned events.
 */
let isSyncing = false;
export async function syncRecurringEvents(existingEvents = []) {
  if (isSyncing) return 0;
  isSyncing = true;

  try {
    // 1. Identify all recurring event templates
    const templates = existingEvents.filter(e => e.is_recurring);
    if (!templates.length) return 0;

    let spawnedCount = 0;

    for (const template of templates) {
      const targetOccurrences = getNextOccurrences(template, 14);
      if (!targetOccurrences.length) continue;

      for (const occDate of targetOccurrences) {
        const dateStr = occDate.toISOString();
        const occTime = occDate.getTime();

        // Check if an event instance already exists for this parent on this date (+/- 15 mins)
        const alreadyExists = existingEvents.some(e => {
          if (!e.date) return false;
          const eTime = new Date(e.date).getTime();
          const matchesDate = Math.abs(eTime - occTime) < 15 * 60 * 1000;
          return (e.id === template.id || e.parent_recurring_id === template.id) && matchesDate;
        });

        if (alreadyExists) continue;

        // Spawn new upcoming occurrence
        const newEventPayload = {
          title: template.title,
          title_fr: template.title_fr || null,
          type: template.type || "movie_night",
          description: template.description || "",
          venue: template.venue || "",
          venue_fr: template.venue_fr || null,
          city: template.city || null,
          venue_description: template.venue_description || null,
          price: template.price !== "" && template.price !== null ? Number(template.price) : 0,
          currency: template.currency || "XAF",
          whatsapp_number: template.whatsapp_number || null,
          whatsapp_message: template.whatsapp_message || null,
          featured: !!template.featured,
          capacity: template.capacity ? Number(template.capacity) : null,
          status: "upcoming",
          artist_or_movie: template.artist_or_movie || null,
          genre: template.genre || null,
          image_url: template.image_url || null,
          ticket_tiers: template.ticket_tiers || [],
          is_recurring: false, // Child occurrence is not itself a template
          parent_recurring_id: template.id,
          date: dateStr,
        };

        const { data, error } = await supabase
          .from("jne_events")
          .insert([newEventPayload])
          .select()
          .single();

        if (error) {
          console.warn(`[RecurringSync] Could not auto-spawn event for ${template.title}:`, error.message);
        } else {
          spawnedCount++;
          console.log(`[RecurringSync] Auto-spawned next occurrence of "${template.title}" on ${dateStr}`);
        }
      }
    }

    return spawnedCount;
  } catch (err) {
    console.error("[RecurringSync] Error during sync:", err);
    return 0;
  } finally {
    isSyncing = false;
  }
}
