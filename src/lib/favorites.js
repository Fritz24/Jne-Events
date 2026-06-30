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
  if (!userId) return false;
  try {
    const { data, error } = await supabase
      .from('jne_favorites')
      .select('id')
      .eq('user_id', userId)
      .eq('event_id', eventId)
      .limit(1);
    if (error) return false;
    return (data && data.length > 0);
  } catch (err) {
    return false;
  }
}

export async function addFavoriteToSupabase(userId, eventId) {
  if (!userId) return false;
  try {
    const { data, error } = await supabase
      .from('jne_favorites')
      .insert({ user_id: userId, event_id: eventId, created_at: new Date().toISOString() });
    if (error) return false;
    return true;
  } catch (err) {
    return false;
  }
}

export async function removeFavoriteFromSupabase(userId, eventId) {
  if (!userId) return false;
  try {
    const { error } = await supabase
      .from('jne_favorites')
      .delete()
      .eq('user_id', userId)
      .eq('event_id', eventId);
    if (error) return false;
    return true;
  } catch (err) {
    return false;
  }
}

export async function getFavoriteIdsForUser(userId) {
  if (!userId) return [];
  try {
    const { data, error } = await supabase
      .from('jne_favorites')
      .select('event_id')
      .eq('user_id', userId);
    if (error) return [];
    return (data || []).map((r) => r.event_id);
  } catch (err) {
    return [];
  }
}

export async function migrateLocalFavoritesToSupabase(userId) {
  if (!userId) return { migrated: 0 };
  const local = getLocalFavorites();
  if (!local || local.length === 0) return { migrated: 0 };

  try {
    // fetch existing remote favorites
    const { data: existing = [] } = await supabase
      .from('jne_favorites')
      .select('event_id')
      .eq('user_id', userId);
    const existingIds = (existing || []).map((r) => r.event_id);
    const toInsert = local.filter((id) => !existingIds.includes(id));
    if (toInsert.length > 0) {
      const payload = toInsert.map((id) => ({ user_id: userId, event_id: id, created_at: new Date().toISOString() }));
      await supabase.from('jne_favorites').insert(payload);
    }
    // clear local storage after migrating
    saveLocalFavorites([]);
    return { migrated: toInsert.length };
  } catch (err) {
    return { migrated: 0 };
  }
}
