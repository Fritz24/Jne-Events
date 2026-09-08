import { Link } from "react-router-dom";
import { Calendar, ArrowRight, Sparkles } from "lucide-react";
import EventCard from "../events/EventCard";
import { useLocalized } from "@/lib/LanguageContext";

export default function ThisWeekendSection({ events = [] }) {
  const { t } = useLocalized();

  if (!events || events.length === 0) return null;

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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {events.map((event, i) => (
          <EventCard key={event.id} event={event} index={i} />
        ))}
      </div>
    </section>
  );
}
