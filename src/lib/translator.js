/**
 * JnE Events - Smart Dynamic Translation Engine
 * Translates any user-inputted content (titles, descriptions, ticket tiers, inclusions,
 * refreshments, rental gear, categories) between English and French with zero configuration.
 *
 * Features:
 * 1. Comprehensive instant offline dictionary for event terminology.
 * 2. Client-side persistent cache (localStorage) for lightning-fast 0ms loads.
 * 3. Smart online fallback translator (Google Translate / MyMemory API) for long custom descriptions.
 * 4. React hook `useAutoTranslate` for reactive UI updates.
 */

import { useState, useEffect } from "react";

const CACHE_KEY = "jne_dynamic_translations_v2";

// In-memory cache for fast synchronous lookups
let translationCache = {};

// Load cache from localStorage
try {
  const saved = localStorage.getItem(CACHE_KEY);
  if (saved) {
    translationCache = JSON.parse(saved);
  }
} catch (e) {
  translationCache = {};
}

function saveCache() {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(translationCache));
  } catch (e) {
    // ignore quota errors
  }
}

/**
 * Built-in Bidirectional Event Dictionary (EN <-> FR)
 * Provides instantaneous translations without any network delay.
 */
const DICTIONARY = {
  // Categories & Event Types
  "movie night": "Soirée Cinéma",
  "movie nights": "Soirées Cinéma",
  "outdoor cinema": "Cinéma en Plein Air",
  "music event": "Événement Musical",
  "music": "Musique",
  "concert": "Concert",
  "live performance": "Spectacle en Direct",
  "party": "Fête / Soirée",
  "vip gathering": "Rassemblement VIP",
  "private screening": "Projection Privée",
  "afterwork": "Afterwork",
  "comedy show": "Spectacle d'Humour",
  "networking": "Réseautage",
  "festival": "Festival",

  // Ticket Tiers & Labels
  "standard": "Standard",
  "standard ticket": "Billet Standard",
  "vip": "VIP",
  "vip ticket": "Billet VIP",
  "vip package": "Forfait VIP",
  "regular": "Régulier",
  "regular ticket": "Billet Régulier",
  "early bird": "Billet Prévente",
  "couple": "Couple",
  "couple package": "Forfait Couple",
  "couple pass": "Pass Couple",
  "duo": "Duo",
  "duo pass": "Pass Duo",
  "group pass": "Pass Groupe",
  "table of 4": "Table de 4",
  "table of 6": "Table de 6",
  "table of 8": "Table de 8",
  "general admission": "Entrée Générale",
  "free entry": "Entrée Gratuite",
  "exclusive pass": "Pass Exclusif",
  "premium pass": "Pass Premium",
  "backstage pass": "Pass Coulisses",

  // Ticket Inclusions
  "headphones": "Casque Audio",
  "wireless headphones": "Casque Audio Sans Fil",
  "silent disco headphones": "Casque Silent Disco",
  "seat / blanket": "Siège / Couverture",
  "seat": "Siège",
  "blanket": "Couverture",
  "cushion": "Coussin Confort",
  "popcorn / snack": "Popcorn / Collation",
  "popcorn": "Popcorn",
  "snack": "Collation",
  "drink": "Boisson",
  "free drink": "Boisson Offerte",
  "cocktail": "Cocktail",
  "soft drink": "Boisson Non-Alcoolisée",
  "beer": "Bière",
  "wine": "Vin",
  "champagne": "Champagne",
  "water": "Bouteille d'Eau",
  "vip lounge access": "Accès Salon VIP",
  "priority seating": "Placement Prioritaire",
  "fast track entry": "Entrée Coupe-File",
  "fast track": "Coupe-File",
  "dedicated waiter": "Serveur Dédié",

  // Extras & Refreshments / Add-ons
  "popcorn small": "Petit Popcorn",
  "popcorn medium": "Moyen Popcorn",
  "popcorn large": "Grand Popcorn",
  "hot dog": "Hot Dog",
  "burger": "Burger",
  "nachos": "Nachos & Fromage",
  "chips": "Chips / Croustilles",
  "candy": "Bonbons",
  "juice": "Jus Naturel",
  "energy drink": "Boisson Énergisante",

  // Equipment & Staff Terms
  "sound & audio": "Son & Audio",
  "screens & projectors": "Écrans & Projecteurs",
  "lighting & fx": "Éclairage & FX",
  "power & staging": "Alimentation & Scène",
  "technical crew & staff": "Équipe Technique & Installation",
  "all items": "Tous les Articles",
  "gear only (self-pickup / client installation)": "Matériel Seul (Retrait / Installation par le client)",
  "delivery + setup & teardown crew (recommended)": "Livraison + Équipe d'Installation & Démontage (Recommandé)",
  "turnkey vip crew (delivery + setup + dedicated live sound/lighting operator)": "Équipe VIP Clé en Main (Livraison + Installation + Régisseur Son/Lumière Dédié)",

  // Common Venue / Location Terms
  "bonapriso": "Bonapriso",
  "bonanjo": "Bonanjo",
  "douala": "Douala",
  "yaoundé": "Yaoundé",
  "buea": "Buea",
  "limbe": "Limbé",
  "kribi": "Kribi",
  "bastos": "Bastos",
  "rooftop": "Toit-terrasse (Rooftop)",
  "beachside": "Bord de Mer",
  "garden": "Jardin",
  "indoor": "En Intérieur",
  "outdoor": "En Plein Air",
  "poolside": "Au Bord de la Piscine",
  "main hall": "Grande Salle",

  // Common Genres
  "action": "Action",
  "comedy": "Comédie",
  "drama": "Drame",
  "horror": "Horreur",
  "sci-fi": "Science-Fiction",
  "romance": "Romance",
  "thriller": "Thriller",
  "animation": "Animation",
  "documentary": "Documentaire",
  "afrobeats": "Afrobeats",
  "amapiano": "Amapiano",
  "hip hop": "Hip-Hop",
  "jazz": "Jazz",
  "acoustic": "Acoustique",
  "electronic": "Électro",
  "r&b": "R&B",
};

