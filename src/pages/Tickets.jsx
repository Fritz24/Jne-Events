import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Calendar, ChevronRight, Clock, Loader2, MapPin, Ticket, TicketCheck, User } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";
import { useLocalized } from "@/lib/LanguageContext";
import SEO from "@/components/common/SEO";
import { formatLocalizedDate } from "@/lib/localize";
import { getLocalTickets } from "@/lib/tickets";

export default function Tickets() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, lang, getField } = useLocalized();
  const [localTickets, setLocalTickets] = useState(() => getLocalTickets());

  useEffect(() => {
    setLocalTickets(getLocalTickets());
  }, []);

  const { data: bookings = [], isLoading: bookingsLoading } = useQuery({
    queryKey: ["my_tickets", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('jne_bookings')
        .select('*')
        .eq('user_id', user.id)
        .in('status', ['confirmed', 'checked_in'])
        .order('created_date', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const eventIds = useMemo(() => {
    const ids = [...bookings, ...localTickets]
      .map((ticket) => ticket.event_id)
      .filter(Boolean);
    return Array.from(new Set(ids));
  }, [bookings, localTickets]);

  const { data: events = [] } = useQuery({
    queryKey: ["my_tickets_events", eventIds.join(',')],
    enabled: eventIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('jne_events')
        .select('*')
        .in('id', eventIds);
      if (error) throw error;
      return data || [];
    },
  });

  const eventsById = useMemo(
    () => Object.fromEntries(events.map((event) => [event.id, event])),
    [events]
  );

  const tickets = useMemo(() => {
    const merged = [
      ...bookings.map((booking) => ({ ...booking, source: 'account' })),
      ...localTickets.map((booking) => ({ ...booking, source: booking.source || 'guest' })),
    ];

    const deduped = merged.filter(
      (ticket, index, array) => index === array.findIndex((item) => item.ticket_id === ticket.ticket_id)
    );

    return deduped
      .map((ticket) => ({
        ...ticket,
        event: ticket.event_snapshot || eventsById[ticket.event_id] || null,
      }))
      .sort((a, b) => {
        const aTime = new Date(a.created_date || a.saved_at || 0).getTime();
        const bTime = new Date(b.created_date || b.saved_at || 0).getTime();
        return bTime - aTime;
      });
  }, [bookings, eventsById, localTickets]);

  const [showPast, setShowPast] = useState(false);

  const { upcomingTickets, pastTickets } = useMemo(() => {
    const upcoming = [];
    const past = [];
    const now = new Date();

    tickets.forEach((ticket) => {
      const eventDate = ticket.event?.date;
      if (eventDate && new Date(eventDate) < now) {
        past.push(ticket);
      } else {
        upcoming.push(ticket);
      }
    });

    return { upcomingTickets: upcoming, pastTickets: past };
  }, [tickets]);

  const hasGuestTickets = tickets.some((ticket) => ticket.source === 'guest');

  return (
    <>
      <SEO
        title={t.myTickets || 'My Tickets'}
        description={t.ticketsSubheading || "View the tickets you've purchased"}
      />

      <div className="min-h-screen bg-[#0a0a0f] text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-8">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/[0.03] text-white/60 text-xs font-medium mb-4">
                <Ticket className="w-3.5 h-3.5" />
                {t.myTickets || 'My Tickets'}
              </div>
              <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-white">
                {t.myTickets || 'My Tickets'}
              </h1>
              <p className="text-white/45 mt-2 max-w-2xl">
                {t.ticketsSubheading || "View the tickets you've purchased"}
              </p>
            </div>

            <button
              onClick={() => navigate('/events')}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 text-sm font-medium text-white transition-colors"
            >
              {t.browseEvents || 'Browse Events'}
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {bookingsLoading && user?.id && tickets.length === 0 ? (
            <div className="min-h-[40vh] flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
            </div>
          ) : tickets.length === 0 ? (
            <div className="min-h-[56vh] flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mb-6">
                <Ticket className="w-8 h-8 text-violet-300" />
              </div>
              <h2 className="text-2xl font-semibold text-white mb-2">
                {t.ticketsEmptyTitle || 'No Tickets Yet'}
              </h2>
              <p className="text-white/45 mb-8 max-w-sm leading-relaxed">
                {user?.id
                  ? (t.ticketsEmptyUser || 'Once you purchase a ticket, it will appear here for quick access.')
                  : (t.ticketsEmptyGuest || 'Guest purchases stay on this device. Sign in to keep your tickets synced across devices.')}
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={() => navigate('/events')}
                  className="px-6 py-3 rounded-full bg-violet-600 hover:bg-violet-500 text-white font-semibold transition-colors"
                >
                  Find Some Fun!
                </button>
                {!user?.id && (
                  <button
                    onClick={() => navigate('/login')}
                    className="px-6 py-3 rounded-full bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 text-white font-semibold transition-colors"
                  >
                    Sign In to Sync
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="grid gap-6">
              {hasGuestTickets && (
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/55 flex items-center gap-2">
                  <User className="w-4 h-4 text-violet-300" />
                  {t.ticketsGuestNote || 'Guest purchases are saved on this device.'}
                </div>
              )}

              {/* Upcoming Tickets */}
              {upcomingTickets.length > 0 ? (
                <div className="grid gap-4 sm:gap-5">
                  {upcomingTickets.map((ticket) => (
                    <TicketRow
                      key={ticket.ticket_id}
                      ticket={ticket}
                      navigate={navigate}
                      getField={getField}
                      lang={lang}
                      t={t}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 rounded-3xl border border-white/5 bg-white/[0.01] text-white/40">
                  No upcoming tickets.
                </div>
              )}

              {/* Past Tickets Toggle & Container */}
              {pastTickets.length > 0 && (
                <div className="mt-6 flex flex-col items-center gap-6">
                  <button
                    onClick={() => setShowPast(!showPast)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-sm font-medium text-white/70 hover:text-white transition-all shadow-md"
                  >
                    <Clock className="w-4 h-4 text-violet-400" />
                    <span>
                      {showPast ? `Hide past tickets (${pastTickets.length})` : `Show past tickets (${pastTickets.length})`}
                    </span>
                  </button>

                  {showPast && (
                    <div className="w-full space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                      <div className="flex items-center gap-3">
                        <div className="h-px flex-1 bg-white/10" />
                        <span className="text-xs uppercase tracking-widest text-white/30 font-bold">Past Tickets</span>
                        <div className="h-px flex-1 bg-white/10" />
                      </div>
                      <div className="grid gap-4 sm:gap-5">
                        {pastTickets.map((ticket) => (
                          <TicketRow
                            key={ticket.ticket_id}
                            ticket={ticket}
                            navigate={navigate}
                            getField={getField}
                            lang={lang}
                            t={t}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function TicketRow({ ticket, navigate, getField, lang, t }) {
  const event = ticket.event;
  const dateValue = event?.date || ticket.created_date || ticket.saved_at;
  const status = ticket.status === 'checked_in' ? 'Checked In' : 'Confirmed';
  const statusClass = ticket.status === 'checked_in'
    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20'
    : 'bg-violet-500/15 text-violet-300 border-violet-500/20';

  return (
    <article className="rounded-[1.75rem] border border-white/10 bg-white/[0.03] backdrop-blur-xl overflow-hidden shadow-[0_24px_64px_rgba(0,0,0,0.28)]">
      <div className="grid lg:grid-cols-[220px_1fr]">
        <div className="relative min-h-[220px] lg:min-h-full">
          {event?.image_url ? (
            <img
              src={event.image_url}
              alt={getField(event, 'title') || ticket.event_title}
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-violet-900/50 via-zinc-900 to-amber-900/20" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
          <div className="absolute bottom-4 left-4 right-4">
            <p className="text-xs uppercase tracking-[0.2em] text-white/60 mb-2">Ticket ID</p>
            <p className="text-white font-mono text-sm break-all">{ticket.ticket_id}</p>
          </div>
        </div>

        <div className="p-5 sm:p-6 lg:p-7 flex flex-col gap-5">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-white/40 mb-2">
                {ticket.source === 'guest' ? (t.ticketsSavedDevice || 'Saved on this device') : (t.ticketsPurchased || 'Purchased ticket')}
              </p>
              <h2 className="text-2xl font-semibold text-white leading-tight">
                {event ? getField(event, 'title') : ticket.event_title}
              </h2>
              <p className="text-white/45 mt-2 max-w-2xl line-clamp-2">
                {ticket.tier_label}
                {ticket.attendee_name ? ` • ${ticket.attendee_name}` : ''}
              </p>
            </div>

            <span className={`inline-flex items-center self-start px-3 py-1.5 rounded-full border text-xs font-semibold ${statusClass}`}>
              {status}
            </span>
          </div>

          <div className="grid sm:grid-cols-3 gap-3 text-sm">
            <TicketMeta icon={Calendar} label="Date" value={dateValue ? formatLocalizedDate(dateValue, 'EEE, MMM d, yyyy', lang) : 'TBA'} />
            <TicketMeta icon={Clock} label="Time" value={dateValue ? formatLocalizedDate(dateValue, 'HH:mm', lang) : 'TBA'} />
            <TicketMeta icon={MapPin} label="Venue" value={event?.venue || 'TBA'} />
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between pt-1">
            <div className="flex items-center gap-2 text-white/45 text-sm">
              <TicketCheck className="w-4 h-4 text-emerald-400" />
              <span>{ticket.currency || event?.currency || 'XAF'} {Number(ticket.tier_price || 0).toLocaleString()}</span>
            </div>

            <button
              onClick={() => event?.id && navigate(`/events/${event.id}`)}
              disabled={!event?.id}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 text-sm font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t.ticketsOpenEvent || 'Open Event'}
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

function TicketMeta({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
      <div className="flex items-center gap-2 text-white/35 text-[11px] uppercase tracking-[0.18em] mb-2">
        <Icon className="w-3.5 h-3.5" />
        {label}
      </div>
      <p className="text-white text-sm font-medium leading-snug">{value}</p>
    </div>
  );
}