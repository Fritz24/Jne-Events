import { Film, Music, Heart, Zap, X } from "lucide-react";
import { createPortal } from "react-dom";
import { formatLocalizedDate } from "@/lib/localize";
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useLocalized } from "@/lib/LanguageContext";
import { useAuth } from "@/lib/AuthContext";
import { logAnalyticsEvent } from "../../utils/analytics";
import { remainingSlots } from "@/utils/ticketCount";
import {
  getLocalFavorites,
  addLocalFavorite,
  removeLocalFavorite,
  isFavorited,
  addFavoriteToSupabase,
  removeFavoriteFromSupabase,
} from "@/lib/favorites";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

// Simple Apple-style share icon (square with arrow up)
const AppleShareIcon = ({ className = "w-5 h-5", ...props }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <rect x="3" y="3" width="18" height="18" rx="3" ry="3" />
    <path d="M8 12l4-4 4 4" />
    <path d="M12 8v8" />
  </svg>
);

export default function EventCard({ event, index = 0 }) {
  const [liked, setLiked] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const navigate = useNavigate();
  const { t, lang, getField } = useLocalized();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const queryClient = useQueryClient();

  // initialize liked state from localStorage or Supabase
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (user?.id) {
          const fav = await isFavorited(user.id, event.id);
          if (mounted) setLiked(!!fav);
        } else {
          const local = getLocalFavorites();
          if (mounted) setLiked(local.includes(event.id));
        }
      } catch (err) {
        // ignore
      }
    })();

    return () => { mounted = false; };
  }, [user?.id, event.id]);

  const handleCardClick = () => {
    navigate(`/events/${event.id}`);
    logAnalyticsEvent('event_card_click', event.id, event.title);
  };

  const handleShare = async (e) => {
    e.stopPropagation();
    const eventUrl = `${window.location.origin}/events/${event.id}`;
    const shareText = `Check out ${getField(event, "title")} on ${event.date ? formatLocalizedDate(event.date, "MMM d", lang) : ""}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: getField(event, "title"),
          text: shareText,
          url: eventUrl,
        });
        logAnalyticsEvent('event_share', event.id, event.title);
      } catch (err) {
        console.log('Share cancelled or failed', err);
      }
    } else {
      // Fallback: copy event detail URL to clipboard
      try {
        await navigator.clipboard.writeText(eventUrl);
        alert('Event link copied to clipboard!');
      } catch (err) {
        // If clipboard fails, navigate to the event detail page as a last resort
        navigate(`/events/${event.id}`);
      }
    }
  };

  const handleLike = async (e) => {
    e.stopPropagation();
    
    // Prompt login or sign up for unauthenticated users
    if (!user?.id) {
      setShowAuthModal(true);
      return;
    }

    const willLike = !liked;
    setLiked(willLike);
    logAnalyticsEvent(willLike ? 'event_like' : 'event_unlike', event.id, event.title);

    if (willLike) {
      addLocalFavorite(event.id);
      await addFavoriteToSupabase(user.id, event.id);
    } else {
      removeLocalFavorite(event.id);
      await removeFavoriteFromSupabase(user.id, event.id);
    }

    // Invalidate the favorites list query to trigger a smooth UI updates
    queryClient.invalidateQueries({ queryKey: ['favorites_events'] });
  };

  // Fetch dynamic categories for labeling
  const { data: categories = [] } = useQuery({
    queryKey: ["event_categories"],
    queryFn: async () => {
      const { data } = await supabase.from('jne_settings').select('value').eq('key', 'event_categories').single();
      return data?.value ? JSON.parse(data.value) : [];
    }
  });

  // Fetch bookings from cache to calculate capacity
  const { data: bookings = [] } = useQuery({
    queryKey: ["bookings"],
    queryFn: async () => {
      const { data, error } = await supabase.from('jne_bookings').select('*').order('created_date', { ascending: false }).limit(200);
      if (error) throw error;
      return data || [];
    },
  });

  const eventBookings = bookings.filter(b => b.event_id === event.id);
  const eventCapacity = event.capacity || 50;
  const remaining = remainingSlots(eventBookings, eventCapacity);
  
  const category = categories.find(c => c.id === event.type);

  const typeConfig = {
    movie_night: { icon: Film, label: t.movieNights, color: "bg-amber-500/15 text-amber-300 border-amber-500/20" },
    music: { icon: Music, label: t.music, color: "bg-violet-500/15 text-violet-300 border-violet-500/20" },
  };

  const statusConfig = {
    upcoming: { label: t.upcoming_status, color: "bg-emerald-500/15 text-emerald-300" },
    ongoing: { label: t.ongoing, color: "bg-amber-500/15 text-amber-300" },
    sold_out: { label: t.soldOut, color: "bg-red-500/15 text-red-300" },
    cancelled: { label: t.cancelled, color: "bg-gray-500/15 text-gray-300" },
    completed: { label: t.completed, color: "bg-gray-500/15 text-gray-400" },
  };

  // Determine label and icon with smarter detection
  const isMovie = event.type === 'movie_night' ||
    category?.label?.toLowerCase().includes('movie') ||
    event.title?.toLowerCase().includes('movie');

  const typeLabel = category?.label || (isMovie ? (t.movieNights || "Movie Night") : (t.music || "Music Event"));
  const typeColor = category?.color
    ? `bg-[${category.color}]/10 text-[${category.color}] border-[${category.color}]/20`
    : (isMovie ? typeConfig.movie_night.color : typeConfig.music.color);
  const TypeIcon = isMovie ? Film : Music;

  const status = statusConfig[event.status] || statusConfig.upcoming;
  const isAvailable = event.status !== "sold_out" && event.status !== "cancelled" && event.status !== "completed" && event.status !== "ongoing";

  const getDaysLeft = () => {
    if (!event.date) return null;
    const eventDate = new Date(event.date);
    const now = new Date();
    const diffTime = eventDate - now;
    if (diffTime <= 0) return null;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };
  const daysLeft = getDaysLeft();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="group"
    >
      {/* Outer wrapper: transparent so text sits on app background (no card bg) */}
      <div className="cursor-pointer h-full" onClick={handleCardClick}>
        {/* Image block - rounded with shadow to match the poster look */}
        <div className="relative w-full aspect-video overflow-hidden rounded-2xl shadow-lg group-hover:shadow-xl transition-shadow">
          {event.image_url ? (
            <img
              src={event.image_url}
              alt={getField(event, "title")}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center">
              <TypeIcon className="w-24 h-24 text-zinc-700" />
            </div>
          )}

          {/* Time Urgency Badge (Top Left) */}
          {daysLeft !== null && daysLeft <= 3 && (
            <div className={`absolute top-4 left-4 px-2.5 py-1.5 rounded-xl text-[9px] font-extrabold tracking-wider shadow-md ${
              daysLeft === 1 
                ? "bg-amber-400 text-black border border-amber-500/10" 
                : "bg-violet-600 text-white border border-violet-500/10"
            }`}>
              {daysLeft === 1 ? "Tomorrow" : `${daysLeft} days left`}
            </div>
          )}

          {/* Availability Status Badge (Top Right) */}
          {remaining === 0 ? (
            <div className="absolute top-4 right-4 px-2.5 py-1.5 rounded-xl bg-red-500 text-white text-[9px] font-extrabold tracking-wider shadow-md border border-red-600/10">
              Event full
            </div>
          ) : remaining <= 10 ? (
            <div className="absolute top-4 right-4 px-2.5 py-1.5 rounded-xl bg-orange-500 text-white text-[9px] font-extrabold tracking-wider flex items-center gap-1 shadow-md border border-orange-600/10 animate-pulse">
              <Zap className="w-2.5 h-2.5" />
              <span>Few slots left</span>
            </div>
          ) : null}
        </div>

        {/* Text on app background (separate from image) */}
        <div className="mt-4 px-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 pr-3">
              <h2 className="text-2xl font-extrabold text-white leading-tight mb-2 line-clamp-2 group-hover:text-violet-300 transition-colors">
                {getField(event, "title")}
              </h2>

              {/* Single-line meta: Date • Time • Venue (no icons) */}
              <p className="text-sm text-zinc-300">
                {event.date ? formatLocalizedDate(event.date, "EEE, d MMM", lang) : t.tba}
                {event.date && (
                  <>
                    {" \u2022 "}
                    {formatLocalizedDate(event.date, "HH:mm", lang)}
                  </>
                )}
                {event.venue && (
                  <>
                    {" \u2022 "}
                    <span className="font-medium text-zinc-300">{getField(event, "venue")}</span>
                  </>
                )}
              </p>

              {/* Dynamic Slots Left indicator */}
              <p className={`text-xs font-semibold mt-2 ${
                remaining === 0 ? "text-red-400" : remaining <= 10 ? "text-amber-400" : "text-emerald-400"
              }`}>
                {remaining === 0 ? "Event full" : `${remaining} slots left`}
              </p>
            </div>

            {/* Action icons beside title (kept, same behavior) */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleShare}
                onMouseDown={(e)=>e.stopPropagation()}
                className="p-2 text-zinc-300 hover:text-violet-500 transition-colors"
                title="Share"
                aria-label="Share"
              >
                <AppleShareIcon className="w-6 h-6" />
              </button>
              <button
                onClick={handleLike}
                onMouseDown={(e)=>e.stopPropagation()}
                className={`p-2 transition-colors ${liked ? 'text-red-600' : 'text-zinc-300 hover:text-violet-500'}`}
                title={liked ? "Unlike" : "Like"}
                aria-label={liked ? "Unlike" : "Like"}
              >
                <Heart className="w-6 h-6" fill={liked ? "currentColor" : "none"} />
              </button>
            </div>
          </div>

          {/* Price row (simple, matching screenshot) */}
          <div className="mt-3">
            <p className="text-sm text-zinc-400 mb-1">From</p>
            <p className="text-xl font-bold text-white">
              {(event.ticket_tiers?.length
                ? Math.min(...event.ticket_tiers.map((t) => t.price || 0))
                : (event.price || 0)
              ).toLocaleString()} {" "}
              <span className="text-sm text-zinc-400">{event.currency || "XAF"}</span>
            </p>
          </div>
        </div>
      </div>

      {showAuthModal && createPortal(
        <div 
          onClick={(e) => e.stopPropagation()} 
          onMouseDown={(e) => e.stopPropagation()}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200 text-white"
        >
          <div className="relative w-full max-w-md bg-[#14141c] border border-white/10 rounded-3xl p-6 shadow-2xl space-y-6 text-center animate-in zoom-in-95 duration-200">
            {/* Close button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowAuthModal(false);
              }}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-all"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="mx-auto w-12 h-12 rounded-2xl bg-violet-600/10 border border-violet-500/20 flex items-center justify-center">
              <Heart className="w-6 h-6 text-violet-400" fill="currentColor" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-bold text-white tracking-tight">Save to Favorites</h3>
              <p className="text-sm text-white/50 leading-relaxed">
                Log in or create a JNE Events account to keep track of your favorite movies and music events.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowAuthModal(false);
                  navigate("/login");
                }}
                className="flex-1 py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-sm transition-all shadow-lg shadow-violet-600/10"
              >
                Log In
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowAuthModal(false);
                  navigate("/signup");
                }}
                className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-sm transition-all"
              >
                Sign Up
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </motion.div>
  );
}
