import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import {
  Plus, CalendarDays, Ticket, ShieldOff, ShoppingBag, Users,
  LayoutDashboard, BarChart3, Globe, Megaphone, Settings,
  ChevronDown, Menu, Sparkles,
  MessageCircle, ArrowUpRight, Settings2, ScanLine, Wrench
} from "lucide-react";
import EventForm from "../components/admin/EventForm";
import EventTable from "../components/admin/EventTable";
import BookingManager from "../components/admin/BookingManager";
// Actually, let's keep the import name but change the label in Admin.
import ExtrasManager from "../components/admin/RefreshmentsManager";
import CategoryDesigner from "../components/admin/CategoryDesigner";
import UserManager from "../components/admin/UserManager";
import AnalyticsDashboard from "../components/admin/AnalyticsDashboard";
import SettingsPanel from "../components/admin/SettingsPanel";
import SubscriberManager from "../components/admin/SubscriberManager";
import ScannerManager from "../components/admin/ScannerManager";
import AlbumManager from "../components/admin/AlbumManager";
import RentalManager from "../components/admin/RentalManager";
import { useAuth } from "@/lib/AuthContext";

const SIDEBAR_SECTIONS = [
  {
    id: "dashboard", label: "Dashboard", icon: LayoutDashboard,
  },
  {
    id: "events", label: "Events", icon: CalendarDays,
    children: [
      { id: "events_all", label: "All Events" },
      { id: "events_create", label: "Create Event" },
      { id: "events_categories", label: "Events Category" },
    ],
  },
  {
    id: "bookings", label: "Bookings", icon: Ticket,
  },
  {
    id: "scanner", label: "Scanner", icon: ScanLine,
  },
  {
    id: "users", label: "Users", icon: Users,
  },
  {
    id: "extras", label: "Extras", icon: ShoppingBag,
  },
  {
    id: "rentals", label: "Rentals & Staff", icon: Wrench,
  },
  {
    id: "albums", label: "Albums", icon: Sparkles,
  },
  {
    id: "analytics", label: "Analytics", icon: BarChart3,
  },
  {
    id: "seo", label: "SEO", icon: Globe,
  },
  {
    id: "marketing", label: "Marketing", icon: Megaphone,
    children: [
      { id: "marketing_subscribers", label: "Newsletter" },
    ],
  },
  {
    id: "settings", label: "Settings", icon: Settings,
  },
];

