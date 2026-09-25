export const EVENTS_CACHE_KEY = "jne_cached_events_catalog_v2";

export function getCachedEvents() {
  try {
    const v2 = localStorage.getItem(EVENTS_CACHE_KEY);
    if (v2) {
      const parsed = JSON.parse(v2);
      if (Array.isArray(parsed) && parsed.length > 0 && parsed[0]?.title) {
        return parsed;
      }
    }
    // Check legacy cache key and clear it if corrupted
    const legacy = localStorage.getItem("jne_cached_events_catalog");
    if (legacy) {
      const parsed = JSON.parse(legacy);
      if (Array.isArray(parsed) && parsed.length > 0 && parsed[0]?.title) {
        return parsed;
      }
      localStorage.removeItem("jne_cached_events_catalog");
    }
  } catch (e) {
    // ignore
  }
  return undefined;
}

export function saveCachedEvents(data) {
  if (Array.isArray(data) && data.length > 0 && data[0]?.title) {
    try {
      localStorage.setItem(EVENTS_CACHE_KEY, JSON.stringify(data));
      localStorage.removeItem("jne_cached_events_catalog");
    } catch (e) {}
  }
}
