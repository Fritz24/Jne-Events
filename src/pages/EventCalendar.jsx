import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import {
    ChevronLeft, ChevronRight, Calendar, MapPin,
    Clock, Film, Music, Sparkles, Share2, ExternalLink, Ticket
} from "lucide-react";
import {
    format, startOfMonth, endOfMonth, eachDayOfInterval,
    isSameDay, isSameMonth, addMonths, subMonths,
    getDay, isToday, isPast, startOfWeek, endOfWeek
} from "date-fns";
import { useNavigate } from "react-router-dom";
import SEO from "../components/common/SEO";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function EventCalendar() {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(null);
    const [copied, setCopied] = useState(false);
    const navigate = useNavigate();

    const { data: events = [], isLoading } = useQuery({
        queryKey: ["events"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("jne_events")
                .select("*")
                .order("date", { ascending: true });
            if (error) throw error;
            return data || [];
        },
    });

    // Calendar days grid
    const calendarDays = useMemo(() => {
        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(currentMonth);
        const calStart = startOfWeek(monthStart);
        const calEnd = endOfWeek(monthEnd);
        return eachDayOfInterval({ start: calStart, end: calEnd });
    }, [currentMonth]);

    // Events grouped by date
    const eventsByDate = useMemo(() => {
        const map = {};
        events.forEach((e) => {
            if (!e.date) return;
            const key = format(new Date(e.date), "yyyy-MM-dd");
            if (!map[key]) map[key] = [];
            map[key].push(e);
        });
        return map;
    }, [events]);

    // Events for clicked/selected date
    const selectedEvents = useMemo(() => {
        if (!selectedDate) return [];
        const key = format(selectedDate, "yyyy-MM-dd");
        return eventsByDate[key] || [];
    }, [selectedDate, eventsByDate]);

    // Upcoming events (next 5)
    const upcomingEvents = useMemo(() => {
        const now = new Date();
        return events
            .filter((e) => e.date && new Date(e.date) >= now && e.status !== "cancelled")
            .slice(0, 5);
    }, [events]);

    // Dynamic share text with upcoming events
    const shareText = useMemo(() => {
        if (upcomingEvents.length === 0) return "Check out the JNE Events Calendar! 🎟️🔥";
        const eventLines = upcomingEvents.slice(0, 3).map(e => {
            const dateStr = e.date ? format(new Date(e.date), "MMM d") : "TBA";
            return `🎬 ${e.title} — ${dateStr}`;
        }).join("\n");
        const moreText = upcomingEvents.length > 3 ? `\n+${upcomingEvents.length - 3} more events...` : "";
        return `🔥 Upcoming JNE Events:\n\n${eventLines}${moreText}\n\n🎟️ Browse & book now!`;
    }, [upcomingEvents]);

    // Dynamic SEO description
    const seoDescription = useMemo(() => {
        if (upcomingEvents.length === 0) return "Browse the full JNE Events calendar. Find upcoming movie nights, concerts, and exclusive gatherings. Never miss a night out!";
        const names = upcomingEvents.slice(0, 3).map(e => e.title).join(", ");
        return `Coming up on JNE Events: ${names}. Browse our full calendar, pick your dates, and book tickets for the ultimate night out!`;
    }, [upcomingEvents]);

    const handleShare = async () => {
        const shareData = {
            title: "JNE Events Calendar 🎟️",
            text: shareText,
            url: window.location.href,
        };

        if (navigator.share) {
            try {
                await navigator.share(shareData);
            } catch { }
        } else {
            // Copy a nicely formatted message + link
            const fullText = `${shareText}\n\n${window.location.href}`;
            await navigator.clipboard.writeText(fullText);
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        }
    };

    const typeConfig = {
        movie_night: { icon: Film, color: "bg-amber-500/20 text-amber-300 border-amber-500/30", dot: "bg-amber-400" },
        music: { icon: Music, color: "bg-violet-500/20 text-violet-300 border-violet-500/30", dot: "bg-violet-400" },
        concert: { icon: Music, color: "bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/30", dot: "bg-fuchsia-400" },
        party: { icon: Sparkles, color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30", dot: "bg-emerald-400" },
    };

    const getTypeConfig = (type) => typeConfig[type] || { icon: Sparkles, color: "bg-white/10 text-white/60 border-white/20", dot: "bg-white/40" };

    return (
        <div className="min-h-screen bg-[#06060a]">
            <SEO
                title="Event Calendar"
                description={seoDescription}
                image="https://jneevents.bookontransapp.com/calendar-og.png"
                url="/calendar"
                keywords={["event calendar", "upcoming events", "JNE schedule", "movie night calendar", "concert dates"]}
            />

            {/* Background Glow */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-violet-600/[0.07] rounded-full blur-[120px]" />
                <div className="absolute -bottom-40 -right-40 w-[400px] h-[400px] bg-fuchsia-600/[0.05] rounded-full blur-[100px]" />
            </div>

            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10"
                >
                    <div>
                        <h1 className="text-3xl sm:text-4xl font-bold text-white flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center border border-violet-500/30">
                                <Calendar className="w-5 h-5 text-violet-400" />
                            </div>
                            Event Calendar
                        </h1>
                        <p className="text-white/40 mt-2 text-sm">Browse upcoming events, select a date, and book your experience.</p>
                    </div>
                    <button
                        onClick={handleShare}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all text-sm font-medium"
                    >
                        <Share2 className="w-4 h-4" />
                        {copied ? "Link Copied! ✓" : "Share Calendar"}
                    </button>
                </motion.div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* CALENDAR GRID */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="lg:col-span-2"
                    >
                        {/* Glassmorphic Calendar Card */}
                        <div className="rounded-3xl bg-white/[0.03] border border-white/[0.08] backdrop-blur-xl overflow-hidden shadow-2xl shadow-violet-900/10">
                            {/* Month Navigation */}
                            <div className="flex items-center justify-between p-6 border-b border-white/[0.06]">
                                <button
                                    onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                                    className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all"
                                >
                                    <ChevronLeft className="w-5 h-5" />
                                </button>
                                <h2 className="text-xl font-bold text-white tracking-tight">
                                    {format(currentMonth, "MMMM yyyy")}
                                </h2>
                                <button
                                    onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                                    className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all"
                                >
                                    <ChevronRight className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Weekday Headers */}
                            <div className="grid grid-cols-7 border-b border-white/[0.04]">
                                {WEEKDAYS.map((d) => (
                                    <div key={d} className="text-center py-3 text-[10px] font-bold uppercase tracking-widest text-white/20">
                                        {d}
                                    </div>
                                ))}
                            </div>

                            {/* Day Grid */}
                            <div className="grid grid-cols-7 gap-2 p-4">
                                {calendarDays.map((day, i) => {
                                    const key = format(day, "yyyy-MM-dd");
                                    const dayEvents = eventsByDate[key] || [];
                                    const inMonth = isSameMonth(day, currentMonth);
                                    const today = isToday(day);
                                    const selected = selectedDate && isSameDay(day, selectedDate);
                                    const past = isPast(day) && !today;
                                    const hasEvents = dayEvents.length > 0;

                                    return (
                                        <button
                                            key={i}
                                            onClick={() => setSelectedDate(day)}
                                            className={`
                                                relative aspect-square flex flex-col items-center justify-center gap-1 
                                                rounded-full transition-all duration-300
                                                ${!inMonth ? "opacity-20" : ""}
                                                ${today && !selected ? "bg-violet-500/20 border border-violet-500/40" : "border border-white/5"}
                                                ${selected ? "bg-violet-500/40 border-violet-400 shadow-[0_0_15px_rgba(139,92,246,0.3)] scale-105" : "hover:bg-white/[0.08] hover:border-white/20"}
                                                ${past && !hasEvents ? "opacity-40" : ""}
                                                overflow-hidden group
                                            `}
                                        >
                                            {/* Blurry Event Background */}
                                            {hasEvents && dayEvents[0]?.image_url && (
                                                <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
                                                    <img
                                                        src={dayEvents[0].image_url}
                                                        className={`w-full h-full object-cover blur-[2px] opacity-[0.35] scale-110 group-hover:scale-125 transition-transform duration-700 ${selected ? 'opacity-[0.55] blur-[1px]' : ''}`}
                                                        alt=""
                                                    />
                                                    <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f]/60 via-transparent to-transparent opacity-60" />
                                                </div>
                                            )}

                                            <span
                                                className={`
                                                    relative z-10 text-sm font-bold transition-colors
                                                    ${today ? "text-violet-400" : selected ? "text-white" : "text-white/80"}
                                                    ${hasEvents && !selected ? "drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" : ""}
                                                `}
                                            >
                                                {format(day, "d")}
                                            </span>

                                            {/* Event Dots */}
                                            {hasEvents && (
                                                <div className="relative z-10 flex gap-0.5">
                                                    {dayEvents.slice(0, 3).map((e, j) => (
                                                        <div
                                                            key={j}
                                                            className={`w-1.5 h-1.5 rounded-full ${getTypeConfig(e.type).dot} ${selected ? 'scale-125' : ''} transition-transform shadow-md border border-black/20`}
                                                        />
                                                    ))}
                                                </div>
                                            )}

                                            {today && (
                                                <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 z-10">
                                                    <div className="w-1 h-1 rounded-full bg-violet-400 animate-pulse" />
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Legend */}
                            <div className="flex flex-wrap items-center gap-4 p-4 border-t border-white/[0.04]">
                                {Object.entries(typeConfig).map(([key, cfg]) => (
                                    <div key={key} className="flex items-center gap-1.5 text-[10px] text-white/30 font-medium">
                                        <div className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                                        {key.replace("_", " ")}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </motion.div>

                    {/* SIDEBAR: Selected Date / Upcoming */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="space-y-6"
                    >
                        {/* Selected Date Details */}
                        <AnimatePresence mode="wait">
                            {selectedDate && (
                                <motion.div
                                    key={format(selectedDate, "yyyy-MM-dd")}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className="rounded-3xl bg-white/[0.04] border border-white/[0.08] backdrop-blur-xl overflow-hidden"
                                >
                                    <div className="p-5 border-b border-white/[0.06] bg-gradient-to-r from-violet-500/[0.06] to-transparent">
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-violet-400 mb-1">Selected Date</p>
                                        <h3 className="text-lg font-bold text-white">{format(selectedDate, "EEEE, MMMM d")}</h3>
                                    </div>

                                    <div className="p-4 space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar">
                                        {selectedEvents.length > 0 ? (
                                            selectedEvents.map((e) => {
                                                const cfg = getTypeConfig(e.type);
                                                const Icon = cfg.icon;
                                                return (
                                                    <div
                                                        key={e.id}
                                                        className="group rounded-2xl bg-white/[0.03] border border-white/[0.06] p-4 hover:border-violet-500/20 hover:bg-violet-500/[0.03] transition-all cursor-pointer"
                                                        onClick={() => navigate("/events")}
                                                    >
                                                        {e.image_url && (
                                                            <div className="w-full aspect-[16/9] rounded-xl overflow-hidden mb-3">
                                                                <img src={e.image_url} alt={e.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                                            </div>
                                                        )}
                                                        <div className="flex items-start justify-between gap-2 mb-2">
                                                            <h4 className="text-sm font-bold text-white group-hover:text-violet-400 transition-colors line-clamp-1">{e.title}</h4>
                                                            <span className={`shrink-0 text-[9px] px-2 py-0.5 rounded-full border font-bold ${cfg.color}`}>
                                                                <Icon className="w-2.5 h-2.5 inline mr-0.5 -mt-0.5" />
                                                                {e.type?.replace("_", " ")}
                                                            </span>
                                                        </div>
                                                        <div className="space-y-1.5 text-xs text-white/40">
                                                            <div className="flex items-center gap-1.5">
                                                                <Clock className="w-3 h-3" />
                                                                {e.date ? format(new Date(e.date), "h:mm a") : "TBA"}
                                                            </div>
                                                            <div className="flex items-center gap-1.5">
                                                                <MapPin className="w-3 h-3" />
                                                                {e.city ? `${e.venue}, ${e.city}` : e.venue}
                                                            </div>
                                                        </div>
                                                        <div className="mt-3 flex items-center justify-between">
                                                            <span className="text-sm font-bold text-white">
                                                                {(e.ticket_tiers?.length
                                                                    ? Math.min(...e.ticket_tiers.map((t) => t.price || 0))
                                                                    : e.price || 0
                                                                ).toLocaleString()}{" "}
                                                                {e.currency || "XAF"}
                                                            </span>
                                                            <span className="text-[10px] text-violet-400 font-medium flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                View <ExternalLink className="w-3 h-3" />
                                                            </span>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        ) : (
                                            <div className="text-center py-12">
                                                <Calendar className="w-8 h-8 text-white/10 mx-auto mb-3" />
                                                <p className="text-sm text-white/20 font-bold">No events on this date</p>
                                                <p className="text-[10px] text-white/10 mt-1">Try selecting another day</p>
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Upcoming Events Quick View */}
                        <div className="rounded-3xl bg-white/[0.03] border border-white/[0.08] backdrop-blur-xl overflow-hidden">
                            <div className="p-5 border-b border-white/[0.06]">
                                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                                    <Sparkles className="w-4 h-4 text-violet-400" />
                                    Coming Up
                                </h3>
                            </div>
                            <div className="p-3 space-y-1">
                                {upcomingEvents.length > 0 ? (
                                    upcomingEvents.map((e) => {
                                        const cfg = getTypeConfig(e.type);
                                        return (
                                            <button
                                                key={e.id}
                                                onClick={() => {
                                                    setCurrentMonth(new Date(e.date));
                                                    setSelectedDate(new Date(e.date));
                                                }}
                                                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/[0.03] transition-all text-left group"
                                            >
                                                <div className={`w-2 h-8 rounded-full ${cfg.dot} shrink-0`} />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-bold text-white truncate group-hover:text-violet-400 transition-colors">{e.title}</p>
                                                    <p className="text-[10px] text-white/30 mt-0.5">
                                                        {e.date ? format(new Date(e.date), "EEE, MMM d · h:mm a") : "TBA"}
                                                    </p>
                                                </div>
                                                <div className="text-[10px] font-bold text-white/20 shrink-0">
                                                    {(e.price || 0).toLocaleString()} {e.currency || "XAF"}
                                                </div>
                                            </button>
                                        );
                                    })
                                ) : (
                                    <div className="text-center py-8">
                                        <p className="text-xs text-white/20">No upcoming events scheduled</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* CTA */}
                        <button
                            onClick={() => navigate("/events")}
                            className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-bold text-sm hover:brightness-110 transition-all shadow-lg shadow-violet-900/30"
                        >
                            <Ticket className="w-4 h-4" />
                            Browse All Events
                        </button>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}
