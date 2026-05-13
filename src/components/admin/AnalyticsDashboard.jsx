import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, AreaChart, Area, Cell, PieChart, Pie
} from 'recharts';
import {
    TrendingUp, Users, MessageCircle, Eye,
    Calendar, ArrowUpRight, Filter, Download,
    DollarSign, ChevronDown, CheckCircle2, AlertCircle
} from "lucide-react";
import { format, subDays, startOfDay, endOfDay, isAfter, isBefore } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function AnalyticsDashboard() {
    const [dateRange, setDateRange] = useState("30"); // 7, 30, 90, all

    // 1. Fetch RAW Analytics Data (Views & Clicks)
    const { data: rawAnalytics = [], isLoading: loadingAnalytics } = useQuery({
        queryKey: ["analytics_raw"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('jne_analytics')
                .select('*')
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data || [];
        }
    });

    // 2. Fetch Bookings (Real Conversion & Revenue)
    const { data: bookings = [], isLoading: loadingBookings } = useQuery({
        queryKey: ["bookings_analytics"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('jne_bookings')
                .select('*')
                .order('created_date', { ascending: false });
            if (error) throw error;
            return data || [];
        }
    });

    // 3. Fetch Events
    const { data: events = [] } = useQuery({
        queryKey: ["events_minimal"],
        queryFn: async () => {
            const { data } = await supabase.from('jne_events').select('id, title, type, price, currency');
            return data || [];
        }
    });

    // 4. DATA PROCESSING (MEMOIZED)
    const filteredData = useMemo(() => {
        const now = new Date();
        const cutoff = dateRange === "all" ? null : subDays(now, parseInt(dateRange));

        const analytics = cutoff
            ? rawAnalytics.filter(r => isAfter(new Date(r.created_at), cutoff))
            : rawAnalytics;

        const filteredBookings = cutoff
            ? bookings.filter(b => isAfter(new Date(b.created_date), cutoff))
            : bookings;

        return { analytics, bookings: filteredBookings, cutoff };
    }, [rawAnalytics, bookings, dateRange]);

    const stats = useMemo(() => {
        const views = filteredData.analytics.filter(d => d.type === 'event_view').length;
        const clicks = filteredData.analytics.filter(d => d.type === 'whatsapp_click').length;
        const confirmedBookings = filteredData.bookings.filter(b => b.status === 'confirmed');
        const revenue = confirmedBookings.reduce((sum, b) => sum + (Number(b.tier_price) || 0), 0);

        return {
            views,
            clicks,
            bookingsCount: filteredData.bookings.length,
            confirmedCount: confirmedBookings.length,
            revenue,
            conversion: views > 0 ? ((confirmedBookings.length / views) * 100).toFixed(1) : 0,
            clickRate: views > 0 ? ((clicks / views) * 100).toFixed(1) : 0
        };
    }, [filteredData]);

    // Graph Data: Daily Trend
    const trendData = useMemo(() => {
        const days = dateRange === "all" ? 30 : parseInt(dateRange);
        return [...Array(days)].map((_, i) => {
            const d = subDays(new Date(), i);
            const dayStr = format(d, days > 30 ? 'MMM dd' : 'MMM dd');
            const dViews = filteredData.analytics.filter(r =>
                r.type === 'event_view' &&
                new Date(r.created_at) >= startOfDay(d) &&
                new Date(r.created_at) <= endOfDay(d)
            ).length;
            const dBookings = filteredData.bookings.filter(b =>
                new Date(b.created_date) >= startOfDay(d) &&
                new Date(b.created_date) <= endOfDay(d)
            ).length;
            return { name: dayStr, views: dViews, bookings: dBookings };
        }).reverse();
    }, [filteredData, dateRange]);

    // Event Performance Table Data
    const eventPerformance = useMemo(() => {
        return events.map(e => {
            const evViews = filteredData.analytics.filter(r => r.event_id === e.id && r.type === 'event_view').length;
            const evClicks = filteredData.analytics.filter(r => r.event_id === e.id && r.type === 'whatsapp_click').length;
            const evBookings = filteredData.bookings.filter(b => b.event_id === e.id).length;
            const evRevenue = filteredData.bookings
                .filter(b => b.event_id === e.id && b.status === 'confirmed')
                .reduce((sum, b) => sum + (Number(b.tier_price) || 0), 0);

            return {
                id: e.id,
                title: e.title,
                views: evViews,
                clicks: evClicks,
                bookings: evBookings,
                revenue: evRevenue,
                conversion: evViews > 0 ? ((evBookings / evViews) * 100).toFixed(1) : 0
            };
        }).sort((a, b) => b.views - a.views);
    }, [events, filteredData]);

    if (loadingAnalytics || loadingBookings) return (
        <div className="h-96 flex flex-col items-center justify-center gap-4">
            <div className="w-12 h-12 border-4 border-violet-500/20 border-t-violet-500 rounded-full animate-spin" />
            <p className="text-white/40 animate-pulse font-medium">Assembled lifetime performance data...</p>
        </div>
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            {/* Header / Filter Row */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/[0.02] border border-white/[0.05] p-6 rounded-3xl">
                <div>
                    <h3 className="text-lg font-bold text-white uppercase tracking-tight">Performance Overview</h3>
                    <p className="text-xs text-white/30">Detailed metrics for {dateRange === "all" ? "the entire lifetime" : `the last ${dateRange} days`}</p>
                </div>
                <div className="flex items-center gap-3">
                    <Filter className="w-4 h-4 text-white/20" />
                    <Select value={dateRange} onValueChange={setDateRange}>
                        <SelectTrigger className="w-[180px] bg-white/5 border-white/10 text-white rounded-xl">
                            <SelectValue placeholder="Date Range" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1a1a1a] border-white/10 text-white">
                            <SelectItem value="7">Last 7 Days</SelectItem>
                            <SelectItem value="30">Last 30 Days</SelectItem>
                            <SelectItem value="90">Last 90 Days</SelectItem>
                            <SelectItem value="all">All Time</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Top Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    label="Total Revenue"
                    value={`${stats.revenue.toLocaleString()} XAF`}
                    sub={`${stats.confirmedCount} Confirmed`}
                    icon={DollarSign}
                    color="text-emerald-400"
                    bg="bg-emerald-500/10"
                />
                <StatCard
                    label="Total Views"
                    value={stats.views}
                    sub="Interest Volume"
                    icon={Eye}
                    color="text-violet-400"
                    bg="bg-violet-500/10"
                />
                <StatCard
                    label="Bookings"
                    value={stats.bookingsCount}
                    sub={`${stats.conversion}% Conv. Rate`}
                    icon={Ticket}
                    color="text-fuchsia-400"
                    bg="bg-fuchsia-500/10"
                />
                <StatCard
                    label="Click Rate"
                    value={`${stats.clickRate}%`}
                    sub="WhatsApp Intent"
                    icon={MessageCircle}
                    color="text-amber-400"
                    bg="bg-amber-500/10"
                />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white/[0.03] border border-white/[0.08] rounded-3xl p-6">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-lg font-bold text-white">Interest vs Conversion</h3>
                            <p className="text-xs text-white/30">Daily volume of views vs confirmed bookings</p>
                        </div>
                    </div>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={trendData}>
                                <defs>
                                    <linearGradient id="colorTrend" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                                <XAxis dataKey="name" stroke="#ffffff20" fontSize={10} tickLine={false} axisLine={false} />
                                <YAxis stroke="#ffffff20" fontSize={10} tickLine={false} axisLine={false} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #ffffff10', borderRadius: '12px' }}
                                    itemStyle={{ fontSize: '12px' }}
                                />
                                <Area type="monotone" dataKey="views" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorTrend)" strokeWidth={3} />
                                <Bar dataKey="bookings" fill="#10b981" radius={[4, 4, 0, 0]} barSize={10} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white/[0.03] border border-white/[0.08] rounded-3xl p-6 flex flex-col items-center justify-center text-center">
                    <h3 className="text-lg font-bold text-white mb-6 self-start">Historical Funnel</h3>
                    <div className="w-full space-y-6">
                        <FunnelStep label="Views" value={stats.views} total={stats.views} color="bg-violet-500" />
                        <FunnelStep label="Clicks" value={stats.clicks} total={stats.views} color="bg-amber-500" />
                        <FunnelStep label="Bookings" value={stats.bookingsCount} total={stats.views} color="bg-fuchsia-500" />
                        <FunnelStep label="Sales" value={stats.confirmedCount} total={stats.views} color="bg-emerald-500" />
                    </div>
                    <div className="mt-8 p-4 bg-white/5 rounded-2xl w-full border border-white/5">
                        <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold mb-1">Bottom Line</p>
                        <p className="text-xl font-bold text-white">{stats.conversion}% <span className="text-xs text-white/40 font-normal">Conversion</span></p>
                    </div>
                </div>
            </div>

            {/* PERFORMANCE TABLE */}
            <div className="bg-white/[0.03] border border-white/[0.08] rounded-3xl overflow-hidden">
                <div className="p-6 border-b border-white/[0.08]">
                    <h3 className="text-lg font-bold text-white">Event Performance Breakdown</h3>
                    <p className="text-xs text-white/30 mt-1">Granular metrics for every event ever hosted.</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-white/[0.02] text-[10px] uppercase tracking-widest text-white/30 font-bold border-b border-white/[0.08]">
                                <th className="px-6 py-4">Event</th>
                                <th className="px-6 py-4">Views</th>
                                <th className="px-6 py-4">Clicks</th>
                                <th className="px-6 py-4">Bookings</th>
                                <th className="px-6 py-4">Conversion</th>
                                <th className="px-6 py-4 text-right">Est. Revenue</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.04]">
                            {eventPerformance.map(e => (
                                <tr key={e.id} className="hover:bg-white/[0.01] transition-colors group">
                                    <td className="px-6 py-4">
                                        <p className="text-sm font-bold text-white group-hover:text-violet-400 transition-colors uppercase truncate max-w-[200px]">{e.title}</p>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-white/60">{e.views.toLocaleString()}</td>
                                    <td className="px-6 py-4 text-sm text-white/60">{e.clicks.toLocaleString()}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-bold text-white">{e.bookings}</span>
                                            {e.bookings > 10 && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-16 h-1.5 bg-white/5 rounded-full overflow-hidden">
                                                <div className="bg-violet-500 h-full" style={{ width: `${Math.min(e.conversion * 5, 100)}%` }} />
                                            </div>
                                            <span className="text-xs font-bold text-white/40">{e.conversion}%</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right font-mono text-emerald-400 font-bold text-sm">
                                        {e.revenue.toLocaleString()}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

function StatCard({ label, value, sub, icon: Icon, color, bg }) {
    return (
        <div className="bg-white/[0.03] border border-white/[0.08] rounded-3xl p-6 group hover:border-white/10 transition-all">
            <div className="flex justify-between items-start mb-4">
                <div className={`w-12 h-12 rounded-2xl ${bg} flex items-center justify-center transition-transform group-hover:scale-110 duration-500`}>
                    <Icon className={`w-6 h-6 ${color}`} />
                </div>
                <ArrowUpRight className="w-4 h-4 text-white/10 group-hover:text-white/40 transition-colors" />
            </div>
            <p className="text-[10px] uppercase tracking-widest font-bold text-white/30 mb-1">{label}</p>
            <h4 className="text-2xl font-bold text-white tracking-tight">{value}</h4>
            <p className="text-[11px] text-white/20 mt-2 flex items-center gap-1.5 font-medium">
                <TrendingUp className="w-3 h-3" />
                {sub}
            </p>
        </div>
    );
}

function FunnelStep({ label, value, total, color }) {
    const percentage = total > 0 ? (value / total) * 100 : 0;
    return (
        <div className="space-y-1.5">
            <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
                <span className="text-white/40">{label}</span>
                <span className="text-white">{value.toLocaleString()}</span>
            </div>
            <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                <div className={`${color} h-full transition-all duration-1000`} style={{ width: `${percentage}%` }} />
            </div>
        </div>
    );
}

function Ticket({ className }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"></path>
            <path d="M13 5v2"></path>
            <path d="M13 17v2"></path>
            <path d="M13 11v2"></path>
        </svg>
    );
}
