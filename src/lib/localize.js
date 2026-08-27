import { format } from "date-fns";
import { enUS, fr } from "date-fns/locale";
import { translateText } from "./translator";

const LOCALES = { en: enUS, fr };

/** Pick a localized event field (title, venue, description, etc.) with automatic dynamic translation. */
export function getLocalizedEventField(event, field, lang = "en") {
  if (!event) return "";

  // 1. Explicit database translation if present
  if (lang === "fr") {
    const frField = event[`${field}_fr`];
    if (frField && frField.trim().length > 0) return frField;
    if (event.translations?.fr?.[field]) return event.translations.fr[field];
  } else if (lang === "en") {
    const enField = event[`${field}_en`];
    if (enField && enField.trim().length > 0) return enField;
    if (event.translations?.en?.[field]) return event.translations.en[field];
  }

  const rawValue = event[field];
  if (!rawValue || typeof rawValue !== "string") return rawValue ?? "";

  // 2. Dynamic translation engine fallback
  if (lang === "fr") {
    return translateText(rawValue, "fr");
  } else if (lang === "en") {
    return translateText(rawValue, "en");
  }

  return rawValue;
}

/** Translate any user string dynamically */
export function translateUserText(text, lang = "en") {
  if (!text || typeof text !== "string") return text;
  return translateText(text, lang);
}

/** Format a date using the active app language (weekday/month names localized). */
export function formatLocalizedDate(date, pattern, lang = "en") {
  if (!date) return "";
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  return format(d, pattern, { locale: LOCALES[lang] || enUS });
}

