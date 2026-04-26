import { Calendar, MapPin, Film, Music, ChevronDown, ChevronUp } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import TicketTiers from "./TicketTiers";
import { useLang } from "@/lib/LanguageContext";

export default function EventCard({ event, index = 0 }) {
  const [showTiers, setShowTiers] = useState(false);
  const navigate = useNavigate();
  const { t } = useLang();

  const typeConfig = {
    movie_night: { icon: Film, label: t.movieNights, color: "bg-amber-500/15 text-amber-300 border-amber-500/20" },
    music: { icon: Music, label: t.music, color: "bg-violet-500/15 text-violet-300 border-violet-500/20" },
  };

  const statusConfig = {
    upcoming: { label: t.upcoming_status, color: "bg-emerald-500/15 text-emerald-300" },
    ongoing: { label: "Ongoing 🎬", color: "bg-amber-500/15 text-amber-300" },
    sold_out: { label: t.soldOut, color: "bg-red-500/15 text-red-300" },
    cancelled: { label: t.cancelled, color: "bg-gray-500/15 text-gray-300" },
    completed: { label: t.completed, color: "bg-gray-500/15 text-gray-400" },
  };

  const type = typeConfig[event.type] || typeConfig.music;
  const status = statusConfig[event.status] || statusConfig.upcoming;
  const TypeIcon = type.icon;
  const isAvailable = event.status !== "sold_out" && event.status !== "cancelled" && event.status !== "completed" && event.status !== "ongoing";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="group"
    >
      <div className="relative rounded-2xl bg-white/[0.03] border border-white/[0.06] overflow-hidden hover:border-white/10 hover:bg-white/[0.05] transition-all duration-300">
        {/* Image */}
        <div className="relative aspect-[16/10] overflow-hidden">
          {event.image_url ? (
            <img
              src={event.image_url}
              alt={event.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-violet-900/40 to-amber-900/20 flex items-center justify-center">
              <TypeIcon className="w-12 h-12 text-white/20" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-transparent to-transparent" />

          <div className="absolute top-3 left-3 flex gap-2">
            <Badge
              className={`${type.color} border text-xs cursor-pointer hover:brightness-110`}
              onClick={(e) => { e.stopPropagation(); navigate(`/events/category/${event.type}`); }}
            >
              <TypeIcon className="w-3 h-3 mr-1" />
              {type.label}
            </Badge>
          </div>
          {event.status === "sold_out" && (
            <div className="absolute top-3 right-3">
              <Badge className={`${status.color} text-xs`}>{status.label}</Badge>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-5">
          <h3 className="text-lg font-semibold text-white mb-1 line-clamp-1">{event.title}</h3>
          {event.artist_or_movie && (
            <p className="text-sm text-white/40 mb-3">{event.artist_or_movie}</p>
          )}

          <div className="flex flex-col gap-2 mb-4">
            <div className="flex items-center gap-2 text-sm text-white/50">
              <Calendar className="w-3.5 h-3.5 shrink-0" />
              {event.date ? format(new Date(event.date), "EEE, MMM d · h:mm a") : "TBA"}
            </div>
            <div
              className="flex items-center gap-2 text-sm text-white/50 cursor-pointer hover:text-violet-400 transition-colors"
              onClick={(e) => { e.stopPropagation(); navigate(`/events/city/${event.city || event.venue}`); }}
            >
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              {event.city ? `${event.venue}, ${event.city}` : event.venue}
            </div>
          </div>

          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-white/40">{t.ticketsFrom}</div>
            <div className="text-lg font-bold text-white">8,500 XAF</div>
          </div>

          {isAvailable ? (
            <button
              onClick={() => setShowTiers(!showTiers)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-all"
            >
              {showTiers ? t.hidePackages : t.viewPackages}
              {showTiers ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          ) : (
            <span className={`w-full flex justify-center px-4 py-2.5 rounded-xl text-sm font-medium ${status.color}`}>
              {status.label}
            </span>
          )}

          {/* Ticket Tiers */}
          {showTiers && isAvailable && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 pt-4 border-t border-white/5"
            >
              <TicketTiers event={event} compact />
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}