import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import EventCard from "../components/events/EventCard";
import EventFilters from "../components/events/EventFilters";
import SoldOutBanner from "../components/events/SoldOutBanner";
import { Loader2 } from "lucide-react";
import { isSoldOut, countUsedSlots, TICKET_CAPACITY } from "@/utils/ticketCount";
import { useAuth } from "@/lib/AuthContext";
import { useLang } from "@/lib/LanguageContext";

export default function Events() {
  const [filter, setFilter] = useState("all");
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const { t } = useLang();

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('Event')
        .select('*')
        .order('date', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: bookings = [] } = useQuery({
    queryKey: ["bookings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('Booking')
        .select('*')
        .order('created_date', { ascending: false })
        .limit(200);
      if (error) throw error;
      return data || [];
    },
  });

  const soldOut = isSoldOut(bookings);
  const usedSlots = countUsedSlots(bookings);

  const filtered = filter === "all"
    ? events
    : events.filter((e) => e.type === filter);

  const upcoming = filtered.filter(e => e.status === "upcoming" || e.status === "ongoing" || !e.status);
  const past = filtered.filter(e => e.status === "completed" || e.status === "cancelled");

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">{t.eventsTitle}</h1>
        <p className="text-white/40">{t.eventsSubtitle}</p>
      </div>

      {soldOut && <div className="mb-6"><SoldOutBanner /></div>}


      <EventFilters activeFilter={filter} onFilterChange={setFilter} />

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
        </div>
      ) : (
        <>
          {upcoming.length > 0 && (
            <div className="mt-8">
              <h2 className="text-sm font-medium text-white/30 uppercase tracking-wider mb-5">
                {t.upcomingLabel} · {upcoming.length} {upcoming.length !== 1 ? t.events_plural : t.event}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {upcoming.map((event, i) => (
                  <EventCard key={event.id} event={event} index={i} />
                ))}
              </div>
            </div>
          )}

          {past.length > 0 && (
            <div className="mt-16">
              <h2 className="text-sm font-medium text-white/30 uppercase tracking-wider mb-5">
                {t.pastEvents}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 opacity-60">
                {past.map((event, i) => (
                  <EventCard key={event.id} event={event} index={i} />
                ))}
              </div>
            </div>
          )}

          {filtered.length === 0 && (
            <div className="text-center py-20">
              <p className="text-white/30 text-lg">{t.noEvents}</p>
            </div>
          )}
        </>
      )}

    </div>
  );
}