// Create reverse map (FR -> EN)
const REVERSE_DICTIONARY = {};
Object.entries(DICTIONARY).forEach(([en, fr]) => {
  REVERSE_DICTIONARY[fr.toLowerCase()] = en.charAt(0).toUpperCase() + en.slice(1);
});

/**
 * Clean & normalize a string for lookup
 */
function normalizeKey(str) {
  return String(str || "").trim().toLowerCase();
}

/**
 * Fast synchronous dictionary lookup
 */
export function lookupDictionary(text, targetLang = "fr") {
  if (!text || typeof text !== "string") return text;
  const key = normalizeKey(text);

  if (targetLang === "fr") {
    if (DICTIONARY[key]) {
      // Preserve uppercase first letter if source was capitalized
      const match = DICTIONARY[key];
      return text[0] === text[0].toUpperCase()
        ? match.charAt(0).toUpperCase() + match.slice(1)
        : match;
    }
  } else if (targetLang === "en") {
    if (REVERSE_DICTIONARY[key]) {
      const match = REVERSE_DICTIONARY[key];
      return text[0] === text[0].toUpperCase()
        ? match.charAt(0).toUpperCase() + match.slice(1)
        : match;
    }
  }

  return null;
}

/**
 * Online translation fetcher with multiple fallback endpoints
 */
async function fetchOnlineTranslation(text, targetLang = "fr", sourceLang = "auto") {
  if (!text || typeof text !== "string" || text.trim().length === 0) return text;
  
  // Don't translate pure numbers, URLs, dates, or symbols
  if (/^[\d\s\W_]+$/.test(text) || /^https?:\/\//.test(text)) {
    return text;
  }

  const cleanText = text.trim();
  const target = targetLang.toLowerCase().slice(0, 2);
  const source = sourceLang === "auto" ? (target === "fr" ? "en" : "fr") : sourceLang.toLowerCase().slice(0, 2);

  if (source === target) return cleanText;

  // 1. Try Google Translate Public API endpoint
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${source}&tl=${target}&dt=t&q=${encodeURIComponent(cleanText)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(3500) });
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data[0])) {
        const translated = data[0].map(item => item[0]).filter(Boolean).join("");
        if (translated && translated.trim().length > 0) {
          return translated.trim();
        }
      }
    }
  } catch (err) {
    // Proceed to fallback
  }

  // 2. Fallback to MyMemory Free Translation API
  try {
    const langPair = `${source}|${target}`;
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(cleanText)}&langpair=${encodeURIComponent(langPair)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(3500) });
    if (res.ok) {
      const data = await res.json();
      if (data?.responseData?.translatedText && !data.responseData.translatedText.startsWith("MYMEMORY WARNING")) {
        return data.responseData.translatedText.trim();
      }
    }
  } catch (err) {
    // Proceed to fallback
  }

  return cleanText;
}

