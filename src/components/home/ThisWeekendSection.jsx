import { Link } from "react-router-dom";
import { Calendar, ArrowRight, Sparkles } from "lucide-react";
import EventCard from "../events/EventCard";
import { useLocalized } from "@/lib/LanguageContext";

export default function ThisWeekendSection({ events = [] }) {
  const { t } = useLocalized();

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-8">
      <div className="flex items-end justify-between mb-8">
        <div>
          <p className="text-sm font-medium text-amber-400 mb-2 tracking-wide uppercase flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            {t.thisWeekend || "This Weekend"}
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold text-white">
            {t.thisWeekend || "This Weekend"}
          </h2>
        </div>
        <Link
          to="/events"
          className="hidden sm:flex items-center gap-1.5 text-sm text-white/50 hover:text-white transition-colors"
        >
          {t.viewAll || "View all"} <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {events.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event, i) => (
            <EventCard key={event.id} event={event} index={i} />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl bg-white/[0.02] border border-white/5 p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-5 text-center sm:text-left">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
              <Calendar className="w-6 h-6 text-violet-400" />
            </div>
            <div>
              <p className="text-white font-semibold text-base">
                {t.noEventsThisWeekend || "No events scheduled for this weekend"}
              </p>
              <p className="text-white/40 text-xs sm:text-sm mt-0.5">
                {t.checkFeaturedBelow || "Check out our featured upcoming experiences below or browse the full calendar."}
              </p>
            </div>
          </div>
          <Link
            to="/calendar"
            className="text-xs font-semibold text-violet-300 hover:text-white px-4 py-2.5 rounded-xl bg-violet-500/15 hover:bg-violet-500/25 border border-violet-500/25 transition-all shrink-0"
          >
            {t.viewCalendar || "View Calendar"}
          </Link>
        </div>
      )}
    </section>
  );
}
