import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Helmet } from "react-helmet-async";
import {
  Package, Wrench, Plus, Minus, Check, Calendar, MapPin, Phone,
  User, Mail, MessageSquare, CheckCircle2, ArrowRight, Sparkles,
  ShieldCheck, Clock, Zap, Volume2, Tv, Lightbulb, AlertCircle, ShoppingBag, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DEFAULT_RENTAL_ITEMS, RENTAL_CATEGORIES } from "@/components/admin/RentalManager";
import { useLang } from "@/lib/LanguageContext";

export default function Rentals() {
  const { lang, t } = useLang();
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [cart, setCart] = useState({}); // { [itemId]: quantity }
  const [eventDate, setEventDate] = useState("");
  const [durationDays, setDurationDays] = useState(1);
  const [staffPackage, setStaffPackage] = useState("standard"); // "none" | "standard" | "vip"
  const [venue, setVenue] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [submittedRequest, setSubmittedRequest] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [quoteDrawerOpen, setQuoteDrawerOpen] = useState(false);

  // Fetch live inventory from Supabase settings
  const { data: inventory = [], isLoading } = useQuery({
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

  // Filter items by category
  const filteredItems = useMemo(() => {
    if (selectedCategory === "all") return inventory;
    return inventory.filter((item) => item.category === selectedCategory);
  }, [inventory, selectedCategory]);

  // Cart operations
  const addToCart = (itemId) => {
    setCart((prev) => ({
      ...prev,
      [itemId]: (prev[itemId] || 0) + 1,
    }));
    setQuoteDrawerOpen(true);
  };

  const removeFromCart = (itemId) => {
    setCart((prev) => {
      const updated = { ...prev };
      if (updated[itemId] > 1) {
        updated[itemId] -= 1;
      } else {
        delete updated[itemId];
      }
      return updated;
    });
  };

  const clearItem = (itemId) => {
    setCart((prev) => {
      const updated = { ...prev };
      delete updated[itemId];
      return updated;
    });
  };

  // Staff package options
  const staffPackages = {
    none: {
      id: "none",
      label: "Gear Only (Self-Pickup / Client Installation)",
      price: 0,
      description: "Pick up the equipment at our warehouse and handle your own installation.",
    },
    standard: {
      id: "standard",
      label: "Delivery + Setup & Teardown Crew (Recommended)",
      price: 25000,
      description: "Our certified technicians deliver, assemble, sound-check, and teardown after event.",
    },
    vip: {
      id: "vip",
      label: "Turnkey VIP Crew (Delivery + Setup + Dedicated Live Sound/Lighting Operator)",
      price: 50000,
      description: "Full setup crew PLUS an on-site audio/lighting engineer managing everything during the show.",
    },
  };

  // Total calculation
  const itemsSubtotal = useMemo(() => {
    let sum = 0;
    Object.entries(cart).forEach(([itemId, qty]) => {
      const item = inventory.find((i) => i.id === itemId);
      if (item && qty > 0) {
        sum += item.price_per_day * qty;
      }
    });
    return sum * Math.max(1, durationDays);
  }, [cart, inventory, durationDays]);

  const staffPrice = staffPackages[staffPackage]?.price || 0;
  const grandTotal = itemsSubtotal + (Object.keys(cart).length > 0 ? staffPrice : 0);
  const totalItemCount = Object.values(cart).reduce((a, b) => a + b, 0);

  // WhatsApp Message Generator
  const generateWhatsAppMessage = (reqRef) => {
    const selectedList = Object.entries(cart)
      .map(([id, qty]) => {
        const item = inventory.find((i) => i.id === id);
        return item ? `• ${qty}x ${item.name} (${(item.price_per_day * qty).toLocaleString()} XAF/day)` : null;
      })
      .filter(Boolean)
      .join("\n");

    const staffText = staffPackages[staffPackage]?.label || "Standard Installation";

    return (
      `Hello JnE Events! 👋 I'd like to request a quote for equipment rental & staff:\n\n` +
      `*Reference:* #${reqRef || "NEW"}\n` +
      `*Client:* ${customerName || "Customer"}\n` +
      `*Phone:* ${phone}\n` +
      `*Event Date:* ${eventDate || "TBA"}\n` +
      `*Duration:* ${durationDays} Day(s)\n` +
      `*Venue / City:* ${venue || "Not specified"}\n` +
      `*Staff Installation:* ${staffText} (${staffPrice.toLocaleString()} XAF)\n\n` +
      `*Selected Equipment:*\n${selectedList || "None"}\n\n` +
      `*Estimated Total:* ${grandTotal.toLocaleString()} XAF\n` +
      (notes ? `*Notes:* ${notes}\n\n` : "\n") +
      `Please confirm availability and dispatch terms.`
    );
  };

  // Submit Request
  const handleSubmitBooking = async (e) => {
    if (e) e.preventDefault();
    if (!customerName || !phone) {
      alert("Please provide your name and phone number.");
      return;
    }
    if (Object.keys(cart).length === 0) {
      alert("Please select at least one piece of equipment or staff package.");
      return;
    }

    setIsSubmitting(true);
    const reqRef = `RNT-${Math.floor(100000 + Math.random() * 900000)}`;

    const requestPayload = {
      id: reqRef,
      customer_name: customerName,
      phone,
      email,
      event_date: eventDate,
      duration_days: durationDays,
      venue,
      notes,
      staff_option: {
        id: staffPackage,
        label: staffPackages[staffPackage]?.label,
        price: staffPrice,
      },
      items: Object.entries(cart).map(([id, qty]) => {
        const item = inventory.find((i) => i.id === id);
        return {
          id,
          name: item?.name || "Equipment",
          price_per_day: item?.price_per_day || 0,
          quantity: qty,
          subtotal: (item?.price_per_day || 0) * qty * durationDays,
        };
      }),
      items_subtotal: itemsSubtotal,
      total_price: grandTotal,
      status: "pending",
      created_at: new Date().toISOString(),
    };

    try {
      // 1. Fetch current rental_requests
      const { data: existingData } = await supabase
        .from("jne_settings")
        .select("value")
        .eq("key", "rental_requests")
        .maybeSingle();

      let currentRequests = [];
      if (existingData?.value) {
        try {
          currentRequests = JSON.parse(existingData.value);
        } catch (err) {}
      }

      const updatedRequests = [requestPayload, ...currentRequests];

      // 2. Save back to jne_settings
      await supabase
        .from("jne_settings")
        .upsert({
          key: "rental_requests",
          value: JSON.stringify(updatedRequests),
          updated_at: new Date().toISOString(),
        });

      setSubmittedRequest(requestPayload);
      setIsSubmitting(false);
    } catch (err) {
      console.error("Failed to save rental request:", err);
      // Still allow customer to proceed with local reference
      setSubmittedRequest(requestPayload);
      setIsSubmitting(false);
    }
  };

  const handleWhatsAppRedirect = () => {
    const waText = generateWhatsAppMessage(submittedRequest?.id || "DIRECT");
    window.open(`https://wa.me/237699000000?text=${encodeURIComponent(waText)}`, "_blank");
  };

  return (
    <div className="min-h-screen pt-20 pb-28 text-white">
      <Helmet>
        <title>Equipment Rental & Installation Staff | JnE Events</title>
        <meta
          name="description"
          content="Rent professional sound PA systems, 4K laser projectors, giant outdoor screens, stage lighting, and hire certified installation crew for events."
        />
      </Helmet>

      {/* Hero Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-950/40 via-[#11111a] to-[#0a0a0f] border border-white/10 p-6 sm:p-12 shadow-2xl">
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/30 text-violet-300 text-xs font-semibold">
              <Wrench className="w-3.5 h-3.5" /> Professional Gear & Certified Riggers
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white">
              Event Equipment Rental & Installation Staff
            </h1>
            <p className="text-sm sm:text-base text-white/60 leading-relaxed">
              Rent high-output sound systems, giant cinema screens, stage lighting, and power generators with professional on-site setup technicians.
            </p>

            <div className="flex flex-wrap gap-4 pt-2 text-xs text-white/70">
              <span className="flex items-center gap-1.5">
                <Check className="w-4 h-4 text-emerald-400" /> Sound & 4K Projection
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="w-4 h-4 text-emerald-400" /> Certified Installation Crew
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="w-4 h-4 text-emerald-400" /> On-Time Delivery Guarantee
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Category Navigation Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-6 scrollbar-none">
          {RENTAL_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
                selectedCategory === cat.id
                  ? "bg-violet-600 border-violet-500 text-white shadow-lg shadow-violet-950/40"
                  : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Catalog Grid & Sticky Cart Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left 2 Cols: Equipment Catalog */}
          <div className="lg:col-span-2 space-y-4">
            {filteredItems.length === 0 ? (
              <div className="p-12 rounded-3xl bg-white/[0.02] border border-white/5 text-center space-y-3">
                <Package className="w-10 h-10 text-white/20 mx-auto" />
                <h3 className="text-base font-bold text-white/80">No Equipment in Catalog Yet</h3>
                <p className="text-xs text-white/40 max-w-md mx-auto leading-relaxed">
                  Our rental equipment and technical crew packages are currently being updated. Need a custom audio, lighting, or screen setup right now?
                </p>
                <div className="pt-2">
                  <a
                    href="https://wa.me/237699000000?text=Hello%20JnE%20Events!%20I'd%20like%20to%20inquire%20about%20equipment%20rental%20and%20staff."
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 text-xs font-semibold transition-all"
                  >
                    <MessageSquare className="w-4 h-4" /> Inquire Directly on WhatsApp
                  </a>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filteredItems.map((item) => {
                  const qtyInCart = cart[item.id] || 0;
                  return (
                    <div
                      key={item.id}
                      className="rounded-2xl bg-white/[0.02] border border-white/10 hover:border-white/20 transition-all overflow-hidden flex flex-col justify-between group shadow-lg"
                    >
                      <div>
                        {/* Image */}
                        <div className="relative h-44 w-full bg-black/40 overflow-hidden">
                          {item.image_url ? (
                            <img
                              src={item.image_url}
                              alt={item.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-white/20">
                              <Package className="w-10 h-10" />
                            </div>
                          )}
                          <span className="absolute top-2.5 left-2.5 text-[10px] uppercase font-bold px-2.5 py-1 rounded-md bg-black/70 backdrop-blur-md text-violet-300 border border-white/10">
                            {item.category}
                          </span>
                        </div>

                        {/* Info */}
                        <div className="p-4 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="font-semibold text-white text-sm leading-snug">{item.name}</h3>
                          </div>
                          <p className="text-xs text-white/50 line-clamp-2 leading-relaxed">
                            {item.description}
                          </p>
                        </div>
                      </div>

                      {/* Price & Action Button */}
                      <div className="p-4 pt-2 border-t border-white/5 flex items-center justify-between gap-2">
                        <div>
                          <span className="text-xs text-white/40 block text-[10px] uppercase">Daily Rate</span>
                          <span className="text-sm font-bold text-emerald-400 font-mono">
                            {item.price_per_day.toLocaleString()} XAF
                          </span>
                        </div>

                        {qtyInCart > 0 ? (
                          <div className="flex items-center gap-1.5 bg-violet-600/20 border border-violet-500/40 p-1 rounded-xl">
                            <button
                              onClick={() => removeFromCart(item.id)}
                              className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white text-xs"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="w-6 text-center font-bold text-xs text-white">{qtyInCart}</span>
                            <button
                              onClick={() => addToCart(item.id)}
                              className="w-7 h-7 rounded-lg bg-violet-600 hover:bg-violet-500 flex items-center justify-center text-white text-xs"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <Button
                            onClick={() => addToCart(item.id)}
                            className="bg-white/5 hover:bg-violet-600 text-white border border-white/10 hover:border-violet-500 text-xs h-8 px-3 rounded-xl transition-all"
                          >
                            <Plus className="w-3.5 h-3.5 mr-1" /> Add to Quote
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Col: Quote Calculator & Booking Drawer */}
          <div className="space-y-6">
            <div className="sticky top-24 rounded-3xl bg-[#111118] border border-white/10 p-5 space-y-5 shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-violet-400" />
                  <h3 className="font-bold text-white text-sm">Your Rental Quote</h3>
                </div>
                <span className="text-xs text-white/40 bg-white/5 px-2 py-0.5 rounded-full">
                  {totalItemCount} item(s)
                </span>
              </div>

              {/* Items List */}
              {Object.keys(cart).length === 0 ? (
                <div className="p-6 text-center text-white/30 space-y-2">
                  <Package className="w-8 h-8 mx-auto text-white/20" />
                  <p className="text-xs">No equipment added yet. Click &quot;Add to Quote&quot; on any item to calculate pricing.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1 scrollbar-thin">
                  {Object.entries(cart).map(([id, qty]) => {
                    const item = inventory.find((i) => i.id === id);
                    if (!item) return null;
                    return (
                      <div
                        key={id}
                        className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between text-xs gap-2"
                      >
                        <div className="truncate flex-1">
                          <span className="font-semibold text-white truncate block">{item.name}</span>
                          <span className="text-[10px] text-white/40 font-mono">
                            {qty} x {item.price_per_day.toLocaleString()} XAF
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="font-mono text-emerald-400 font-bold">
                            {(item.price_per_day * qty * durationDays).toLocaleString()} XAF
                          </span>
                          <button
                            onClick={() => clearItem(id)}
                            className="p-1 text-white/30 hover:text-red-400"
                            title="Remove"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Event Date & Duration */}
              <div className="space-y-3 pt-2 border-t border-white/5 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-white/60 text-[11px]">Event Date</Label>
                    <Input
                      type="date"
                      value={eventDate}
                      onChange={(e) => setEventDate(e.target.value)}
                      className="bg-white/5 border-white/10 text-white text-xs h-8"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-white/60 text-[11px]">Duration (Days)</Label>
                    <Input
                      type="number"
                      min="1"
                      max="30"
                      value={durationDays}
                      onChange={(e) => setDurationDays(Math.max(1, parseInt(e.target.value) || 1))}
                      className="bg-white/5 border-white/10 text-white text-xs h-8 text-center font-mono"
                    />
                  </div>
                </div>

                {/* Staff Installation Package */}
                <div className="space-y-1.5 pt-1">
                  <Label className="text-white/80 text-[11px] font-semibold flex items-center gap-1.5">
                    <Wrench className="w-3.5 h-3.5 text-violet-400" />
                    Installation Staff & Technical Crew
                  </Label>
                  <div className="space-y-1.5">
                    {Object.values(staffPackages).map((pkg) => (
                      <button
                        key={pkg.id}
                        type="button"
                        onClick={() => setStaffPackage(pkg.id)}
                        className={`w-full p-2.5 rounded-xl border text-left transition-all ${
                          staffPackage === pkg.id
                            ? "bg-violet-600/20 border-violet-500 text-white"
                            : "bg-white/[0.02] border-white/5 text-white/60 hover:text-white"
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs font-semibold">
                          <span>{pkg.label}</span>
                          <span className="font-mono text-emerald-400">
                            {pkg.price === 0 ? "Free" : `+${pkg.price.toLocaleString()} XAF`}
                          </span>
                        </div>
                        <p className="text-[10px] text-white/40 mt-0.5">{pkg.description}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Customer Contact Details */}
                <div className="space-y-2 pt-2 border-t border-white/5">
                  <div className="space-y-1">
                    <Label className="text-white/60 text-[11px]">Full Name *</Label>
                    <Input
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Your Name / Organization"
                      className="bg-white/5 border-white/10 text-white text-xs h-8"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-white/60 text-[11px]">WhatsApp Phone *</Label>
                      <Input
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+237 6..."
                        className="bg-white/5 border-white/10 text-white text-xs h-8"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-white/60 text-[11px]">Venue / City</Label>
                      <Input
                        value={venue}
                        onChange={(e) => setVenue(e.target.value)}
                        placeholder="Douala, Bonapriso"
                        className="bg-white/5 border-white/10 text-white text-xs h-8"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-white/60 text-[11px]">Special Notes</Label>
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Access hours, indoor/outdoor setup requirements..."
                      className="bg-white/5 border-white/10 text-white text-xs min-h-[50px]"
                    />
                  </div>
                </div>
              </div>

              {/* Total & Action Buttons */}
              <div className="space-y-3 pt-3 border-t border-white/10">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/60">Estimated Total:</span>
                  <span className="font-mono text-lg font-extrabold text-emerald-400">
                    {grandTotal.toLocaleString()} XAF
                  </span>
                </div>

                <div className="space-y-2">
                  <Button
                    onClick={handleSubmitBooking}
                    disabled={isSubmitting || Object.keys(cart).length === 0 || !customerName || !phone}
                    className="w-full bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold h-10 rounded-xl shadow-lg shadow-violet-950/50"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 mr-1.5" /> Submit Rental Request
                      </>
                    )}
                  </Button>

                  <button
                    type="button"
                    onClick={handleWhatsAppRedirect}
                    disabled={Object.keys(cart).length === 0}
                    className="w-full py-2.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 text-xs font-semibold transition-all flex items-center justify-center gap-1.5"
                  >
                    <MessageSquare className="w-3.5 h-3.5" /> Instant Quote on WhatsApp
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {submittedRequest && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-md w-full rounded-3xl bg-[#11111a] border border-violet-500/30 p-6 space-y-4 shadow-2xl text-center animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-bold text-white">Rental Request Received!</h3>
              <p className="text-xs text-white/50">
                Reference ID: <strong className="text-white font-mono">{submittedRequest.id}</strong>
              </p>
            </div>

            <p className="text-xs text-white/70 leading-relaxed bg-white/[0.02] p-3 rounded-xl border border-white/5">
              Thank you, <strong>{submittedRequest.customer_name}</strong>. Our logistics and engineering team has received your equipment & installation request and will contact you via WhatsApp shortly to finalize delivery and payment.
            </p>

            <div className="space-y-2 pt-2">
              <Button
                onClick={handleWhatsAppRedirect}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold h-10 rounded-xl"
              >
                <MessageSquare className="w-4 h-4 mr-2" /> Open WhatsApp to Confirm
              </Button>
              <Button
                variant="ghost"
                onClick={() => setSubmittedRequest(null)}
                className="w-full text-white/40 hover:text-white text-xs"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
