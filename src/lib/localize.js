import { format } from "date-fns";
import { enUS, fr } from "date-fns/locale";

const LOCALES = { en: enUS, fr };

/** Pick a localized event field (title, venue, description, etc.) with English fallback. */
export function getLocalizedEventField(event, field, lang = "en") {
  if (!event) return "";
  if (lang === "fr") {
    const frField = event[`${field}_fr`];
    if (frField) return frField;
    if (event.translations?.fr?.[field]) return event.translations.fr[field];
  }
  return event[field] ?? "";
}

/** Format a date using the active app language (weekday/month names localized). */
export function formatLocalizedDate(date, pattern, lang = "en") {
  if (!date) return "";
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  return format(d, pattern, { locale: LOCALES[lang] || enUS });
}
