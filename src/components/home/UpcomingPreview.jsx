import { Link } from "react-router-dom";
import { ArrowRight, Calendar, MapPin, Film, Music, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { useLang } from "@/lib/LanguageContext";

export default function UpcomingPreview({ events }) {
  const { t } = useLang();
  if (!events?.length) return null;

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="flex items-end justify-between mb-10">
        <div>
          <p className="text-sm font-medium text-amber-400 mb-2 tracking-wide uppercase">{t.comingUp}</p>
          <h2 className="text-2xl sm:text-3xl font-bold text-white">{t.upcomingEvents}</h2>
        </div>
        <Link
          to="/Events"
          className="hidden sm:flex items-center gap-1.5 text-sm text-white/50 hover:text-white transition-colors"
        >
          {t.viewAll} <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="space-y-3">
        {events.map(event => {
          const isMovie = event.type === "movie_night";
          const Icon = isMovie ? Film : Music;
          const whatsappUrl = `https://wa.me/${event.whatsapp_number?.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
            event.whatsapp_message || `Hi! I'd like to book tickets for "${event.title}".`
          )}`;

          return (
            <div
              key={event.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.05] hover:border-white/10 transition-all"
            >
              <div className="flex items-center gap-4">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${isMovie ? "bg-amber-500/10" : "bg-violet-500/10"
                  }`}>
                  <Icon className={`w-5 h-5 ${isMovie ? "text-amber-400" : "text-violet-400"}`} />
                </div>
                <div>
                  <h3 className="font-semibold text-white">{event.title}</h3>
                  <div className="flex items-center gap-3 mt-1 text-sm text-white/40">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {event.date ? format(new Date(event.date), "EEE, MMM d") : "TBA"}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />
                      {event.venue}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 sm:gap-6">
                <span className="text-lg font-bold text-white">
                  {(event.ticket_tiers?.length
                    ? Math.min(...event.ticket_tiers.map(t => t.price || 0))
                    : (event.price || 0)
                  ).toLocaleString()} {event.currency || "XAF"}
                </span>
                {event.status === "upcoming" && (
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-all"
                  >
                    {t.book} <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <Link
        to="/Events"
        className="sm:hidden flex items-center justify-center gap-1.5 mt-6 text-sm text-white/50 hover:text-white transition-colors"
      >
        {t.viewAllEvents} <ArrowRight className="w-4 h-4" />
      </Link>
    </section>
  );
}