import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Plus, CalendarDays, Ticket, ShieldOff, ShoppingBag } from "lucide-react";
import EventForm from "../components/admin/EventForm";
import EventTable from "../components/admin/EventTable";
import BookingManager from "../components/admin/BookingManager";
import ShopManager from "../components/admin/ShopManager";
import { useAuth } from "@/lib/AuthContext";

const TABS = [
  { id: "events", label: "Events", icon: CalendarDays },
  { id: "bookings", label: "Bookings", icon: Ticket },
  { id: "shop", label: "Extras", icon: ShoppingBag },
];

export default function Admin() {
  const { user, isLoadingAuth } = useAuth();
  const [tab, setTab] = useState("events");
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
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

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from('jne_events')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["events"] }),
  });

  const handleEdit = (event) => {
    setEditingEvent(event);
    setShowForm(true);
  };

  const handleSaved = () => {
    setShowForm(false);
    setEditingEvent(null);
    queryClient.invalidateQueries({ queryKey: ["events"] });
  };

  if (isLoadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-white/10 border-t-violet-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Admin Dashboard</h1>
          <p className="text-white/40 mt-1">{events.length} total events</p>
        </div>
        {tab === "events" && !showForm && (
          <Button
            onClick={() => { setEditingEvent(null); setShowForm(true); }}
            className="bg-violet-600 hover:bg-violet-500 text-white"
          >
            <Plus className="w-4 h-4 mr-2" /> New Event
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 p-1 bg-white/[0.03] border border-white/[0.06] rounded-xl w-fit">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.id
                ? "bg-violet-600 text-white shadow"
                : "text-white/50 hover:text-white hover:bg-white/5"
                }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "events" && (
        <>
          {showForm && (
            <div className="mb-10 p-6 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
              <h2 className="text-lg font-semibold text-white mb-6">
                {editingEvent ? "Edit Event" : "Create New Event"}
              </h2>
              <EventForm
                event={editingEvent}
                onSave={handleSaved}
                onCancel={() => { setShowForm(false); setEditingEvent(null); }}
              />
            </div>
          )}
          <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-4 sm:p-6">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <div className="w-6 h-6 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <EventTable events={events} onEdit={handleEdit} onDelete={(id) => deleteMutation.mutate(id)} />
            )}
          </div>
        </>
      )}

      {tab === "bookings" && (
        <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-4 sm:p-6">
          <BookingManager />
        </div>
      )}

      {tab === "shop" && (
        <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-4 sm:p-6">
          <ShopManager />
        </div>
      )}
    </div>
  );
}