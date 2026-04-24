import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, XCircle, UserCheck, Search, Trash2, Download } from "lucide-react";
import { countUsedSlots, TICKET_CAPACITY, remainingSlots } from "@/utils/ticketCount";

const STATUS_CONFIG = {
  pending: { label: "Pending", color: "bg-yellow-500/15 text-yellow-300" },
  confirmed: { label: "Confirmed", color: "bg-blue-500/15 text-blue-300" },
  checked_in: { label: "Checked In", color: "bg-emerald-500/15 text-emerald-300" },
  cancelled: { label: "Cancelled", color: "bg-red-500/15 text-red-300" },
};

export default function BookingManager() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterEvent, setFilterEvent] = useState("all");

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ["bookings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('jne_bookings')
        .select('*')
        .order('created_date', { ascending: false });
      if (error) throw error;
      return data || [];
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bookings"] }),
  });

  const deleteBooking = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from('Booking')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bookings"] }),
  });

  const eventTitles = [...new Set(bookings.map(b => b.event_title).filter(Boolean))];

  const filtered = bookings.filter(b => {
    const matchSearch =
      b.attendee_name?.toLowerCase().includes(search.toLowerCase()) ||
      b.ticket_id?.toLowerCase().includes(search.toLowerCase()) ||
      b.event_title?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || b.status === filterStatus;
    const matchEvent = filterEvent === "all" || b.event_title === filterEvent;
    return matchSearch && matchStatus && matchEvent;
  });

  const downloadCSV = () => {
    const rows = [
      ["Attendee Name", "Ticket ID", "Event", "Tier", "Price", "Currency", "Status", "Date"],
      ...filtered.map(b => [
        b.attendee_name,
        b.ticket_id,
        b.event_title,
        b.tier_label,
        b.tier_price ?? "",
        b.currency ?? "XAF",
        b.status,
        b.created_date ? format(new Date(b.created_date), "yyyy-MM-dd HH:mm") : "",
      ]),
    ];
    const csv = rows.map(r => r.map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bookings${filterEvent !== "all" ? `-${filterEvent.replace(/\s+/g, "-")}` : ""}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const counts = bookings.reduce((acc, b) => {
    acc[b.status] = (acc[b.status] || 0) + 1;
    return acc;
  }, {});

  const usedSlots = countUsedSlots(bookings);
  const remaining = remainingSlots(bookings);

  if (isLoading) return (
    <div className="text-white/40 text-center py-10">Loading bookings...</div>
  );

  return (
    <div className="space-y-5">
      {/* Capacity Bar */}
      <div className="rounded-xl bg-white/[0.03] border border-white/5 p-4 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-white/60 font-medium">Ticket Capacity</span>
          <span className={`font-bold ${remaining === 0 ? "text-red-400" : "text-white"}`}>
            {usedSlots} / {TICKET_CAPACITY} slots used
            {remaining === 0 && " · SOLD OUT 🎉"}
            {remaining > 0 && <span className="text-white/40 font-normal"> ({remaining} remaining)</span>}
          </span>
        </div>
        <div className="w-full bg-white/5 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all ${remaining === 0 ? "bg-red-500" : "bg-violet-500"}`}
            style={{ width: `${Math.min(100, (usedSlots / TICKET_CAPACITY) * 100)}%` }}
          />
        </div>
        <p className="text-xs text-white/30">Note: "Date Night" tier counts as 2 slots per booking.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
          <SelectTrigger className="bg-white/5 border-white/10 text-white w-full sm:w-48">
            <SelectValue placeholder="All Events" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Events</SelectItem>
            {eventTitles.map(title => (
              <SelectItem key={title} value={title}>{title}</SelectItem>
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
          onClick={downloadCSV}
          variant="outline"
          className="border-emerald-500 text-black hover:bg-emerald-500/20 gap-2 shrink-0"
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
              <tr className="border-b border-white/5 text-left text-white/30">
                <th className="pb-3 pt-3 pl-4 font-medium">Attendee</th>
                <th className="pb-3 pt-3 font-medium hidden sm:table-cell">Event</th>
                <th className="pb-3 pt-3 font-medium hidden md:table-cell">Tier</th>
                <th className="pb-3 pt-3 font-medium hidden lg:table-cell">Ticket ID</th>
                <th className="pb-3 pt-3 font-medium hidden md:table-cell">Date</th>
                <th className="pb-3 pt-3 font-medium">Status</th>
                <th className="pb-3 pt-3 pr-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map(b => {
                const cfg = STATUS_CONFIG[b.status] || STATUS_CONFIG.pending;
                return (
                  <tr key={b.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 pl-4 text-white font-medium">{b.attendee_name}</td>
                    <td className="py-3 text-white/50 hidden sm:table-cell">{b.event_title}</td>
                    <td className="py-3 text-white/50 hidden md:table-cell">{b.tier_label}</td>
                    <td className="py-3 text-white/30 font-mono text-xs hidden lg:table-cell">{b.ticket_id}</td>
                    <td className="py-3 text-white/40 hidden md:table-cell">
                      {b.created_date ? format(new Date(b.created_date), "MMM d, h:mm a") : "—"}
                    </td>
                    <td className="py-3">
                      <Badge className={`${cfg.color} text-xs`}>{cfg.label}</Badge>
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center justify-end gap-1">
                        {b.status !== "confirmed" && b.status !== "checked_in" && (
                          <Button
                            size="icon"
                            variant="ghost"
                            title="Confirm"
                            onClick={() => updateStatus.mutate({ id: b.id, status: "confirmed" })}
                            className="w-7 h-7 text-blue-400/60 hover:text-blue-400 hover:bg-blue-500/10"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
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
    </div>
  );
}