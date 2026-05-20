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

      <div className="space-y-4 max-w-4xl mx-auto">
        {events.map(event => {
          const isMovie = event.type === "movie_night";
          const Icon = isMovie ? Film : Music;
          const whatsappUrl = `https://wa.me/${event.whatsapp_number?.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
            event.whatsapp_message || `Hi! I'd like to book tickets for "${event.title}".`
          )}`;

          return (
            <div
              key={event.id}
              className="relative flex flex-col sm:flex-row rounded-xl overflow-hidden bg-[#0d0d12] border border-white/[0.08] hover:bg-[#111118] hover:border-white/15 transition-all group shadow-2xl"
            >
              {/* Left cutout */}
              <div className="hidden sm:block absolute top-1/2 -translate-y-1/2 -left-3 w-6 h-6 bg-[#0a0a0f] rounded-full border-r border-white/10 border-y border-transparent z-10 group-hover:border-white/20 transition-colors" />

              <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:px-6 sm:py-5 border-b sm:border-b-0 sm:border-r-[2px] border-dashed border-white/10">
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-white/10 bg-white/5 flex items-center justify-center shadow-md">
                    {event.image_url ? (
                      <img
                        src={event.image_url}
                        alt={event.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Icon className={`w-6 h-6 ${isMovie ? "text-amber-400" : "text-violet-400"}`} />
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    <h3 className="font-bold text-white text-lg tracking-wide">{event.title}</h3>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-[13px] text-white/50 font-medium">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-violet-400/70" />
                        {event.date ? format(new Date(event.date), "EEE, MMM d · h:mm a") : "TBA"}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-violet-400/70" />
                        {event.venue}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Ticket Stub */}
              <div className="flex sm:flex-col items-center justify-between sm:justify-center gap-3 p-4 sm:px-8 sm:py-0 bg-white/[0.02] sm:min-w-[160px]">
                <span className="text-[17px] font-black text-white tracking-tight">
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
                    className="inline-flex items-center justify-center min-w-[100px] px-4 py-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500 hover:text-white border border-emerald-500/30 text-emerald-400 text-sm font-semibold capitalize transition-all shadow-lg"
                  >
                    {t.book}
                  </a>
                )}
              </div>

              {/* Right cutout */}
              <div className="hidden sm:block absolute top-1/2 -translate-y-1/2 -right-3 w-6 h-6 bg-[#0a0a0f] rounded-full border-l border-white/10 border-y border-transparent z-10 group-hover:border-white/20 transition-colors" />
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