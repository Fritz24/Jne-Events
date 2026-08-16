import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import {
  Package, Wrench, Plus, Edit2, Trash2, Check, X, Loader2,
  Calendar, Phone, MapPin, User, DollarSign, Clock, MessageSquare,
  Search, Filter, CheckCircle2, AlertCircle, Sparkles, ExternalLink, Download
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { format } from "date-fns";

export const DEFAULT_RENTAL_ITEMS = [];

export const RENTAL_CATEGORIES = [
  { id: "all", label: "All Items" },
  { id: "sound", label: "Sound & Audio" },
  { id: "visuals", label: "Screens & Projectors" },
  { id: "lighting", label: "Lighting & FX" },
  { id: "power", label: "Power & Staging" },
  { id: "staff", label: "Technical Crew & Staff" },
];

export default function RentalManager() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("requests"); // "requests" | "inventory"
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [editingItem, setEditingItem] = useState(null);
  const [isAddingItem, setIsAddingItem] = useState(false);

  // 1. Fetch Rental Requests from jne_settings -> rental_requests
  const { data: rentalRequests = [], isLoading: isLoadingRequests } = useQuery({
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

  // 2. Fetch Equipment Inventory from jne_settings -> rental_equipment
  const { data: inventory = [], isLoading: isLoadingInventory } = useQuery({
    queryKey: ["rental_equipment"],
    queryFn: async () => {
      const { data } = await supabase
        .from("jne_settings")
        .select("value")
        .eq("key", "rental_equipment")
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

  // Save requests mutation
  const saveRequestsMutation = useMutation({
    mutationFn: async (updatedList) => {
      const { error } = await supabase
        .from("jne_settings")
        .upsert({
          key: "rental_requests",
          value: JSON.stringify(updatedList),
          updated_at: new Date().toISOString(),
        });
      if (error) throw error;
      return updatedList;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rental_requests"] });
    },
  });

  // Save inventory mutation
  const saveInventoryMutation = useMutation({
    mutationFn: async (updatedList) => {
      const { error } = await supabase
        .from("jne_settings")
        .upsert({
          key: "rental_equipment",
          value: JSON.stringify(updatedList),
          updated_at: new Date().toISOString(),
        });
      if (error) throw error;
      return updatedList;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rental_equipment"] });
      setEditingItem(null);
      setIsAddingItem(false);
    },
  });

  const handleUpdateStatus = (requestId, newStatus) => {
    const updated = rentalRequests.map((r) =>
      r.id === requestId ? { ...r, status: newStatus, updated_at: new Date().toISOString() } : r
    );
    saveRequestsMutation.mutate(updated);
  };

  const handleDeleteRequest = (requestId) => {
    if (!confirm("Are you sure you want to delete this rental request?")) return;
    const updated = rentalRequests.filter((r) => r.id !== requestId);
    saveRequestsMutation.mutate(updated);
  };

  const handleSaveItem = (itemData) => {
    let updated;
    if (editingItem && editingItem.id) {
      updated = inventory.map((item) => (item.id === editingItem.id ? { ...item, ...itemData } : item));
    } else {
      const newItem = {
        ...itemData,
        id: `item-${Date.now()}`,
        created_at: new Date().toISOString(),
      };
      updated = [newItem, ...inventory];
    }
    saveInventoryMutation.mutate(updated);
  };

  const handleDeleteItem = (itemId) => {
    if (!confirm("Are you sure you want to delete this equipment item?")) return;
    const updated = inventory.filter((item) => item.id !== itemId);
    saveInventoryMutation.mutate(updated);
  };

  // Filter requests
  const filteredRequests = useMemo(() => {
    return rentalRequests.filter((req) => {
      const matchesStatus = statusFilter === "all" || req.status === statusFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        req.customer_name?.toLowerCase().includes(q) ||
        req.phone?.toLowerCase().includes(q) ||
        req.venue?.toLowerCase().includes(q) ||
        req.id?.toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [rentalRequests, statusFilter, searchQuery]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/5">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2.5">
            <Package className="w-5 h-5 text-violet-400" />
            Equipment Rentals & Installation Staff
          </h1>
          <p className="text-xs text-white/50 mt-1">
            Manage customer rental quotes, installation staff assignments, and equipment inventory.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 bg-white/5 p-1 rounded-xl border border-white/10 self-start">
          <button
            onClick={() => setTab("requests")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${
              tab === "requests"
                ? "bg-violet-600 text-white shadow-sm"
                : "text-white/60 hover:text-white hover:bg-white/5"
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            Rental Requests ({rentalRequests.length})
          </button>
          <button
            onClick={() => setTab("inventory")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${
              tab === "inventory"
                ? "bg-violet-600 text-white shadow-sm"
                : "text-white/60 hover:text-white hover:bg-white/5"
            }`}
          >
            <Wrench className="w-3.5 h-3.5" />
            Catalog & Inventory ({inventory.length})
          </button>
        </div>
      </div>

      {/* ================= TAB 1: RENTAL REQUESTS ================= */}
      {tab === "requests" && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search customer, phone, venue..."
                  className="pl-9 bg-white/5 border-white/10 text-white text-xs h-9"
                />
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-36 bg-white/5 border-white/10 text-white text-xs h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#181822] border-white/10 text-white text-xs">
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="delivered">Delivered / Setup</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="text-xs text-white/40">
              Showing {filteredRequests.length} of {rentalRequests.length} inquiries
            </div>
          </div>

          {/* List of Requests */}
          {isLoadingRequests ? (
            <div className="p-12 text-center text-white/40 flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-violet-400" /> Loading requests...
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="p-12 rounded-2xl bg-white/[0.02] border border-white/5 text-center space-y-2">
              <Package className="w-8 h-8 text-white/20 mx-auto" />
              <p className="text-sm font-semibold text-white/60">No rental inquiries found</p>
              <p className="text-xs text-white/40 max-w-sm mx-auto">
                Customer equipment rental and installation crew bookings will appear here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {filteredRequests.map((req) => {
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
                    className="p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-300 font-bold text-xs">
                          #
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-white text-sm">{req.customer_name}</span>
                            <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${statusColors[req.status] || "bg-white/5 text-white/40"}`}>
                              {req.status}
                            </span>
                          </div>
                          <span className="text-[11px] text-white/40">Ref: {req.id} &bull; Submitted {req.created_at ? format(new Date(req.created_at), "MMM d, yyyy HH:mm") : "Recently"}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {req.phone && (
                          <a
                            href={waLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 rounded-lg bg-emerald-600/20 border border-emerald-500/30 text-emerald-300 text-xs font-semibold hover:bg-emerald-600/30 transition-colors flex items-center gap-1.5"
                          >
                            <MessageSquare className="w-3.5 h-3.5" /> WhatsApp Customer
                          </a>
                        )}

                        <Select
                          value={req.status || "pending"}
                          onValueChange={(val) => handleUpdateStatus(req.id, val)}
                        >
                          <SelectTrigger className="w-32 bg-white/5 border-white/10 text-white text-xs h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-[#181822] border-white/10 text-white text-xs">
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="confirmed">Confirmed</SelectItem>
                            <SelectItem value="delivered">Delivered / Setup</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>

                        <button
                          onClick={() => handleDeleteRequest(req.id)}
                          className="p-2 rounded-lg bg-white/5 hover:bg-red-500/20 text-white/40 hover:text-red-400 transition-colors"
                          title="Delete Request"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Metadata Details Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-2 border-t border-white/5 text-xs text-white/70">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                        <span>Event Date: <strong className="text-white">{req.event_date || "Not specified"}</strong></span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                        <span>Duration: <strong className="text-white">{req.duration_days || 1} day(s)</strong></span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                        <span className="truncate">Venue: <strong className="text-white">{req.venue || "Douala/Yaoundé"}</strong></span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <DollarSign className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>Estimated Total: <strong className="text-emerald-400">{(req.total_price || 0).toLocaleString()} XAF</strong></span>
                      </div>
                    </div>

                    {/* Staff Installation Option */}
                    {req.staff_option && (
                      <div className="p-2.5 rounded-lg bg-violet-950/20 border border-violet-500/20 flex items-center justify-between text-xs text-violet-200">
                        <div className="flex items-center gap-2">
                          <Wrench className="w-3.5 h-3.5 text-violet-400" />
                          <span>Installation Staff: <strong>{req.staff_option.label || "On-Site Installation Crew"}</strong></span>
                        </div>
                        {req.staff_option.price > 0 && (
                          <span className="text-white font-mono text-[11px]">+{req.staff_option.price.toLocaleString()} XAF</span>
                        )}
                      </div>
                    )}

                    {/* Items Breakdown */}
                    {Array.isArray(req.items) && req.items.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <p className="text-[10px] text-white/40 uppercase tracking-wider font-semibold">Equipment Selected:</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1.5">
                          {req.items.map((it, idx) => (
                            <div key={idx} className="p-2 rounded-lg bg-white/[0.02] border border-white/5 text-[11px] text-white/80 flex items-center justify-between">
                              <span className="truncate mr-2">{it.quantity}x {it.name}</span>
                              <span className="text-white/40 shrink-0 font-mono">{(it.subtotal || it.price_per_day * it.quantity).toLocaleString()} XAF</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Special Notes */}
                    {req.notes && (
                      <div className="p-2 rounded-lg bg-white/[0.01] border border-white/5 text-[11px] text-white/60">
                        <strong>Client Notes:</strong> {req.notes}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 2: INVENTORY & CATALOG ================= */}
      {tab === "inventory" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-white">Rental Equipment & Staff Packages</h2>
              <p className="text-xs text-white/40">Add, edit, or adjust equipment rates available for customer booking.</p>
            </div>
            <Button
              onClick={() => {
                setEditingItem({
                  name: "",
                  category: "sound",
                  price_per_day: 20000,
                  unit: "day",
                  image_url: "",
                  description: "",
                  requires_staff: true,
                  in_stock: 5,
                });
                setIsAddingItem(true);
              }}
              className="bg-violet-600 hover:bg-violet-500 text-white text-xs h-9"
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Equipment / Service
            </Button>
          </div>

          {/* Edit / Add Modal or Card */}
          {(isAddingItem || editingItem) && (
            <div className="p-5 rounded-2xl bg-[#13131c] border border-violet-500/30 space-y-4 shadow-2xl animate-in fade-in duration-200">
              <div className="flex items-center justify-between pb-2 border-b border-white/5">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-violet-400" />
                  {isAddingItem ? "Add New Equipment / Crew Package" : "Edit Equipment Item"}
                </h3>
                <button
                  onClick={() => {
                    setEditingItem(null);
                    setIsAddingItem(false);
                  }}
                  className="p-1 rounded-md text-white/40 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-white/70 text-xs">Item / Package Name *</Label>
                  <Input
                    value={editingItem?.name || ""}
                    onChange={(e) => setEditingItem((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g. JBL Active Sound PA Set with Subwoofer"
                    className="bg-white/5 border-white/10 text-white text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-white/70 text-xs">Category *</Label>
                  <Select
                    value={editingItem?.category || "sound"}
                    onValueChange={(val) => setEditingItem((prev) => ({ ...prev, category: val }))}
                  >
                    <SelectTrigger className="bg-white/5 border-white/10 text-white text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#181822] border-white/10 text-white text-xs">
                      <SelectItem value="sound">Sound & Audio</SelectItem>
                      <SelectItem value="visuals">Screens & Projectors</SelectItem>
                      <SelectItem value="lighting">Lighting & FX</SelectItem>
                      <SelectItem value="power">Power & Staging</SelectItem>
                      <SelectItem value="staff">Installation Staff & Crew</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-white/70 text-xs">Price Per Day (XAF) *</Label>
                  <Input
                    type="number"
                    value={editingItem?.price_per_day || ""}
                    onChange={(e) => setEditingItem((prev) => ({ ...prev, price_per_day: Number(e.target.value) }))}
                    placeholder="45000"
                    className="bg-white/5 border-white/10 text-white text-xs"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-white/70 text-xs">Image URL (Unsplash or Cloudinary)</Label>
                  <Input
                    value={editingItem?.image_url || ""}
                    onChange={(e) => setEditingItem((prev) => ({ ...prev, image_url: e.target.value }))}
                    placeholder="https://..."
                    className="bg-white/5 border-white/10 text-white text-xs"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-white/70 text-xs">Description & Specifications</Label>
                  <Textarea
                    value={editingItem?.description || ""}
                    onChange={(e) => setEditingItem((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="Included cables, power specs, dimensions, ideal crowd size..."
                    className="bg-white/5 border-white/10 text-white text-xs min-h-[70px]"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <Switch
                    checked={!!editingItem?.requires_staff}
                    onCheckedChange={(v) => setEditingItem((prev) => ({ ...prev, requires_staff: v }))}
                  />
                  <Label className="text-white/70 text-xs">Recommends Technical Installation Staff</Label>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-white/70 text-xs">Available Stock Units</Label>
                  <Input
                    type="number"
                    value={editingItem?.in_stock || 1}
                    onChange={(e) => setEditingItem((prev) => ({ ...prev, in_stock: Number(e.target.value) }))}
                    className="bg-white/5 border-white/10 text-white text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-white/5">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setEditingItem(null);
                    setIsAddingItem(false);
                  }}
                  className="text-white/50 hover:text-white text-xs"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => handleSaveItem(editingItem)}
                  disabled={!editingItem?.name}
                  className="bg-violet-600 hover:bg-violet-500 text-white text-xs"
                >
                  Save Item
                </Button>
              </div>
            </div>
          )}

          {/* Catalog Grid */}
          {inventory.length === 0 ? (
            <div className="p-12 rounded-2xl bg-white/[0.02] border border-white/5 text-center space-y-3">
              <Package className="w-8 h-8 text-white/20 mx-auto" />
              <p className="text-sm font-semibold text-white/70">No equipment in inventory yet</p>
              <p className="text-xs text-white/40 max-w-sm mx-auto">
                Click &quot;Add Equipment / Service&quot; above to add your real sound gear, lighting, projectors, and installation staff packages.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {inventory.map((item) => (
              <div
                key={item.id}
                className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 flex flex-col justify-between transition-all space-y-3"
              >
                <div className="space-y-2">
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="w-full h-32 object-cover rounded-lg bg-black/40"
                    />
                  ) : (
                    <div className="w-full h-32 rounded-lg bg-white/5 flex items-center justify-center text-white/20">
                      <Package className="w-8 h-8" />
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] uppercase font-bold text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded">
                        {item.category}
                      </span>
                      <span className="text-xs font-mono font-semibold text-emerald-400">
                        {item.price_per_day.toLocaleString()} XAF / {item.unit || "day"}
                      </span>
                    </div>
                    <h4 className="font-semibold text-white text-sm mt-1.5">{item.name}</h4>
                    <p className="text-[11px] text-white/50 line-clamp-2 mt-0.5">{item.description}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-white/5">
                  <span className="text-[10px] text-white/40">
                    Stock: {item.in_stock || "Unlimited"}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => {
                        setEditingItem(item);
                        setIsAddingItem(false);
                      }}
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                      title="Edit"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-red-500/20 text-white/40 hover:text-red-400 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )}
  </div>
);
}
