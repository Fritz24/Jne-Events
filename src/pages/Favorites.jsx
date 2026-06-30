import { Heart } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import EventCard from '@/components/events/EventCard';
import { getLocalFavorites, getFavoriteIdsForUser } from '@/lib/favorites';
import { useLocalized } from '@/lib/LanguageContext';

export default function Favorites() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useLocalized();

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['favorites_events', user?.id],
    queryFn: async () => {
      let ids = getLocalFavorites() || [];
      if (user?.id) {
        try {
          const serverIds = await getFavoriteIdsForUser(user.id);
          if (serverIds && serverIds.length > 0) {
            ids = Array.from(new Set([...ids, ...serverIds]));
          }
        } catch (err) {
          console.error("Failed to load Supabase favorites", err);
        }
      }

      if (!ids || ids.length === 0) return [];

      const { data } = await supabase.from('jne_events').select('*').in('id', ids).order('date', { ascending: true });
      return data || [];
    },
  });

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col">
      <div className="max-w-4xl mx-auto px-4 py-12 w-full flex-1 flex flex-col">
        <h1 className="text-3xl font-bold mb-12 text-white">{t.favorites || "Favorites"}</h1>

        {isLoading && (
          <div className="flex items-center justify-center flex-1">
            <div className="w-8 h-8 border-4 border-slate-200 border-t-violet-500 rounded-full animate-spin"></div>
          </div>
        )}

        {!isLoading && events.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center py-20">
            <Heart className="w-16 h-16 text-zinc-600 mb-6" />
            <h2 className="text-2xl font-bold text-white mb-2">{t.noFavoritesYet || "No Favorites Yet"}</h2>
            <p className="text-zinc-400 mb-8 text-center max-w-sm">
              {t.favoritesSubtitle || "Tap the heart icon to save your faves so you don't forget later"}
            </p>
            <button
              onClick={() => navigate('/events')}
              className="px-6 py-3 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-semibold transition-colors"
            >
              Find Some Fun!
            </button>
          </div>
        )}

        {!isLoading && events.length > 0 && (
          <div className="grid grid-cols-1 gap-6">
            {events.map((ev, idx) => (
              <EventCard key={ev.id} event={ev} index={idx} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
