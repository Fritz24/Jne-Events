import { supabase } from "@/lib/supabase";

const LOCAL_KEY = 'jne_favorites_local';

export function getLocalFavorites() {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) return [];
    return JSON.parse(raw || '[]') || [];
  } catch (err) {
    return [];
  }
}

export function saveLocalFavorites(ids) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(Array.from(new Set(ids))));
  } catch (err) {
    // ignore
  }
}

export function addLocalFavorite(id) {
  const ids = getLocalFavorites();
  if (!ids.includes(id)) {
    ids.push(id);
    saveLocalFavorites(ids);
  }
}

export function removeLocalFavorite(id) {
  const ids = getLocalFavorites();
  const filtered = ids.filter((x) => x !== id);
  saveLocalFavorites(filtered);
}

export async function isFavorited(userId, eventId) {
  if (!userId) return getLocalFavorites().includes(eventId);
  try {
    const { data, error } = await supabase
      .from('jne_favorites')
      .select('id')
      .eq('user_id', userId)
      .eq('event_id', eventId)
      .limit(1);
    if (error) {
      return getLocalFavorites().includes(eventId);
    }
    return (data && data.length > 0);
  } catch (err) {
    return getLocalFavorites().includes(eventId);
  }
}

export async function addFavoriteToSupabase(userId, eventId) {
  addLocalFavorite(eventId);
  if (!userId) return true;
  try {
    const { error } = await supabase
      .from('jne_favorites')
      .insert({ user_id: userId, event_id: eventId, created_at: new Date().toISOString() });
    if (error) {
      console.warn("Could not sync favorite to Supabase (falling back to local):", error.message);
    }
    return true;
  } catch (err) {
    return true;
  }
}

export async function removeFavoriteFromSupabase(userId, eventId) {
  removeLocalFavorite(eventId);
  if (!userId) return true;
  try {
    const { error } = await supabase
      .from('jne_favorites')
      .delete()
      .eq('user_id', userId)
      .eq('event_id', eventId);
    if (error) {
      console.warn("Could not unsync favorite from Supabase (falling back to local):", error.message);
    }
    return true;
  } catch (err) {
    return true;
  }
}

export async function getFavoriteIdsForUser(userId) {
  if (!userId) return getLocalFavorites();
  try {
    const { data, error } = await supabase
      .from('jne_favorites')
      .select('event_id')
      .eq('user_id', userId);
    if (error) {
      return getLocalFavorites();
    }
    return (data || []).map((r) => r.event_id);
  } catch (err) {
    return getLocalFavorites();
  }
}

export async function migrateLocalFavoritesToSupabase(userId) {
  if (!userId) return { migrated: 0 };
  const local = getLocalFavorites();
  if (!local || local.length === 0) return { migrated: 0 };

  try {
    const { data: existing = [], error: getError } = await supabase
      .from('jne_favorites')
      .select('event_id')
      .eq('user_id', userId);
      
    if (getError) throw getError;
    
    const existingIds = (existing || []).map((r) => r.event_id);
    const toInsert = local.filter((id) => !existingIds.includes(id));
    if (toInsert.length > 0) {
      const payload = toInsert.map((id) => ({ user_id: userId, event_id: id, created_at: new Date().toISOString() }));
      const { error: insError } = await supabase.from('jne_favorites').insert(payload);
      if (insError) throw insError;
    }
    saveLocalFavorites([]);
    return { migrated: toInsert.length };
  } catch (err) {
    console.warn("Local favorites migration skipped (Supabase table not found or unavailable).");
    return { migrated: 0 };
  }
}
