import { Link } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";
import EventCard from "../events/EventCard";
import { useLocalized } from "@/lib/LanguageContext";

export default function FeaturedEvents({ events, isLoading }) {
  const { t } = useLocalized();

  if (isLoading) {
    return (
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="rounded-2xl bg-white/[0.03] border border-white/[0.06] overflow-hidden animate-pulse">
              <div className="aspect-[16/10] bg-white/5" />
              <div className="p-5 space-y-3">
                <div className="h-5 bg-white/5 rounded w-3/4" />
                <div className="h-4 bg-white/5 rounded w-1/2" />
                <div className="h-4 bg-white/5 rounded w-2/3" />
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (!events?.length) return null;

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="flex items-end justify-between mb-10">
        <div>
          <p className="text-sm font-medium text-violet-400 mb-2 tracking-wide uppercase flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-violet-400" />
            {t.featured || "Featured"}
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold text-white">
            {t.featuredEvents || "Featured Events"}
          </h2>
        </div>
        <Link
          to="/events"
          className="hidden sm:flex items-center gap-1.5 text-sm font-medium text-violet-400 hover:text-violet-300 transition-colors"
        >
          {t.browseAllEvents || t.browseEvents || "Browse all events"} <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {events.map((event, i) => (
          <EventCard key={event.id} event={event} index={i} />
        ))}
      </div>

      {/* Button: Browse all events */}
      <div className="mt-12 flex justify-center">
        <Link
          to="/events"
          className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-all shadow-lg shadow-violet-600/25 hover:shadow-violet-500/40 hover:scale-[1.02] active:scale-[0.98]"
        >
          {t.browseAllEvents || t.browseEvents || "Browse all events"}
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </section>
  );
}