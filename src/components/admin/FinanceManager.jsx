import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { format, subDays, isAfter, startOfMonth } from "date-fns";
import {
  Wallet, TrendingUp, DollarSign, Download, Filter,
  Smartphone, Banknote, CreditCard, ArrowUpRight, CheckCircle2,
  Calendar, Layers, PieChart, ShieldCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export default function FinanceManager() {
  const [dateFilter, setDateFilter] = useState("all"); // "all", "this_month", "30", "7", "today"
  const [eventFilter, setEventFilter] = useState("all");
  const [methodFilter, setMethodFilter] = useState("all");

  // Fetch all bookings
  const { data: bookings = [], isLoading: loadingBookings } = useQuery({
    queryKey: ["finance_bookings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('jne_bookings')
        .select('*')
        .order('created_date', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch rental requests
  const { data: rentalRequests = [] } = useQuery({
    queryKey: ["finance_rentals"],
    queryFn: async () => {
      const { data } = await supabase
        .from("jne_settings")
        .select("value")
        .eq("key", "rental_requests")
        .maybeSingle();
      if (!data?.value) return [];
      try {
        const parsed = JSON.parse(data.value);
        return Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        return [];
      }
    },
  });

  // List of distinct event titles
  const eventTitles = useMemo(() => {
    return [...new Set(bookings.map(b => b.event_title).filter(Boolean))];
  }, [bookings]);

  // Filtered bookings based on criteria
  const filteredBookings = useMemo(() => {
    const now = new Date();

    return bookings.filter(b => {
      // Event filter
      if (eventFilter !== "all" && b.event_title !== eventFilter) return false;

      // Method filter
      if (methodFilter !== "all") {
        const m = (b.payment_method || "MANUAL").toUpperCase();
        if (methodFilter === "ORANGE" && !m.includes("ORANGE")) return false;
        if (methodFilter === "MTN" && !m.includes("MTN") && !m.includes("MOMO")) return false;
        if (methodFilter === "CASH" && (m.includes("ORANGE") || m.includes("MTN") || m.includes("CARD") || m.includes("ONLINE"))) return false;
        if (methodFilter === "CARD" && !m.includes("CARD")) return false;
      }

      // Date filter
      if (dateFilter === "all") return true;
      if (!b.created_date) return true;

      const date = new Date(b.created_date);
      if (dateFilter === "today") {
        return date.toDateString() === now.toDateString();
      }
      if (dateFilter === "7") {
        return isAfter(date, subDays(now, 7));
      }
      if (dateFilter === "30") {
        return isAfter(date, subDays(now, 30));
      }
      if (dateFilter === "this_month") {
        return isAfter(date, startOfMonth(now));
      }

      return true;
    });
  }, [bookings, eventFilter, methodFilter, dateFilter]);

  // Financial calculations
  const financialSummary = useMemo(() => {
    const confirmedBookings = filteredBookings.filter(
      b => b.status === "confirmed" || b.status === "checked_in"
    );

    let grossRevenue = 0;
    let onlineRevenue = 0;
    let cashRevenue = 0;
    let orangeRevenue = 0;
    let mtnRevenue = 0;
    let cardRevenue = 0;
    let onlineCount = 0;
    let cashCount = 0;

    confirmedBookings.forEach(b => {
      const price = Number(b.tier_price) || 0;
      grossRevenue += price;

      const method = (b.payment_method || "").toUpperCase();
      const isOrange = method.includes("ORANGE");
      const isMTN = method.includes("MTN") || method.includes("MOMO");
      const isCard = method.includes("CARD");
      const isOnline = isOrange || isMTN || isCard || method === "ONLINE";

      if (isOrange) orangeRevenue += price;
      if (isMTN) mtnRevenue += price;
      if (isCard) cardRevenue += price;

      if (isOnline) {
        onlineRevenue += price;
        onlineCount++;
      } else {
        cashRevenue += price;
        cashCount++;
      }
    });

    // PayUnit fee: 3% on online transactions
    const payunitFees = Math.round(onlineRevenue * 0.03);
    const netRevenue = grossRevenue - payunitFees;

    // Rental pipeline value
    const rentalPipeline = rentalRequests
      .filter(r => r.status !== "cancelled")
      .reduce((sum, r) => sum + (Number(r.total_price) || 0), 0);

    return {
      totalTicketsSold: confirmedBookings.length,
      grossRevenue,
      onlineRevenue,
      cashRevenue,
      orangeRevenue,
      mtnRevenue,
      cardRevenue,
      payunitFees,
      netRevenue,
      onlineCount,
      cashCount,
      rentalPipeline,
      avgTicketPrice: confirmedBookings.length > 0 ? Math.round(grossRevenue / confirmedBookings.length) : 0,
    };
  }, [filteredBookings, rentalRequests]);

  // Revenue breakdown by event
  const revenueByEvent = useMemo(() => {
    const map = {};
    filteredBookings
      .filter(b => b.status === "confirmed" || b.status === "checked_in")
      .forEach(b => {
        const title = b.event_title || "Unnamed Event";
        if (!map[title]) {
          map[title] = { title, revenue: 0, tickets: 0 };
        }
        map[title].revenue += Number(b.tier_price) || 0;
        map[title].tickets += 1;
      });

    return Object.values(map).sort((a, b) => b.revenue - a.revenue);
  }, [filteredBookings]);

  // Export CSV statement
  const exportFinancialCSV = () => {
    const headers = [
      "Date", "Ticket ID", "Attendee", "Phone", "Event", "Tier",
      "Payment Method", "Gross (XAF)", "PayUnit Fee (XAF)", "Net (XAF)", "Status"
    ];

    const rows = filteredBookings.map(b => {
      const isConfirmed = b.status === "confirmed" || b.status === "checked_in";
      const price = Number(b.tier_price) || 0;
      const m = (b.payment_method || "").toUpperCase();
      const isOnline = m.includes("ORANGE") || m.includes("MTN") || m.includes("MOMO") || m.includes("CARD") || m === "ONLINE";
      const fee = (isConfirmed && isOnline) ? Math.round(price * 0.03) : 0;
      const net = isConfirmed ? price - fee : 0;

      return [
        b.created_date ? format(new Date(b.created_date), "yyyy-MM-dd HH:mm") : "",
        b.ticket_id,
        b.attendee_name,
        b.phone || "",
        b.event_title,
        b.tier_label,
        b.payment_method || "Manual",
        price,
        fee,
        net,
        b.status
      ];
    });

    const csvContent = [headers, ...rows]
      .map(r => r.map(cell => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `JNE-Financial-Report-${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loadingBookings) {
    return (
      <div className="py-20 flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-4 border-violet-500/20 border-t-violet-500 rounded-full animate-spin" />
        <p className="text-white/40 text-sm">Compiling financial metrics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Top Filter Bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-5 rounded-2xl bg-[#0e0e14] border border-white/10">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Wallet className="w-5 h-5 text-emerald-400" />
            Financial Situation & Revenue Overview
          </h2>
          <p className="text-xs text-white/40 mt-1">
            Real-time tracking of ticket revenue, PayUnit collections, processing fees, and cash receipts.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Date Filter */}
          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="w-36 bg-white/5 border-white/10 text-white text-xs h-9 rounded-xl">
              <SelectValue placeholder="Period" />
            </SelectTrigger>
            <SelectContent className="bg-[#14141c] border-white/10 text-white text-xs">
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="this_month">This Month</SelectItem>
              <SelectItem value="30">Last 30 Days</SelectItem>
              <SelectItem value="7">Last 7 Days</SelectItem>
              <SelectItem value="today">Today</SelectItem>
            </SelectContent>
          </Select>

          {/* Event Filter */}
          <Select value={eventFilter} onValueChange={setEventFilter}>
            <SelectTrigger className="w-44 bg-white/5 border-white/10 text-white text-xs h-9 rounded-xl">
              <SelectValue placeholder="All Events" />
            </SelectTrigger>
            <SelectContent className="bg-[#14141c] border-white/10 text-white text-xs">
              <SelectItem value="all">All Events</SelectItem>
              {eventTitles.map(t => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Export CSV */}
          <Button
            type="button"
            onClick={exportFinancialCSV}
            className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs h-9 px-3.5 rounded-xl flex items-center gap-1.5 shadow-lg shadow-emerald-600/10"
          >
            <Download className="w-3.5 h-3.5" />
            Export Statement
          </Button>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Gross Revenue */}
        <div className="p-5 rounded-2xl bg-[#0e0e14] border border-white/10">
          <div className="flex items-center justify-between text-white/50 text-xs font-semibold mb-2">
            <span>GROSS TICKET SALES</span>
            <div className="w-8 h-8 rounded-lg bg-[#181822] border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white font-mono tracking-tight">
            {financialSummary.grossRevenue.toLocaleString()} <span className="text-sm text-emerald-400 font-sans font-bold">XAF</span>
          </div>
          <div className="text-[11px] text-white/40 mt-2 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>{financialSummary.totalTicketsSold} confirmed tickets sold</span>
          </div>
        </div>

        {/* Net Revenue */}
        <div className="p-5 rounded-2xl bg-[#0e0e14] border border-white/10">
          <div className="flex items-center justify-between text-white/50 text-xs font-semibold mb-2">
            <span>NET EARNINGS</span>
            <div className="w-8 h-8 rounded-lg bg-[#181822] border border-violet-500/30 flex items-center justify-center text-violet-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white font-mono tracking-tight">
            {financialSummary.netRevenue.toLocaleString()} <span className="text-sm text-violet-400 font-sans font-bold">XAF</span>
          </div>
          <div className="text-[11px] text-white/40 mt-2 flex items-center gap-1.5">
            <span>After {financialSummary.payunitFees.toLocaleString()} XAF gateway fees</span>
          </div>
        </div>

        {/* Online Mobile Money */}
        <div className="p-5 rounded-2xl bg-[#0e0e14] border border-white/10">
          <div className="flex items-center justify-between text-white/50 text-xs font-semibold mb-2">
            <span>ONLINE MOBILE MONEY</span>
            <div className="w-8 h-8 rounded-lg bg-[#181822] border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Smartphone className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white font-mono tracking-tight">
            {financialSummary.onlineRevenue.toLocaleString()} <span className="text-sm text-amber-400 font-sans font-bold">XAF</span>
          </div>
          <div className="text-[11px] text-white/40 mt-2 flex items-center justify-between">
            <span>Orange: {financialSummary.orangeRevenue.toLocaleString()}</span>
            <span>MTN: {financialSummary.mtnRevenue.toLocaleString()}</span>
          </div>
        </div>

        {/* Cash / Manual Payments */}
        <div className="p-5 rounded-2xl bg-[#0e0e14] border border-white/10">
          <div className="flex items-center justify-between text-white/50 text-xs font-semibold mb-2">
            <span>CASH & DIRECT SALES</span>
            <div className="w-8 h-8 rounded-lg bg-[#181822] border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Banknote className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white font-mono tracking-tight">
            {financialSummary.cashRevenue.toLocaleString()} <span className="text-sm text-blue-400 font-sans font-bold">XAF</span>
          </div>
          <div className="text-[11px] text-white/40 mt-2 flex items-center gap-1.5">
            <span>{financialSummary.cashCount} on-site / manual transactions</span>
          </div>
        </div>
      </div>

      {/* Two Column Section: Channel Breakdown & Top Earning Events */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Channels Card */}
        <div className="p-6 rounded-2xl bg-[#0e0e14] border border-white/10 space-y-5">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-2 text-white font-bold text-base">
              <PieChart className="w-4 h-4 text-violet-400" />
              <span>Revenue by Payment Channel</span>
            </div>
            <span className="text-xs text-white/40 font-mono">
              Total: {financialSummary.grossRevenue.toLocaleString()} XAF
            </span>
          </div>

          <div className="space-y-4">
            {/* Orange Money */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-white font-semibold flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#ff6600]" />
                  Orange Money (CM_ORANGE)
                </span>
                <span className="font-mono text-white font-bold">
                  {financialSummary.orangeRevenue.toLocaleString()} XAF
                  <span className="text-white/40 ml-1.5 font-normal">
                    ({financialSummary.grossRevenue > 0 ? ((financialSummary.orangeRevenue / financialSummary.grossRevenue) * 100).toFixed(1) : 0}%)
                  </span>
                </span>
              </div>
              <div className="w-full bg-[#181822] rounded-full h-2 overflow-hidden border border-white/5">
                <div 
                  className="bg-[#ff6600] h-full rounded-full transition-all duration-500"
                  style={{ width: `${financialSummary.grossRevenue > 0 ? (financialSummary.orangeRevenue / financialSummary.grossRevenue) * 100 : 0}%` }}
                />
              </div>
            </div>

            {/* MTN MoMo */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-white font-semibold flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#ffcc00]" />
                  MTN Mobile Money (CM_MTNMOMO)
                </span>
                <span className="font-mono text-white font-bold">
                  {financialSummary.mtnRevenue.toLocaleString()} XAF
                  <span className="text-white/40 ml-1.5 font-normal">
                    ({financialSummary.grossRevenue > 0 ? ((financialSummary.mtnRevenue / financialSummary.grossRevenue) * 100).toFixed(1) : 0}%)
                  </span>
                </span>
              </div>
              <div className="w-full bg-[#181822] rounded-full h-2 overflow-hidden border border-white/5">
                <div 
                  className="bg-[#ffcc00] h-full rounded-full transition-all duration-500"
                  style={{ width: `${financialSummary.grossRevenue > 0 ? (financialSummary.mtnRevenue / financialSummary.grossRevenue) * 100 : 0}%` }}
                />
              </div>
            </div>

            {/* Cash & Manual Direct */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-white font-semibold flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-400" />
                  Direct / Cash On-Site
                </span>
                <span className="font-mono text-white font-bold">
                  {financialSummary.cashRevenue.toLocaleString()} XAF
                  <span className="text-white/40 ml-1.5 font-normal">
                    ({financialSummary.grossRevenue > 0 ? ((financialSummary.cashRevenue / financialSummary.grossRevenue) * 100).toFixed(1) : 0}%)
                  </span>
                </span>
              </div>
              <div className="w-full bg-[#181822] rounded-full h-2 overflow-hidden border border-white/5">
                <div 
                  className="bg-blue-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${financialSummary.grossRevenue > 0 ? (financialSummary.cashRevenue / financialSummary.grossRevenue) * 100 : 0}%` }}
                />
              </div>
            </div>

            {/* Credit Card / Hosted Gateway */}
            {financialSummary.cardRevenue > 0 && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-white font-semibold flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-400" />
                    Credit Card
                  </span>
                  <span className="font-mono text-white font-bold">
                    {financialSummary.cardRevenue.toLocaleString()} XAF
                  </span>
                </div>
                <div className="w-full bg-[#181822] rounded-full h-2 overflow-hidden border border-white/5">
                  <div 
                    className="bg-purple-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${financialSummary.grossRevenue > 0 ? (financialSummary.cardRevenue / financialSummary.grossRevenue) * 100 : 0}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs text-white/40">
            <span>Average Spending / Ticket: <strong className="text-white">{financialSummary.avgTicketPrice.toLocaleString()} XAF</strong></span>
            <span>Gateway Cut: <strong className="text-red-400 font-mono">3%</strong></span>
          </div>
        </div>

        {/* Revenue by Event Leaderboard */}
        <div className="p-6 rounded-2xl bg-[#0e0e14] border border-white/10 space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-2 text-white font-bold text-base">
              <Layers className="w-4 h-4 text-emerald-400" />
              <span>Revenue by Event</span>
            </div>
            <span className="text-xs text-white/40">
              {revenueByEvent.length} events hosted
            </span>
          </div>

          <div className="space-y-3 max-h-[260px] overflow-y-auto pr-1">
            {revenueByEvent.map((ev, idx) => {
              const pct = financialSummary.grossRevenue > 0 
                ? ((ev.revenue / financialSummary.grossRevenue) * 100).toFixed(1)
                : 0;

              return (
                <div key={ev.title} className="p-3 rounded-xl bg-[#161620] border border-white/10 hover:border-white/20 transition-all flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-5 text-center font-mono font-bold text-white/40 text-xs shrink-0">
                      #{idx + 1}
                    </span>
                    <div className="min-w-0 truncate">
                      <p className="font-semibold text-white truncate">{ev.title}</p>
                      <p className="text-[10px] text-white/40">{ev.tickets} ticket{ev.tickets !== 1 ? "s" : ""} sold</p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="font-bold text-emerald-400 font-mono">{ev.revenue.toLocaleString()} XAF</p>
                    <p className="text-[10px] text-white/40">{pct}% share</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Detailed Financial Ledger */}
      <div className="rounded-2xl bg-[#0e0e14] border border-white/10 overflow-hidden">
        <div className="p-5 border-b border-white/[0.06] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-white">Financial Transaction Ledger</h3>
            <p className="text-xs text-white/40 mt-0.5">
              Showing {filteredBookings.length} transactions with gross collection, gateway fees, and net yield.
            </p>
          </div>

          {/* Payment Method Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-white/30" />
            <Select value={methodFilter} onValueChange={setMethodFilter}>
              <SelectTrigger className="w-36 bg-white/5 border-white/10 text-white text-xs h-8 rounded-lg">
                <SelectValue placeholder="All Channels" />
              </SelectTrigger>
              <SelectContent className="bg-[#14141c] border-white/10 text-white text-xs">
                <SelectItem value="all">All Channels</SelectItem>
                <SelectItem value="ORANGE">Orange Money</SelectItem>
                <SelectItem value="MTN">MTN MoMo</SelectItem>
                <SelectItem value="CASH">Direct Cash</SelectItem>
                <SelectItem value="CARD">Credit Card</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-white/[0.06] text-white/30 font-semibold uppercase tracking-wider text-[10px] bg-white/[0.01]">
                <th className="py-3.5 pl-4">Date</th>
                <th className="py-3.5">Attendee / Phone</th>
                <th className="py-3.5">Event</th>
                <th className="py-3.5">Channel</th>
                <th className="py-3.5 text-right">Gross</th>
                <th className="py-3.5 text-right">Fee (3%)</th>
                <th className="py-3.5 text-right">Net Yield</th>
                <th className="py-3.5 pr-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-white/30">
                    No transactions match the selected filter.
                  </td>
                </tr>
              ) : (
                filteredBookings.map(b => {
                  const isConfirmed = b.status === "confirmed" || b.status === "checked_in";
                  const price = Number(b.tier_price) || 0;
                  const m = (b.payment_method || "").toUpperCase();
                  const isOnline = m.includes("ORANGE") || m.includes("MTN") || m.includes("MOMO") || m.includes("CARD") || m === "ONLINE";
                  const fee = (isConfirmed && isOnline) ? Math.round(price * 0.03) : 0;
                  const net = isConfirmed ? price - fee : 0;

                  // Channel badge styling
                  let channelBadge = "bg-blue-500/15 text-blue-300 border-blue-500/20";
                  let channelLabel = "CASH / DIRECT";
                  if (m.includes("ORANGE")) {
                    channelBadge = "bg-[#ff6600]/15 text-[#ff8833] border-[#ff6600]/30";
                    channelLabel = "ORANGE MONEY";
                  } else if (m.includes("MTN") || m.includes("MOMO")) {
                    channelBadge = "bg-[#ffcc00]/15 text-[#ffdd33] border-[#ffcc00]/30";
                    channelLabel = "MTN MOMO";
                  } else if (m.includes("CARD")) {
                    channelBadge = "bg-purple-500/15 text-purple-300 border-purple-500/20";
                    channelLabel = "CARD";
                  }

                  return (
                    <tr key={b.id} className="hover:bg-white/[0.015] transition-colors">
                      <td className="py-3 pl-4 text-white/40 font-mono whitespace-nowrap">
                        {b.created_date ? format(new Date(b.created_date), "MMM d, h:mm a") : "—"}
                      </td>
                      <td className="py-3">
                        <div className="font-semibold text-white">{b.attendee_name}</div>
                        {b.phone && <div className="text-[10px] text-white/35 font-mono">{b.phone}</div>}
                      </td>
                      <td className="py-3 text-white/70 max-w-[180px] truncate" title={b.event_title}>
                        {b.event_title}
                        <div className="text-[10px] text-white/30">{b.tier_label}</div>
                      </td>
                      <td className="py-3">
                        <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${channelBadge}`}>
                          {channelLabel}
                        </span>
                      </td>
                      <td className="py-3 text-right font-mono font-bold text-white">
                        {price.toLocaleString()}
                      </td>
                      <td className="py-3 text-right font-mono text-xs text-red-400/80">
                        {fee > 0 ? `-${fee.toLocaleString()}` : "—"}
                      </td>
                      <td className="py-3 text-right font-mono font-bold text-emerald-400">
                        {net > 0 ? `${net.toLocaleString()} XAF` : "0 XAF"}
                      </td>
                      <td className="py-3 pr-4 text-center">
                        <Badge className={`text-[10px] font-bold uppercase tracking-wider ${
                          isConfirmed 
                            ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/20" 
                            : b.status === "failed" 
                              ? "bg-red-500/15 text-red-300 border-red-500/20" 
                              : "bg-yellow-500/15 text-yellow-300 border-yellow-500/20"
                        }`}>
                          {b.status}
                        </Badge>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
