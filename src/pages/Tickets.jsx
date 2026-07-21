import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Calendar, ChevronRight, Clock, ExternalLink, Loader2, MapPin, Ticket, User } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
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
                  {t.noUpcomingTickets || "No upcoming tickets."}
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
                      {showPast ? `${t.hidePastTickets || "Hide past tickets"} (${pastTickets.length})` : `${t.showPastTickets || "Show past tickets"} (${pastTickets.length})`}
                    </span>
                  </button>

                  {showPast && (
                    <div className="w-full space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                      <div className="flex items-center gap-3">
                        <div className="h-px flex-1 bg-white/10" />
                        <span className="text-xs text-white/30 font-bold">{t.pastTickets || "Past Tickets"}</span>
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
  const isCheckedIn = ticket.status === 'checked_in';
  const isConfirmed = ticket.status === 'confirmed';

  const statusLabel = isCheckedIn ? 'Checked In' : isConfirmed ? 'Confirmed' : 'Pending';
  const statusStyle = isCheckedIn
    ? { background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.25)', color: '#6ee7b7' }
    : isConfirmed
    ? { background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.3)', color: '#d4af37' }
    : { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' };

  const displayName = ticket.attendee_name || 'Guest';
  const displayId = ticket.ticket_id || 'N/A';
  const shortId = displayId.slice(-8).toUpperCase();

  return (
    <article
      className="relative overflow-hidden"
      style={{
        borderRadius: '20px',
        background: 'linear-gradient(160deg, #0f0f1c 0%, #0a0a12 100%)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(212,175,55,0.12)',
      }}
    >
      {/* Top gold accent line */}
      <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(to right, transparent, rgba(212,175,55,0.5), transparent)' }} />

      <div className="grid lg:grid-cols-[200px_1fr_auto]">
        {/* === LEFT: Poster Image === */}
        <div className="relative min-h-[180px] lg:min-h-full overflow-hidden" style={{ borderRadius: '20px 0 0 20px' }}>
          {/* Film strip holes along top */}
          <div className="absolute top-0 left-0 right-0 h-5 flex items-center justify-around px-2 z-10" style={{ background: 'rgba(0,0,0,0.5)' }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="w-2.5 h-3 rounded-sm" style={{ background: '#0a0a12', border: '1px solid rgba(212,175,55,0.15)' }} />
            ))}
          </div>

          {event?.image_url ? (
            <img
              src={event.image_url}
              alt={getField(event, 'title') || ticket.event_title}
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, #1a0a2e 0%, #2d1b00 50%, #0a0a12 100%)' }} />
          )}
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, rgba(13,13,28,0) 50%, rgba(10,10,18,0.95) 100%)' }} />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, transparent 30%)' }} />

          {/* ADMIT ONE badge */}
          <div className="absolute bottom-3 left-3 px-2 py-0.5 text-[8px] font-black tracking-[0.2em] uppercase" style={{ background: 'linear-gradient(135deg, #d4af37, #f5d96b)', color: '#0a0a12', borderRadius: '4px' }}>
            ADMIT ONE
          </div>
        </div>

        {/* === MIDDLE: Ticket Info === */}
        <div className="relative p-5 sm:p-6 flex flex-col gap-4">
          {/* Vertical dashed tear line on right (desktop) */}
          <div className="hidden lg:block absolute right-0 top-4 bottom-4 w-px" style={{ borderRight: '1.5px dashed rgba(212,175,55,0.2)' }} />
          <div className="hidden lg:block absolute right-[-9px] top-[50%] translate-y-[-50%] w-[18px] h-[18px] rounded-full z-20" style={{ background: '#0a0a12', border: '1px solid rgba(212,175,55,0.2)' }} />

          {/* Header row */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div className="min-w-0">
              {/* Source label */}
              <div className="flex items-center gap-1.5 mb-2">
                <div className="w-1 h-1 rounded-full" style={{ background: '#d4af37' }} />
                <span className="text-[9px] font-bold tracking-[0.2em] uppercase" style={{ color: 'rgba(212,175,55,0.6)' }}>
                  JNE Events {ticket.source === 'guest' ? '· Guest Ticket' : '· Account Ticket'}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white leading-tight">
                {event ? getField(event, 'title') : ticket.event_title}
              </h2>
              <div
                className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase rounded-full"
                style={{ background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.25)', color: '#d4af37' }}
              >
                {ticket.tier_label || 'Standard'}
              </div>
            </div>

            <span
              className="inline-flex items-center self-start px-3 py-1.5 rounded-full text-xs font-bold shrink-0"
              style={statusStyle}
            >
              {statusLabel}
            </span>
          </div>

          {/* Meta info row */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            <TicketMeta icon={Calendar} label="Date" value={dateValue ? formatLocalizedDate(dateValue, 'EEE, MMM d', lang) : 'TBA'} />
            <TicketMeta icon={Clock} label="Time" value={dateValue ? formatLocalizedDate(dateValue, 'HH:mm', lang) : 'TBA'} />
            <TicketMeta icon={MapPin} label="Venue" value={event?.venue || 'TBA'} />
          </div>

          {/* Attendee + price + action row */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-1">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 font-black text-xs"
                style={{ background: 'linear-gradient(135deg, #d4af37, #b8940a)', color: '#0a0a12' }}
              >
                {displayName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-[9px] font-bold tracking-widest uppercase" style={{ color: 'rgba(212,175,55,0.5)' }}>Attendee</p>
                <p className="text-white text-sm font-semibold truncate">{displayName}</p>
              </div>
              <div className="ml-auto sm:ml-4 text-right">
                <p className="text-[9px] font-bold tracking-widest uppercase" style={{ color: 'rgba(212,175,55,0.5)' }}>Paid</p>
                <p className="text-white text-sm font-bold">{ticket.currency || event?.currency || 'XAF'} {Number(ticket.tier_price || 0).toLocaleString()}</p>
              </div>
            </div>

            <button
              onClick={() => event?.id && navigate(`/events/${event.id}`)}
              disabled={!event?.id}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold text-white transition-all shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.25)' }}
            >
              {t.ticketsOpenEvent || 'Open Event'}
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* === RIGHT STUB: QR Code === */}
        <div className="hidden lg:flex flex-col items-center justify-center px-5 gap-3" style={{ background: 'rgba(0,0,0,0.3)' }}>
          <div className="p-2 rounded-xl" style={{ background: '#fff' }}>
            <QRCodeSVG
              value={displayId}
              size={72}
              level="H"
              includeMargin={false}
              fgColor="#0a0a12"
              bgColor="#ffffff"
            />
          </div>
          <p className="text-[8px] font-mono text-white/30 text-center tracking-wider">{shortId}</p>
        </div>
      </div>

      {/* Bottom gold accent line */}
      <div className="absolute bottom-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(to right, transparent, rgba(212,175,55,0.3), transparent)' }} />
    </article>
  );
}

function TicketMeta({ icon: Icon, label, value }) {
  return (
    <div className="rounded-xl px-3 py-2.5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(212,175,55,0.1)' }}>
      <div className="flex items-center gap-1.5 mb-1" style={{ color: 'rgba(212,175,55,0.5)' }}>
        <Icon className="w-3 h-3" />
        <span className="text-[8px] font-bold tracking-widest uppercase">{label}</span>
      </div>
      <p className="text-white text-xs font-semibold leading-snug">{value}</p>
    </div>
  );
}