export default function Admin() {
  const { user, isLoadingAuth } = useAuth();
  const [activeSection, setActiveSection] = useState("dashboard");
  const [eventsFilter, setEventsFilter] = useState("upcoming");
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState(["events"]);
  const queryClient = useQueryClient();

  const { data: events = [], isLoading } = useQuery({
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

  const { data: bookingStats = {} } = useQuery({
    queryKey: ["booking-stats"],
    queryFn: async () => {
      const { data: bookings } = await supabase.from('jne_bookings').select('status, user_id, attendee_name');
      const { count: whatsappClicks } = await supabase.from('jne_analytics').select('*', { count: 'exact', head: true }).eq('type', 'whatsapp_click');

      // Attempt to get total JNE Events users
      let totalUsersCount = 0;
      try {
        const { count } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .contains('active_platforms', ['events']);

        totalUsersCount = count || 0;
      } catch (err) {
        console.error("User count fetch error:", err);
      }

      const uniqueUsers = new Set();
      bookings?.forEach(b => {
        if (b.user_id) uniqueUsers.add(b.user_id);
        else if (b.attendee_name) uniqueUsers.add(b.attendee_name.toLowerCase().trim());
      });

      return {
        totalBookings: bookings?.length || 0,
        uniqueUsers: uniqueUsers.size,
        confirmedBookings: bookings?.filter(b => b.status === 'confirmed' || b.status === 'checked_in').length || 0,
        whatsappClicks: whatsappClicks || 0,
        totalUsers: totalUsersCount || uniqueUsers.size // Fallback to unique bookers if ecosystem count fails
      };
    },
  });

  const { data: rentalRequests = [] } = useQuery({
    queryKey: ["rental_requests"],
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

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('jne_events').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["events"] }),
  });

  const handleEdit = (event) => {
    setEditingEvent(event);
    setShowForm(true);
    setActiveSection("events_create");
  };

  const handleSaved = () => {
    setShowForm(false);
    setEditingEvent(null);
    setActiveSection("events_all");
    queryClient.invalidateQueries({ queryKey: ["events"] });
  };

  const toggleSection = (id) => {
    setExpandedSections(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const handleNavClick = (item) => {
    if (item.children) {
      toggleSection(item.id);
    } else {
      setActiveSection(item.id);
      setSidebarOpen(false);
    }
  };

  const handleChildClick = (childId) => {
    if (childId === "events_create") {
      setEditingEvent(null);
      setShowForm(true);
    }
    setActiveSection(childId);
    setSidebarOpen(false);
  };

  // Auth gates
  if (isLoadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#09090b]">
        <div className="w-8 h-8 border-4 border-white/10 border-t-violet-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[#09090b]">
        <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center space-y-5">
          <div className="w-16 h-16 rounded-full bg-red-500/15 flex items-center justify-center mx-auto">
            <ShieldOff className="w-8 h-8 text-red-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Access Denied</h2>
            <p className="text-white/50 mt-1 text-sm">You don't have permission to view this page.</p>
          </div>
        </div>
      </div>
    );
  }

  const upcomingEvents = events.filter(e => e.status === "upcoming").length;

  // Determine active parent for sidebar highlighting
  const getActiveParent = () => {
    const section = SIDEBAR_SECTIONS.find(s =>
      s.id === activeSection || s.children?.some(c => c.id === activeSection)
    );
    return section?.id || "dashboard";
  };

  return (
    <div className="min-h-screen bg-[#09090b] flex flex-col lg:flex-row">
      {/* Mobile Top Header Bar */}
      <div className="lg:hidden sticky top-0 z-40 w-full bg-[#0c0c0f]/80 backdrop-blur-md border-b border-white/[0.06] flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 -ml-2 rounded-lg hover:bg-white/5 text-white/70 transition-all"
          >
            <Menu className="w-6 h-6" />
          </button>
          <span className="text-[14px] font-bold text-white tracking-wider uppercase">JNE Control Panel</span>
        </div>
      </div>

      {/* Sidebar Overlay (mobile) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:sticky top-0 left-0 h-screen w-[260px] bg-[#0c0c0f] border-r border-white/[0.06] z-50 flex flex-col transition-transform duration-300 ease-out ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>

        {/* Logo */}
        <div className="px-6 py-6 border-b border-white/[0.06] space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-[15px] font-bold text-white tracking-tight">JNE Admin</h1>
              <p className="text-[10px] text-white/30 font-medium uppercase tracking-widest">Control Panel</p>
            </div>
          </div>

          <Link
            to="/"
            className="flex items-center justify-center gap-2 w-full py-2 px-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-[12px] font-bold text-white/60 hover:text-white hover:bg-white/10 transition-all group"
          >
            <ArrowUpRight className="w-3.5 h-3.5 text-white/20 group-hover:text-violet-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
            Back to Website
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5 custom-scrollbar">
          {SIDEBAR_SECTIONS.map(item => {
            const Icon = item.icon;
            const isActive = getActiveParent() === item.id;
            const isExpanded = expandedSections.includes(item.id);
            const hasChildren = item.children && item.children.length > 0;

            return (
              <div key={item.id}>
                <button
                  onClick={() => hasChildren ? handleNavClick(item) : handleChildClick(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all group ${isActive
                    ? "bg-violet-500/10 text-violet-300"
                    : "text-white/40 hover:text-white/70 hover:bg-white/[0.04]"
                    }`}
                >
                  <Icon className={`w-[18px] h-[18px] transition-colors ${isActive ? "text-violet-400" : "text-white/20 group-hover:text-white/40"}`} />
                  <span className="flex-1 text-left">{item.label}</span>
                  {hasChildren && (
                    <ChevronDown className={`w-3.5 h-3.5 text-white/20 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
                  )}
                </button>

                {/* Children */}
                {hasChildren && isExpanded && (
                  <div className="pl-[38px] mt-0.5 space-y-0.5">
                    {item.children.map(child => (
                      <button
                        key={child.id}
                        onClick={() => handleChildClick(child.id)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-[12px] font-medium transition-all ${activeSection === child.id
                          ? "text-violet-300 bg-violet-500/10"
                          : "text-white/30 hover:text-white/60 hover:bg-white/[0.03]"
                          }`}
                      >
                        {child.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-white/[0.06]">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 border border-white/10 flex items-center justify-center text-xs font-bold text-violet-300">
              {user?.email?.[0]?.toUpperCase() || "A"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold text-white/60 truncate">{user?.email || "Admin"}</p>
              <p className="text-[9px] text-white/20 uppercase tracking-widest">Super Admin</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-h-screen">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10">
          {/* Dashboard */}
          {activeSection === "dashboard" && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
              <div>
                <h2 className="text-2xl font-bold text-white tracking-tight">Welcome back</h2>
                <p className="text-white/40 text-sm mt-1">Here's an overview of your event platform.</p>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                <StatCard label="Total Events" value={events.length} icon={CalendarDays} color="violet" />
                <StatCard label="WhatsApp Clicks" value={bookingStats.whatsappClicks} icon={MessageCircle} color="emerald" />
                <StatCard label="Total Bookings" value={bookingStats.totalBookings} icon={Ticket} color="amber" />
                <StatCard label="Rental Inquiries" value={rentalRequests.length} icon={Wrench} color="fuchsia" />
                <StatCard label="Total Users" value={bookingStats.totalUsers} icon={Users} color="blue" />
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <button
                  onClick={() => { setActiveSection("events_create"); setEditingEvent(null); setShowForm(true); }}
                  className="group flex items-center gap-3 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-violet-500/20 hover:bg-violet-500/[0.03] transition-all"
                >
                  <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center group-hover:bg-violet-500/20 transition-colors shrink-0">
                    <Plus className="w-4 h-4 text-violet-400" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-semibold text-white">Create Event</p>
                    <p className="text-[10px] text-white/30">New listing</p>
                  </div>
                  <ArrowUpRight className="w-3.5 h-3.5 text-white/10 ml-auto group-hover:text-violet-400 transition-colors" />
                </button>
                <button
                  onClick={() => setActiveSection("rentals")}
                  className="group flex items-center gap-3 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-fuchsia-500/20 hover:bg-fuchsia-500/[0.03] transition-all"
                >
                  <div className="w-10 h-10 rounded-xl bg-fuchsia-500/10 flex items-center justify-center group-hover:bg-fuchsia-500/20 transition-colors shrink-0">
                    <Wrench className="w-4 h-4 text-fuchsia-400" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-semibold text-white">Rentals & Crew</p>
                    <p className="text-[10px] text-white/30">{rentalRequests.length} inquiries</p>
                  </div>
                  <ArrowUpRight className="w-3.5 h-3.5 text-white/10 ml-auto group-hover:text-fuchsia-400 transition-colors" />
                </button>
                <button
                  onClick={() => setActiveSection("events_categories")}
                  className="group flex items-center gap-3 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-amber-500/20 hover:bg-amber-500/[0.03] transition-all"
                >
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center group-hover:bg-amber-500/20 transition-colors shrink-0">
                    <Settings2 className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-semibold text-white">Categories</p>
                    <p className="text-[10px] text-white/30">Design types</p>
                  </div>
                  <ArrowUpRight className="w-3.5 h-3.5 text-white/10 ml-auto group-hover:text-amber-400 transition-colors" />
                </button>
                <button
                  onClick={() => setActiveSection("extras")}
                  className="group flex items-center gap-3 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-emerald-500/20 hover:bg-emerald-500/[0.03] transition-all"
                >
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors shrink-0">
                    <ShoppingBag className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-semibold text-white">Extras</p>
                    <p className="text-[10px] text-white/30">Inventory menu</p>
                  </div>
                  <ArrowUpRight className="w-3.5 h-3.5 text-white/10 ml-auto group-hover:text-emerald-400 transition-colors" />
                </button>
              </div>

              {/* Rental Inquiries Section on Main Dashboard */}
              <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] overflow-hidden">
                <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wrench className="w-4 h-4 text-fuchsia-400" />
                    <h3 className="text-sm font-semibold text-white">Equipment Rental & Staff Inquiries</h3>
                  </div>
                  <button
                    onClick={() => setActiveSection("rentals")}
                    className="text-[11px] text-violet-400 hover:text-violet-300 font-medium flex items-center gap-1"
                  >
                    Manage All Rentals ({rentalRequests.length}) →
                  </button>
                </div>
                <div className="p-4">
                  {rentalRequests.length === 0 ? (
                    <div className="p-8 text-center text-white/30 space-y-1.5">
                      <p className="text-xs">No rental inquiries submitted yet.</p>
                      <p className="text-[11px] text-white/20">Customer equipment rental and staff requests from the website will appear here.</p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {rentalRequests.slice(0, 4).map((req) => {
                        const statusColors = {
                          pending: "bg-amber-500/10 text-amber-300 border-amber-500/30",
                          confirmed: "bg-blue-500/10 text-blue-300 border-blue-500/30",
                          delivered: "bg-purple-500/10 text-purple-300 border-purple-500/30",
                          completed: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
                          cancelled: "bg-red-500/10 text-red-300 border-red-500/30",
                        };
                        const cleanPhone = (req.phone || "").replace(/\D/g, "");
                        const waLink = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
                          `Hi ${req.customer_name || ""}, regarding your equipment rental inquiry (#${req.id}) with JnE Events:`
                        )}`;

                        return (
                          <div
                            key={req.id}
                            className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-white text-sm">{req.customer_name}</span>
                                <span className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded-full border ${statusColors[req.status] || "bg-white/5 text-white/40"}`}>
                                  {req.status}
                                </span>
                                <span className="text-[10px] text-white/30 font-mono">#{req.id}</span>
                              </div>
                              <div className="flex flex-wrap items-center gap-3 text-white/50 text-[11px]">
                                <span>Phone: <strong className="text-white">{req.phone}</strong></span>
                                <span>Event: <strong className="text-white">{req.event_date || "TBA"}</strong></span>
                                <span>Venue: <strong className="text-white">{req.venue || "Douala/Yaoundé"}</strong></span>
                                <span>Est. Total: <strong className="text-emerald-400 font-mono">{(req.total_price || 0).toLocaleString()} XAF</strong></span>
                              </div>
                              {req.staff_option && (
                                <p className="text-[10px] text-fuchsia-300/70">
                                  Staff: {req.staff_option.label}
                                </p>
                              )}
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              {req.phone && (
                                <a
                                  href={waLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-2.5 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 text-[11px] font-semibold transition-colors flex items-center gap-1.5"
                                >
                                  <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                                </a>
                              )}
                              <button
                                onClick={() => setActiveSection("rentals")}
                                className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-[11px] font-medium transition-colors"
                              >
                                View Details
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Upcoming Events */}
              <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] overflow-hidden">
                <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white">Upcoming Events</h3>
                  <button onClick={() => { setActiveSection("events_all"); setEventsFilter("upcoming"); }} className="text-[11px] text-violet-400 hover:text-violet-300 font-medium">View All →</button>
                </div>
                <div className="p-4">
                  {isLoading ? (
                    <div className="flex justify-center py-8">
                      <div className="w-5 h-5 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : (
                    <EventTable events={events.filter(e => (e.status || "upcoming") === "upcoming").slice(0, 5)} onEdit={handleEdit} onDelete={(id) => deleteMutation.mutate(id)} />
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Events: All */}
          {activeSection === "events_all" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-white tracking-tight">Events Gallery</h2>
                  <p className="text-white/40 text-sm mt-1">
                    {events.filter(e => eventsFilter === "all" ? true : (e.status || "upcoming") === eventsFilter).length} {eventsFilter !== "all" ? eventsFilter : "total"} events
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <select
                    value={eventsFilter}
                    onChange={(e) => setEventsFilter(e.target.value)}
                    className="bg-white/5 border border-white/10 rounded-lg text-sm text-white/70 px-3 py-2 outline-none focus:border-violet-500 transition-all cursor-pointer h-10"
                  >
                    <option value="all" className="bg-[#0a0a0f]">All Events</option>
                    <option value="upcoming" className="bg-[#0a0a0f]">Upcoming</option>
                    <option value="completed" className="bg-[#0a0a0f]">Completed</option>
                    <option value="cancelled" className="bg-[#0a0a0f]">Cancelled</option>
                  </select>
                  <Button
                    onClick={() => { setEditingEvent(null); setShowForm(true); setActiveSection("events_create"); }}
                    className="bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-500/20 h-10"
                  >
                    <Plus className="w-4 h-4 mr-2" /> New Event
                  </Button>
                </div>
              </div>
              <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-4 sm:p-6">
                {isLoading ? (
                  <div className="flex justify-center py-12">
                    <div className="w-6 h-6 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : (
                  <EventTable
                    events={events.filter(e => eventsFilter === "all" ? true : (e.status || "upcoming") === eventsFilter)}
                    onEdit={handleEdit}
                    onDelete={(id) => deleteMutation.mutate(id)}
                  />
                )}
              </div>
            </div>
          )}

          {/* Events: Create/Edit */}
          {activeSection === "events_create" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
              <div>
                <h2 className="text-2xl font-bold text-white tracking-tight">
                  {editingEvent ? "Edit Event" : "Create New Event"}
                </h2>
                <p className="text-white/40 text-sm mt-1">{editingEvent ? `Editing "${editingEvent.title}"` : "Fill in the details for your new event."}</p>
              </div>
              <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-6">
                <EventForm
                  event={editingEvent}
                  onSave={handleSaved}
                  onCancel={() => { setShowForm(false); setEditingEvent(null); setActiveSection("events_all"); }}
                />
              </div>
            </div>
          )}

          {/* Events: Category */}
          {activeSection === "events_categories" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
              <div>
                <h2 className="text-2xl font-bold text-white tracking-tight">Events Category</h2>
                <p className="text-white/40 text-sm mt-1">Define event types and map their refreshment templates in one place.</p>
              </div>
              <CategoryDesigner />
            </div>
          )}

          {/* Bookings */}
          {activeSection === "bookings" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
              <div>
                <h2 className="text-2xl font-bold text-white tracking-tight">Bookings</h2>
                <p className="text-white/40 text-sm mt-1">Manage ticket bookings and check-ins.</p>
              </div>
              <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-4 sm:p-6">
                <BookingManager />
              </div>
            </div>
          )}

          {/* Scanner */}
          {activeSection === "scanner" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
              <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-4 sm:p-6 lg:p-10">
                <ScannerManager />
              </div>
            </div>
          )}

          {/* Users */}
          {activeSection === "users" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
              <div>
                <h2 className="text-2xl font-bold text-white tracking-tight">Users</h2>
                <p className="text-white/40 text-sm mt-1">Manage registered users and admin roles.</p>
              </div>
              <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-4 sm:p-6">
                <UserManager />
              </div>
            </div>
          )}

          {/* Analytics */}
          {activeSection === "analytics" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
              <div>
                <h2 className="text-2xl font-bold text-white tracking-tight">Ecosystem Analytics</h2>
                <p className="text-white/40 text-sm mt-1">Real-time tracking of visitor engagement and booking conversions.</p>
              </div>
              <AnalyticsDashboard />
            </div>
          )}

          {/* Extras */}
          {activeSection === "extras" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
              <div>
                <h2 className="text-2xl font-bold text-white tracking-tight">Extras Manager</h2>
                <p className="text-white/40 text-sm mt-1">Global inventory of food, drinks and add-ons.</p>
              </div>
              <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-4 sm:p-6">
                <ExtrasManager />
              </div>
            </div>
          )}

          {/* Rentals & Staff */}
          {activeSection === "rentals" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
              <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-4 sm:p-6">
                <RentalManager />
              </div>
            </div>
          )}

          {/* Albums */}
          {activeSection === "albums" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
              <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-4 sm:p-6">
                <AlbumManager />
              </div>
            </div>
          )}

          {/* Marketing Subscriptions */}
          {activeSection === "marketing_subscribers" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
              <div>
                <h2 className="text-2xl font-bold text-white tracking-tight">Newsletter Subscribers</h2>
                <p className="text-white/40 text-sm mt-1">Manage leads captured via the homepage notification box.</p>
              </div>
              <SubscriberManager />
            </div>
          )}

          {/* SEO / Marketing placeholders */}
          {["seo", "marketing"].includes(activeSection) && (
            <PlaceholderSection
              icon={activeSection === "seo" ? Globe : Megaphone}
              title={activeSection.toUpperCase()}
              subtitle={`Coming soon — professional ${activeSection} tools.`}
            />
          )}

          {/* Settings */}
          {activeSection === "settings" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
              <div>
                <h2 className="text-2xl font-bold text-white tracking-tight">System Settings</h2>
                <p className="text-white/40 text-sm mt-1">WhatsApp contacts and global configuration.</p>
              </div>
              <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-4 sm:p-6">
                <SettingsPanel />
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }) {
  const colorMap = {
    violet: "bg-violet-500/15 text-violet-400 border-violet-500/20",
    fuchsia: "bg-fuchsia-500/15 text-fuchsia-400 border-fuchsia-500/20",
    purple: "bg-purple-500/15 text-purple-400 border-purple-500/20",
    emerald: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
    amber: "bg-amber-500/15 text-amber-400 border-amber-500/20",
    blue: "bg-blue-500/15 text-blue-400 border-blue-500/20",
    pink: "bg-pink-500/15 text-pink-400 border-pink-500/20",
  };

  const styleClass = colorMap[color] || colorMap.violet;

  return (
    <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-5 hover:border-white/10 transition-colors">
      <div className="flex items-center justify-between mb-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${styleClass}`}>
          <Icon className="w-[18px] h-[18px]" />
        </div>
      </div>
      <p className="text-2xl font-bold text-white tabular-nums">{value ?? "—"}</p>
      <p className="text-[11px] text-white/30 font-medium mt-0.5 uppercase tracking-wider">{label}</p>
    </div>
  );
}

function PlaceholderSection({ icon: Icon, title, subtitle }) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight">{title}</h2>
        <p className="text-white/40 text-sm mt-1">{subtitle}</p>
      </div>
      <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-16 text-center">
        <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto mb-5">
          <Icon className="w-7 h-7 text-white/15" />
        </div>
        <h3 className="text-lg font-bold text-white/20">Under Construction</h3>
        <p className="text-sm text-white/10 mt-2 max-w-sm mx-auto">{subtitle}</p>
      </div>
    </div>
  );
}