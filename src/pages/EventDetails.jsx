import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Calendar, MapPin, Film, Music, AlertCircle, Info } from "lucide-react";
import { formatLocalizedDate } from "@/lib/localize";
import { useLocalized } from "@/lib/LanguageContext";
import { useAuth } from "@/lib/AuthContext";
import TicketTiers from "@/components/events/TicketTiers";
import SEO from "@/components/common/SEO";
import { remainingSlots } from "@/utils/ticketCount";
import { logAnalyticsEvent } from "@/utils/analytics";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function EventDetails() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { t, lang, getField, translate } = useLocalized();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  // Fetch event details
  const { data: event, isLoading, error } = useQuery({
    queryKey: ["event", eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('jne_events')
        .select('*')
        .eq('id', eventId)
        .single();
      if (error) throw error;
      
      // Log view
      logAnalyticsEvent('event_details_view', eventId, data?.title);
      
      return data;
    },
  });

  // Fetch bookings to calculate capacity
  const { data: bookings = [] } = useQuery({
    queryKey: ["bookings", eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('jne_bookings')
        .select('*')
        .eq('event_id', eventId)
        .order('created_date', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ["event_categories"],
    queryFn: async () => {
      const { data } = await supabase.from('jne_settings').select('value').eq('key', 'event_categories').single();
      return data?.value ? JSON.parse(data.value) : [];
    }
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0a0a0f] to-[#1a0a2e] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-violet-500/30 border-t-violet-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0a0a0f] to-[#1a0a2e]">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <button
            onClick={() => navigate('/events')}
            className="flex items-center gap-2 text-violet-400 hover:text-violet-300 mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {t.back || 'Back'}
          </button>
          <Alert className="border-red-500/20 bg-red-500/5">
            <AlertCircle className="h-4 w-4 text-red-400" />
            <AlertDescription className="text-red-200">
              {error?.message || "Event not found"}
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  const eventCapacity = event.capacity || 50;
  const remaining = remainingSlots(bookings, eventCapacity);
  const category = categories.find(c => c.id === event.type);
  
  const isMovie = event.type === 'movie_night' ||
    category?.label?.toLowerCase().includes('movie') ||
    event.title?.toLowerCase().includes('movie');


  const typeLabel = category?.label || (isMovie ? (t.movieNights || "Movie Night") : (t.music || "Music Event"));
  const typeColor = category?.color
    ? `bg-[${category.color}]/10 text-[${category.color}] border-[${category.color}]/20`
    : (isMovie ? "bg-amber-500/15 text-amber-300 border-amber-500/20" : "bg-violet-500/15 text-violet-300 border-violet-500/20");
  const TypeIcon = isMovie ? Film : Music;

  const statusConfig = {
    upcoming: { label: t.upcoming_status, color: "bg-emerald-500/15 text-emerald-300" },
    ongoing: { label: t.ongoing, color: "bg-amber-500/15 text-amber-300" },
    sold_out: { label: t.soldOut, color: "bg-red-500/15 text-red-300" },
    cancelled: { label: t.cancelled, color: "bg-gray-500/15 text-gray-300" },
    completed: { label: t.completed, color: "bg-gray-500/15 text-gray-400" },
  };

  const status = statusConfig[event.status] || statusConfig.upcoming;
  const isAvailable = event.status !== "sold_out" && event.status !== "cancelled" && event.status !== "completed";

  return (
    <>
      <SEO 
        title={getField(event, "title")}
        description={getField(event, "description") || event.artist_or_movie}
        image={event.image_url}
      />
      
      <div className="relative min-h-screen bg-[#0a0a0f] text-white overflow-hidden pb-20">
        {/* Ambient Blur Backdrop Glow */}
        {event.image_url && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10 select-none">
            <div 
              className="absolute -top-[20%] -left-[10%] w-[120%] h-[60%] bg-cover bg-center blur-[120px] opacity-20 scale-110"
              style={{ backgroundImage: `url(${event.image_url})` }}
            />
            <div className="absolute top-[35%] inset-x-0 bottom-0 bg-gradient-to-t from-[#0a0a0f] via-[#0a0a0f]/95 to-transparent" />
          </div>
        )}

        {/* Header */}
        <header className="sticky top-0 z-40 border-b border-white/[0.04] bg-[#0a0a0f]/60 backdrop-blur-xl">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center gap-4">
            <button
              onClick={() => navigate('/events')}
              className="p-2 hover:bg-white/5 border border-transparent hover:border-white/[0.06] rounded-xl transition-all"
              title={t.back || 'Back'}
            >
              <ArrowLeft className="w-5 h-5 text-white/80" />
            </button>
            <span className="text-sm font-medium text-white/40">Event Details</span>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-10">
          
          {/* 1. Large Premium Event Image */}
          <div className="relative rounded-3xl overflow-hidden aspect-[16/10] sm:aspect-[21/9] shadow-[0_24px_50px_rgba(0,0,0,0.4)] border border-white/[0.06]">
            {event.image_url ? (
              <img
                src={event.image_url}
                alt={getField(event, "title")}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-violet-950/40 via-zinc-950 to-amber-950/20 flex items-center justify-center">
                <TypeIcon className="w-20 h-20 text-white/10" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
          </div>

          {/* 2. Split Screen Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
            
            {/* Left Column (8 cols): Title, Support Details, Inline Metadata, Overview */}
            <div className="lg:col-span-8 space-y-8">
              
              {/* Event Title Block */}
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold tracking-wide border ${typeColor}`}>
                    <TypeIcon className="w-3.5 h-3.5 mr-1.5 shrink-0" />
                    {typeLabel}
                  </span>
                  {!isAvailable && (
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold tracking-wide border ${status.color}`}>
                      {status.label}
                    </span>
                  )}
                </div>
                
                <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight bg-gradient-to-b from-white via-white to-white/80 bg-clip-text text-transparent">
                  {getField(event, "title")}
                </h1>
                
                {event.artist_or_movie && (
                  <p className="text-lg font-medium text-white/60">
                    {translate(event.artist_or_movie)}
                  </p>
                )}
              </div>

              {/* Consolidated Inline Icon-Text Metadata (NO CARDS, very compact) */}
              <div className="space-y-4 pt-4 border-t border-white/[0.04] text-white/80">
                <div className="flex items-center gap-3.5">
                  <Calendar className="w-5 h-5 text-violet-400 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-white/30 mb-0.5">{t.dateTime || "Date & Time"}</p>
                    <p className="text-[15px] font-semibold text-white">
                      {event.date ? formatLocalizedDate(event.date, "EEEE, MMMM d, yyyy · HH:mm", lang) : "TBA"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3.5">
                  <MapPin className="w-5 h-5 text-violet-400 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-white/30 mb-0.5">{t.locationVenue || "Location & Venue"}</p>
                    <p className="text-[15px] font-semibold text-white">
                      {event.venue ? `${getField(event, "venue")}${event.city ? ` · ${translate(event.city)}` : ""}` : "TBA"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3.5">
                  <Info className="w-5 h-5 text-violet-400 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-white/30 mb-0.5">{t.availability || "Availability"}</p>
                    <p className={`text-[15px] font-bold ${
                      remaining === 0 ? "text-red-400" : "text-emerald-400"
                    }`}>
                      {remaining === 0 ? t.soldOutLabel : `${remaining} ${t.slotsLeft || "slots left"}`}
                    </p>
                  </div>
                </div>
              </div>

              {/* Overview / Description */}
              {getField(event, "description") && (
                <div className="space-y-3 pt-6 border-t border-white/[0.04]">
                  <h3 className="text-xs font-bold text-white/40 tracking-wide">{t.description || "Overview"}</h3>
                  <p className="text-white/70 text-base leading-relaxed font-light whitespace-pre-wrap">
                    {getField(event, "description")}
                  </p>
                </div>
              )}

              {/* Support Call & WhatsApp Box */}
              <div className="p-5 rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-6 border-t border-white/[0.04]">
                <div className="space-y-1">
                  <h3 className="text-xs font-bold text-white/40 tracking-wide">{t.supportTitle || "Support & Bookings"}</h3>
                  <p className="text-sm font-medium text-white/90">{t.supportSubtitle || "Need help? Call or text us directly"}</p>
                  <p className="text-xs text-white/40">{t.supportDesc || "Our team is available to assist you with booking issues or cash purchases"}</p>
                </div>
                <div className="flex gap-2 w-full sm:w-auto shrink-0">
                  <a
                    href={`tel:${event.whatsapp_number || "+237681770020"}`}
                    className="flex-1 sm:flex-none text-center px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-semibold text-xs border border-white/10 transition-all"
                  >
                    {t.callUs || "Call us"}
                  </a>
                  <a
                    href={`https://wa.me/${(event.whatsapp_number || "237681770020").replace(/[^0-9]/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 sm:flex-none text-center px-4 py-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-semibold text-xs border border-emerald-500/20 transition-all"
                  >
                    {t.whatsapp || "WhatsApp"}
                  </a>
                </div>
              </div>
              
            </div>

             {/* Right Column (4 cols): Sticky Checkout Panel */}
             <div className="lg:col-span-4 lg:sticky lg:top-24">
               <div className="p-0 lg:p-6 lg:rounded-3xl lg:border lg:border-white/[0.06] lg:bg-white/[0.02] lg:backdrop-blur-2xl lg:shadow-[0_24px_50px_rgba(0,0,0,0.5)] space-y-5">
                  <div className="flex items-center justify-between lg:block border border-white/[0.06] bg-white/[0.02] rounded-2xl p-4 lg:p-0 lg:border-none lg:bg-transparent">
                    <p className="text-xs font-semibold text-white/40 tracking-wide lg:mb-1">{t.ticketsStartingFrom || "Tickets starting from"}</p>
                    {(() => {
                      const minPrice = event.ticket_tiers?.length
                        ? Math.min(...event.ticket_tiers.map((t) => Number(t.price) || 0))
                        : (Number(event.price) || 0);

                      if (minPrice === 0) {
                        return (
                          <div className="mt-1">
                            <span className="inline-block px-3 py-1 rounded-full text-sm font-black tracking-wider uppercase bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                              FREE
                            </span>
                          </div>
                        );
                      }

                      return (
                        <p className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight">
                          {minPrice.toLocaleString()}{" "}
                          <span className="text-sm lg:text-base font-semibold text-white/40">{event.currency || "XAF"}</span>
                        </p>
                      );
                    })()}
                  </div>
 
                 <div>
                   {isAvailable ? (
                     <TicketTiers event={event} compact={true} />
                   ) : (
                     <div className="rounded-2xl border border-white/[0.05] bg-red-500/10 p-4 text-center">
                       <p className={`font-semibold text-sm ${status.color}`}>{status.label}</p>
                     </div>
                   )}
                 </div>
               </div>
             </div>

          </div>
        </main>
      </div>
    </>
  );
}