/**
 * Synchronous / cached translator
 * Returns translated text immediately if cached or in dictionary; otherwise returns original text
 * and triggers background async translation and cache update.
 */
export function translateText(text, targetLang = "fr") {
  if (!text || typeof text !== "string" || targetLang === "en" && /^[a-zA-Z0-9\s.,!?'"()-]+$/.test(text)) {
    // If target is EN and already English-like, or empty
    if (targetLang === "en") {
      const frMatch = lookupDictionary(text, "en");
      if (frMatch) return frMatch;
    }
  }
  
  if (!text || typeof text !== "string") return text;
  const clean = text.trim();
  if (!clean) return text;

  // 1. Check Dictionary
  const dictMatch = lookupDictionary(clean, targetLang);
  if (dictMatch) return dictMatch;

  // 2. Check Cache
  const cacheKey = `${targetLang}:${clean}`;
  if (translationCache[cacheKey]) {
    return translationCache[cacheKey];
  }

  // 3. Trigger async fetch for next render
  fetchOnlineTranslation(clean, targetLang).then(translated => {
    if (translated && translated !== clean) {
      translationCache[cacheKey] = translated;
      saveCache();
      // Notify listeners
      window.dispatchEvent(new CustomEvent("jne_translation_updated", { detail: { cacheKey, translated } }));
    }
  }).catch(() => {});

  return clean;
}

/**
 * Async Translation Function (Promise-based)
 * Always resolves to the best translated string.
 */
export async function translateAsync(text, targetLang = "fr", sourceLang = "auto") {
  if (!text || typeof text !== "string") return text;
  const clean = text.trim();
  if (!clean) return text;

  // Check Dictionary
  const dictMatch = lookupDictionary(clean, targetLang);
  if (dictMatch) return dictMatch;

  // Check Cache
  const cacheKey = `${targetLang}:${clean}`;
  if (translationCache[cacheKey]) {
    return translationCache[cacheKey];
  }

  // Fetch online
  const translated = await fetchOnlineTranslation(clean, targetLang, sourceLang);
  if (translated) {
    translationCache[cacheKey] = translated;
    saveCache();
    return translated;
  }

  return clean;
}

/**
 * React Hook for automatic reactive translation of user-inputted strings.
 * Updates seamlessly when translation resolves without page refresh.
 */
export function useAutoTranslate(text, targetLang = "en") {
  const [translated, setTranslated] = useState(() => {
    if (!text || typeof text !== "string") return text;
    const clean = text.trim();
    const dict = lookupDictionary(clean, targetLang);
    if (dict) return dict;
    const cacheKey = `${targetLang}:${clean}`;
    return translationCache[cacheKey] || clean;
  });

  useEffect(() => {
    if (!text || typeof text !== "string") {
      setTranslated(text);
      return;
    }

    const clean = text.trim();
    if (!clean) {
      setTranslated(text);
      return;
    }

    // Check Dictionary first
    const dict = lookupDictionary(clean, targetLang);
    if (dict) {
      setTranslated(dict);
      return;
    }

    // Check Cache
    const cacheKey = `${targetLang}:${clean}`;
    if (translationCache[cacheKey]) {
      setTranslated(translationCache[cacheKey]);
      return;
    }

    let isMounted = true;
    translateAsync(clean, targetLang).then(res => {
      if (isMounted && res) {
        setTranslated(res);
      }
    });

    // Listen to global updates
    const handleUpdate = (e) => {
      if (e.detail?.cacheKey === cacheKey && isMounted) {
        setTranslated(e.detail.translated);
      }
    };
    window.addEventListener("jne_translation_updated", handleUpdate);

    return () => {
      isMounted = false;
      window.removeEventListener("jne_translation_updated", handleUpdate);
    };
  }, [text, targetLang]);

  return translated;
}

/**
 * Translate an entire object's specified fields to French
 */
export async function autoTranslateEventFields(eventData) {
  const result = { ...eventData };

  try {
    if (eventData.title && !eventData.title_fr) {
      result.title_fr = await translateAsync(eventData.title, "fr", "en");
    }
    if (eventData.description && !eventData.description_fr) {
      result.description_fr = await translateAsync(eventData.description, "fr", "en");
    }
    if (eventData.venue && !eventData.venue_fr) {
      result.venue_fr = await translateAsync(eventData.venue, "fr", "en");
    }
    if (eventData.genre && !eventData.genre_fr) {
      result.genre_fr = await translateAsync(eventData.genre, "fr", "en");
    }
  } catch (err) {
    console.error("Auto-translation error:", err);
  }

  return result;
}
