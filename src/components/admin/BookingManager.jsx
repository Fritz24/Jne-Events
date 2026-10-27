import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { XCircle, UserCheck, Search, Trash2, Download, RefreshCw, Ticket, Banknote, Calendar } from "lucide-react";
import { countUsedSlots, remainingSlots } from "@/utils/ticketCount";
import TicketGenerator from "./TicketGenerator";
import VerticalTicket from "../events/VerticalTicket";

const STATUS_CONFIG = {
  pending: { label: "Pending", color: "bg-yellow-500/15 text-yellow-300" },
  confirmed: { label: "Confirmed", color: "bg-blue-500/15 text-blue-300" },
  checked_in: { label: "Checked In", color: "bg-emerald-500/15 text-emerald-300" },
  cancelled: { label: "Cancelled", color: "bg-zinc-500/15 text-zinc-300" },
  failed: { label: "Failed", color: "bg-red-500/15 text-red-400 border border-red-500/10" },
};

export default function BookingManager() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterEvent, setFilterEvent] = useState("all");
  const [verifyingId, setVerifyingId] = useState(null);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [viewingTicketBooking, setViewingTicketBooking] = useState(null);

  const verifyPaymentStatus = async (booking) => {
    setVerifyingId(booking.id);
    try {
      const response = await fetch(`/api/payunit-status?transactionId=${booking.ticket_id}`);
      const data = await response.json();
      if (response.ok && data.data?.transaction_status === "SUCCESS") {
        const { error } = await supabase
          .from('jne_bookings')
          .update({ status: 'confirmed', failure_reason: null })
          .eq('id', booking.id);
        if (error) throw error;
        qc.invalidateQueries({ queryKey: ["bookings"] });
        alert(`Payment verified successfully! Status updated to Confirmed for ${booking.attendee_name}.`);
      } else {
        const payunitStatus = data.data?.transaction_status || "FAILED";
        // Update database to reflect terminal failure status if it is returned as FAILED or CANCELLED
        if (payunitStatus === "FAILED" || payunitStatus === "CANCELLED") {
          const reason = data.data?.message || data.message || "Payment status check returned failure.";
          const { error: dbErr } = await supabase
            .from('jne_bookings')
            .update({ 
              status: payunitStatus.toLowerCase(),
              failure_reason: reason
            })
            .eq('id', booking.id);
            
          if (dbErr) {
            // Fallback if column does not exist
            await supabase
              .from('jne_bookings')
              .update({ status: payunitStatus.toLowerCase() })
              .eq('id', booking.id);
          }
          qc.invalidateQueries({ queryKey: ["bookings"] });
        }
        alert(`Payment verification failed: Status on PayUnit is ${payunitStatus}. Reason: ${data.data?.message || data.message || "None specified"}`);
      }
    } catch (err) {
      console.error(err);
      alert("Error verifying payment: " + err.message);
    } finally {
      setVerifyingId(null);
    }
  };

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ["bookings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('jne_bookings')
        .select('*')
        .order('created_date', { ascending: false });
      if (error) throw error;
      if (data && data.length > 0) {
        try {
          localStorage.setItem("jne_cached_admin_bookings", JSON.stringify(data));
        } catch (e) {}
      }
      return data || [];
    },
    placeholderData: () => {
      try {
        const saved = localStorage.getItem("jne_cached_admin_bookings");
        return saved ? JSON.parse(saved) : undefined;
      } catch (e) {
        return undefined;
      }
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }) => {
      const { error } = await supabase
        .from('jne_bookings')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
    },
    // Instant optimistic update on 2G: updates UI and local cache in 0ms
    onMutate: async ({ id, status }) => {
      await qc.cancelQueries({ queryKey: ["bookings"] });
      const previous = qc.getQueryData(["bookings"]);
      if (previous) {
        const updated = previous.map(b => b.id === id ? { ...b, status } : b);
        qc.setQueryData(["bookings"], updated);
        try {
          localStorage.setItem("jne_cached_admin_bookings", JSON.stringify(updated));
        } catch (e) {}
      }
      return { previous };
    },
    onError: (err, variables, context) => {
      if (context?.previous) {
        qc.setQueryData(["bookings"], context.previous);
      }
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["bookings"] }),
  });

  const deleteBooking = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from('jne_bookings')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bookings"] }),
  });

  const { data: eventsData = [] } = useQuery({
    queryKey: ["events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('jne_events')
        .select('*')
        .order('date', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const resolveBookingEvent = (b) => {
    if (!b) return null;
    if (b.event_id) {
      return eventsData.find(e => e.id === b.event_id) || null;
    }
    if (b.event_title) {
      return eventsData.find(e => e.title === b.event_title) || null;
    }
    return null;
  };

  // Map events to their exact dates so recurring/identically named events
  // (e.g. "Movie Night Under the Stars") can be filtered precisely by scheduled edition
  const eventOptions = useMemo(() => {
    const map = new Map();
    eventsData.forEach(e => {
      let dateFormatted = "Date TBA";
      let timeFormatted = "";
      if (e.date) {
        try {
          const d = new Date(e.date);
          dateFormatted = format(d, "d MMM yyyy");
          timeFormatted = format(d, "HH:mm");
        } catch (err) {}
      }
      const timePart = timeFormatted && timeFormatted !== "00:00" ? ` • ${timeFormatted}` : "";
      map.set(e.id, {
        id: e.id,
        label: `${dateFormatted} — ${e.title}${timePart}`,
        title: e.title,
        date: e.date,
        rawDate: e.date ? new Date(e.date).getTime() : 0,
      });
    });

    // Also include any bookings with event_id not in eventsData
    bookings.forEach(b => {
      if (b.event_id && !map.has(b.event_id)) {
        map.set(b.event_id, {
          id: b.event_id,
          label: `${b.event_title || "Event"} (${b.event_id.slice(0, 6)})`,
          title: b.event_title,
          date: null,
          rawDate: 0,
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => b.rawDate - a.rawDate);
  }, [eventsData, bookings]);

  const filtered = bookings.filter(b => {
    const matchSearch =
      b.attendee_name?.toLowerCase().includes(search.toLowerCase()) ||
      b.ticket_id?.toLowerCase().includes(search.toLowerCase()) ||
      b.event_title?.toLowerCase().includes(search.toLowerCase()) ||
      (b.phone && b.phone.includes(search));
    const matchStatus = filterStatus === "all" || b.status === filterStatus;

    const selectedOption = eventOptions.find(o => o.id === filterEvent);
    const matchEvent =
      filterEvent === "all" ||
      b.event_id === filterEvent ||
      (!b.event_id && selectedOption && b.event_title === selectedOption.title);

    return matchSearch && matchStatus && matchEvent;
  });

  const downloadCSV = () => {
    const rows = [
      ["Attendee Name", "Phone Number", "Payment Method", "Ticket ID", "Event", "Event Date", "Tier", "Price", "Currency", "Status", "Failure Reason", "Booking Date"],
      ...filtered.map(b => {
        const ev = resolveBookingEvent(b);
        return [
          b.attendee_name,
          b.phone ?? "N/A",
          b.payment_method ?? "Manual",
          b.ticket_id,
          b.event_title,
          ev?.date ? format(new Date(ev.date), "yyyy-MM-dd HH:mm") : "N/A",
          b.tier_label,
          b.tier_price ?? "",
          b.currency ?? "XAF",
          b.status,
          b.failure_reason ?? "",
          b.created_date ? format(new Date(b.created_date), "yyyy-MM-dd HH:mm") : "",
        ];
      }),
    ];
    const csv = rows.map(r => r.map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const selectedOpt = eventOptions.find(o => o.id === filterEvent);
    const eventSlug = selectedOpt
      ? `-${selectedOpt.label.replace(/[^a-zA-Z0-9_-]+/g, "-")}`
      : (filterEvent !== "all" ? `-${filterEvent.replace(/[^a-zA-Z0-9_-]+/g, "-")}` : "");
    a.download = `bookings${eventSlug}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const counts = bookings.reduce((acc, b) => {
    acc[b.status] = (acc[b.status] || 0) + 1;
    return acc;
  }, {});

  const selectedEventOption = filterEvent !== "all" ? eventOptions.find(o => o.id === filterEvent) : null;
  const selectedEvent = filterEvent !== "all"
    ? eventsData.find(e => e.id === filterEvent || e.title === filterEvent)
    : null;
  const selectedEventLabel = selectedEventOption?.label || selectedEvent?.title || filterEvent;
  const eventCapacity = selectedEvent?.capacity || 50;
  const usedSlots = countUsedSlots(filterEvent !== "all" ? filtered : bookings);
  const remaining = filterEvent !== "all" ? remainingSlots(filtered, eventCapacity) : 0;

  const totalGrossRevenue = bookings
    .filter(b => b.status === "confirmed" || b.status === "checked_in")
    .reduce((sum, b) => sum + (Number(b.tier_price) || 0), 0);

  const filteredRevenue = filtered
    .filter(b => b.status === "confirmed" || b.status === "checked_in")
    .reduce((sum, b) => sum + (Number(b.tier_price) || 0), 0);

  const paidCount = (filterEvent !== "all" ? filtered : bookings)
    .filter(b => b.status === "confirmed" || b.status === "checked_in").length;

  if (isLoading) return (
    <div className="text-white/40 text-center py-10">Loading bookings...</div>
  );

  return (
    <div className="space-y-5">
      {/* Revenue Summary Banner */}
      <div className="rounded-xl bg-[#0e0e14] border border-white/10 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#181822] border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            <Banknote className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-emerald-400 font-semibold uppercase tracking-wider">
              {filterEvent !== "all" ? `Ticket Revenue (${selectedEventLabel})` : "Total Confirmed Ticket Revenue"}
            </div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-white">
              {(filterEvent !== "all" ? filteredRevenue : totalGrossRevenue).toLocaleString()} <span className="text-xs font-sans text-emerald-400">XAF</span>
              {filterEvent !== "all" && (
                <span className="text-xs text-white/40 font-normal font-sans ml-2.5">
                  (All events: {totalGrossRevenue.toLocaleString()} XAF)
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300">
            <span className="font-bold text-white font-mono">{paidCount}</span> paid tickets
          </div>
        </div>
      </div>

      {/* Capacity Bar - Only show when a specific event is selected */}
      {filterEvent !== "all" && (
        <div className="rounded-xl bg-white/[0.03] border border-white/5 p-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-white/60 font-medium">Ticket Capacity ({selectedEventLabel})</span>
            <span className={`font-bold ${remaining === 0 ? "text-red-400" : "text-white"}`}>
              {usedSlots} / {eventCapacity} slots used
              {remaining === 0 && " · SOLD OUT 🎉"}
              {remaining > 0 && <span className="text-white/40 font-normal"> ({remaining} remaining)</span>}
            </span>
          </div>
          <div className="w-full bg-white/5 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${remaining === 0 ? "bg-red-500" : "bg-violet-500"}`}
              style={{ width: `${Math.min(100, (usedSlots / eventCapacity) * 100)}%` }}
            />
          </div>
          <p className="text-xs text-white/30">Note: "Date Night" tier counts as 2 slots per booking.</p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
          <div key={key} className="rounded-xl bg-white/[0.03] border border-white/5 p-3">
            <div className="text-2xl font-bold text-white">{counts[key] || 0}</div>
            <div className="text-xs text-white/40 mt-0.5">{cfg.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, ticket ID or event..."
            className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-white/30"
          />
        </div>
        <Select value={filterEvent} onValueChange={setFilterEvent}>
          <SelectTrigger className="bg-white/5 border-white/10 text-white w-full sm:w-80 md:w-96 text-left">
            <SelectValue placeholder="All Events (All Dates)" />
          </SelectTrigger>
          <SelectContent className="max-h-80 bg-[#14141c] border-white/10 text-white">
            <SelectItem value="all">All Events (All Dates)</SelectItem>
            {eventOptions.map(opt => (
              <SelectItem key={opt.id} value={opt.id}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="bg-white/5 border-white/10 text-white w-full sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
              <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          onClick={() => setShowTicketModal(true)}
          className="bg-emerald-600 hover:bg-emerald-500 text-white gap-2 shrink-0 border border-emerald-500/20 shadow-md"
        >
          <Ticket className="w-4 h-4" />
          + Manual Ticket
        </Button>
        <Button
          type="button"
          onClick={downloadCSV}
          className="bg-violet-600 hover:bg-violet-500 text-white gap-2 shrink-0 border border-violet-500/20 shadow-md"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </Button>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-white/30">No bookings found.</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/5">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 text-left text-white/30 text-xs">
                <th className="pb-3 pt-3 pl-4 font-medium">Attendee</th>
                <th className="pb-3 pt-3 font-medium hidden sm:table-cell">Event & Scheduled Date</th>
                <th className="pb-3 pt-3 font-medium hidden md:table-cell">Tier</th>
                <th className="pb-3 pt-3 font-medium hidden lg:table-cell">Ticket ID</th>
                <th className="pb-3 pt-3 font-medium hidden md:table-cell">Exact Booking Date</th>
                <th className="pb-3 pt-3 font-medium">Status</th>
                <th className="pb-3 pt-3 pr-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map(b => {
                const cfg = STATUS_CONFIG[b.status] || STATUS_CONFIG.pending;
                const eventObj = resolveBookingEvent(b);
                const eventDateFormatted = eventObj?.date
                  ? format(new Date(eventObj.date), "EEE, d MMM yyyy • HH:mm")
                  : (b.event_title ? "Date TBA" : "—");
                const bookingDateFormatted = b.created_date
                  ? format(new Date(b.created_date), "d MMM yyyy")
                  : "—";
                const bookingTimeFormatted = b.created_date
                  ? format(new Date(b.created_date), "h:mm:ss a")
                  : "";

                return (
                  <tr key={b.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5 pl-4 text-white font-medium align-top">
                      <div className="font-semibold text-white text-sm">{b.attendee_name}</div>
                      {b.phone && <div className="text-xs text-white/40 font-normal mt-0.5">{b.phone}</div>}

                      {/* Mobile card info: Event scheduled edition & exact booking date display */}
                      <div className="sm:hidden mt-2 space-y-1.5 pt-1.5 border-t border-white/5 text-xs font-normal">
                        <div className="flex items-start gap-1.5 text-violet-300">
                          <Calendar className="w-3.5 h-3.5 shrink-0 text-violet-400 mt-0.5" />
                          <span className="font-medium text-white/90">
                            {eventObj?.date ? format(new Date(eventObj.date), "d MMM yyyy") : "Date TBA"} — {b.event_title}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs font-mono">
                          <span className="text-white/40">Booked:</span>
                          <span className="text-emerald-400 font-medium">
                            {b.created_date ? format(new Date(b.created_date), "d MMM yyyy, h:mm a") : "—"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-white/50">
                          <span className="text-white/70">{b.tier_label}</span>
                          {b.payment_method && (
                            <span className="text-[10px] text-violet-400 font-bold uppercase tracking-wider bg-violet-500/10 px-1.5 py-0.5 rounded border border-violet-500/20">
                              {b.payment_method}
                            </span>
                          )}
                          <span className="font-mono text-[10px] text-white/30 truncate">{b.ticket_id}</span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 text-white/80 hidden sm:table-cell align-top">
                      <div className="font-medium text-white text-sm">{b.event_title}</div>
                      <div className="text-xs text-violet-400 flex items-center gap-1 mt-0.5 font-normal">
                        <Calendar className="w-3 h-3 text-violet-400/80 shrink-0" />
                        <span>{eventDateFormatted}</span>
                      </div>
                    </td>

                    <td className="py-3.5 text-white/60 hidden md:table-cell align-top text-xs">
                      <div className="font-medium text-white/80">{b.tier_label}</div>
                      {b.payment_method && (
                        <div className="text-[10px] text-violet-400 font-bold uppercase tracking-wider mt-0.5">
                          {b.payment_method}
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 text-white/40 font-mono text-xs hidden lg:table-cell align-top">{b.ticket_id}</td>

                    <td className="py-3.5 hidden md:table-cell align-top font-mono">
                      <div className="text-white/90 text-xs font-medium">{bookingDateFormatted}</div>
                      {bookingTimeFormatted && (
                        <div className="text-[11px] text-white/40 mt-0.5">{bookingTimeFormatted}</div>
                      )}
                    </td>

                    <td className="py-3.5 align-top">
                      <Badge className={`${cfg.color} text-xs`}>{cfg.label}</Badge>
                      {b.failure_reason && b.status !== "confirmed" && b.status !== "checked_in" && (
                        <div className="text-[10px] text-red-400 mt-1 max-w-[140px] leading-tight break-words font-normal" title={b.failure_reason}>
                          {b.failure_reason}
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 pr-4 align-top">
                      <div className="flex items-center justify-end gap-1">
                        {(b.status === "confirmed" || b.status === "checked_in" || b.ticket_id) && (
                          <Button
                            size="icon"
                            variant="ghost"
                            title="View & Download Ticket Pass"
                            onClick={() => setViewingTicketBooking(b)}
                            className="w-7 h-7 text-amber-400/80 hover:text-amber-300 hover:bg-amber-500/10"
                          >
                            <Ticket className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        {b.status !== "confirmed" && b.status !== "checked_in" && (
                          <Button
                            size="icon"
                            variant="ghost"
                            title="Verify Payment Status"
                            disabled={verifyingId === b.id}
                            onClick={() => verifyPaymentStatus(b)}
                            className="w-7 h-7 text-violet-400/60 hover:text-violet-400 hover:bg-violet-500/10"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${verifyingId === b.id ? "animate-spin" : ""}`} />
                          </Button>
                        )}
                        {b.status !== "checked_in" && (
                          <Button
                            size="icon"
                            variant="ghost"
                            title="Mark Checked In"
                            onClick={() => updateStatus.mutate({ id: b.id, status: "checked_in" })}
                            className="w-7 h-7 text-emerald-400/60 hover:text-emerald-400 hover:bg-emerald-500/10"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        {b.status !== "cancelled" && (
                          <Button
                            size="icon"
                            variant="ghost"
                            title="Cancel"
                            onClick={() => updateStatus.mutate({ id: b.id, status: "cancelled" })}
                            className="w-7 h-7 text-red-400/60 hover:text-red-400 hover:bg-red-500/10"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Delete"
                          onClick={() => deleteBooking.mutate(b.id)}
                          className="w-7 h-7 text-white/20 hover:text-red-400 hover:bg-red-500/10"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showTicketModal && (
        <TicketGenerator
          events={eventsData}
          onClose={() => setShowTicketModal(false)}
          onSaved={() => qc.invalidateQueries({ queryKey: ["bookings"] })}
        />
      )}

      {viewingTicketBooking && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#0e0e16] border border-amber-500/30 rounded-2xl p-6 max-w-md w-full relative my-auto shadow-2xl flex flex-col items-center">
            <div className="w-full flex items-center justify-between mb-4 border-b border-white/10 pb-3">
              <div>
                <h3 className="text-white font-bold text-base flex items-center gap-2">
                  <Ticket className="w-4 h-4 text-amber-400" />
                  Ticket Pass
                </h3>
                <p className="text-xs text-white/40">{viewingTicketBooking.attendee_name} • {viewingTicketBooking.ticket_id}</p>
              </div>
              <button
                onClick={() => setViewingTicketBooking(null)}
                className="text-white/40 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="w-full flex justify-center py-2">
              <VerticalTicket
                booking={viewingTicketBooking}
                event={resolveBookingEvent(viewingTicketBooking)}
                attendeeName={viewingTicketBooking.attendee_name}
                tierLabel={viewingTicketBooking.tier_label}
                ticketId={viewingTicketBooking.ticket_id}
                showActions={true}
                showDone={false}
              />
            </div>

            {viewingTicketBooking.phone && (
              <div className="w-full mt-4 pt-3 border-t border-white/10 flex justify-center">
                <a
                  href={`https://wa.me/${viewingTicketBooking.phone.replace(/[^0-9]/g, "").length <= 9 ? "237" + viewingTicketBooking.phone.replace(/[^0-9]/g, "") : viewingTicketBooking.phone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
                    `Hello ${viewingTicketBooking.attendee_name}, here is your ticket link for ${viewingTicketBooking.event_title}: https://jneevents.bookontransapp.com/tickets?id=${viewingTicketBooking.ticket_id}`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 font-semibold text-xs transition-colors"
                >
                  <span>Send Ticket Link to Attendee via WhatsApp</span>
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}