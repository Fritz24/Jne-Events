import { useState, useRef, useEffect } from "react";
import { format } from "date-fns";
import { X, Download, Share2, Ticket, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import html2canvas from "html2canvas";
import { supabase } from "@/lib/supabase";
import { QRCodeSVG } from "qrcode.react";
import { appParams } from "@/lib/app-params";
import { isSoldOut, remainingSlots, tierSlotCount } from "@/utils/ticketCount";
import { useQuery } from "@tanstack/react-query";

export default function TicketGenerator({ event, onClose }) {
  const ticketRef = useRef(null);
  const wrapperRef = useRef(null);
  const [attendeeName, setAttendeeName] = useState("Guest");
  const tiers = event.ticket_tiers?.length
    ? event.ticket_tiers
    : [{ label: "Standard", price: event.price || 0 }];
  const [selectedTier, setSelectedTier] = useState(tiers[0].label);
  const [downloading, setDownloading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const tier = tiers.find(t => t.label === selectedTier) || tiers[0];
  const [ticketId] = useState(() => `JNE-${event.id?.slice(-5).toUpperCase() || "00001"}-${Date.now().toString(36).toUpperCase().slice(-4)}`);

  const { data: allBookings = [] } = useQuery({
    queryKey: ["bookings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('jne_bookings')
        .select('*')
        .order('created_date', { ascending: false })
        .limit(200);
      if (error) throw error;
      return data || [];
    },
  });

  const eventBookings = allBookings.filter(b => b.event_id === event.id);
  const soldOut = isSoldOut(eventBookings);
  const remaining = remainingSlots(eventBookings);
  const slotsNeeded = tierSlotCount(tier.label);

  // ─── Download: temporarily show ticket at native size, capture, restore ───
  const captureTicket = async () => {
    const el = ticketRef.current;

    // Save current styles
    const savedTransform = el.style.transform;
    const savedOverflow = el.style.overflow;

    // Temporarily make it full native size with no clipping
    el.style.transform = "none";
    el.style.overflow = "visible";

    // Wait for the browser to FULLY reflow + repaint at the new size
    // Double requestAnimationFrame ensures layout is computed and painted
    await new Promise(r => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setTimeout(r, 500);
        });
      });
    });

    try {
      const canvas = await html2canvas(el, {
        backgroundColor: null,
        scale: 1,
        useCORS: true,
        width: 1080,
        height: 540,
        scrollX: 0,
        scrollY: 0,
        x: 0,
        y: 0,
      });
      return canvas;
    } finally {
      // Restore
      el.style.transform = savedTransform;
      el.style.overflow = savedOverflow;
    }
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const canvas = await captureTicket();
      const link = document.createElement("a");
      link.download = `JNE-Ticket-${event.title.replace(/\s+/g, "-")}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (err) {
      console.error("Download failed:", err);
    }
    setDownloading(false);
  };

  const handleShare = async () => {
    const canvas = await captureTicket();
    const message = `Hi! I'd like to book a ${tier.label} (${tier.price?.toLocaleString()} ${event.currency || "XAF"}) for ${event.title} on ${event.date ? format(new Date(event.date), "EEE, MMM d") : "TBA"}. Please let me know how to proceed. 🎟️`;
    canvas.toBlob(async (blob) => {
      const file = new File([blob], "ticket.png", { type: "image/png" });
      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: `JNE Nightouts – ${event.title}`, text: message });
      } else {
        const url = `https://wa.me/${event.whatsapp_number?.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`;
        window.open(url, "_blank");
      }
    });
  };

  const handleSaveBooking = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('jne_bookings')
      .insert([{
        ticket_id: ticketId,
        event_id: event.id,
        event_title: event.title,
        attendee_name: attendeeName,
        tier_label: tier.label,
        tier_price: tier.price,
        currency: event.currency || "XAF",
        status: "confirmed",
      }]);

    if (error) {
      console.error("Booking save failed:", error);
      alert("Failed to save booking: " + error.message);
    } else {
      setSaved(true);
    }
    setSaving(false);
  };

  // ─── Scale the ticket preview to fit inside the wrapper ───
  useEffect(() => {
    const update = () => {
      if (!wrapperRef.current || !ticketRef.current) return;
      const scale = wrapperRef.current.offsetWidth / 1080;
      ticketRef.current.style.transform = `scale(${scale})`;
      wrapperRef.current.style.height = `${Math.ceil(540 * scale) + 4}px`;
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-[#111118] border border-white/10 rounded-2xl w-full max-w-4xl overflow-hidden max-h-[95vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <div className="flex items-center gap-2 text-white font-semibold">
            <Ticket className="w-5 h-5 text-violet-400" />
            Ticket Generator
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Controls row */}
        <div className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-4 border-b border-white/10">
          <div className="space-y-2">
            <Label className="text-white/60 text-sm">Attendee Name</Label>
            <Input
              value={attendeeName}
              onChange={e => { setAttendeeName(e.target.value); setSaved(false); }}
              placeholder="Guest"
              className="bg-white/5 border-white/10 text-white"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-white/60 text-sm">Ticket Tier</Label>
            <Select value={selectedTier} onValueChange={v => { setSelectedTier(v); setSaved(false); }}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {tiers.map(t => (
                  <SelectItem key={t.label} value={t.label}>
                    {t.label} — {t.price?.toLocaleString()} {event.currency || "XAF"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2 justify-end">
            {(soldOut || slotsNeeded > remaining) && !saved ? (
              <div className="px-4 py-2.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-sm font-medium text-center">
                🎉 Sold Out — No slots remaining
              </div>
            ) : (
              <Button
                onClick={handleSaveBooking}
                disabled={saving || saved}
                className={saved ? "bg-emerald-600 text-white" : "bg-violet-600 hover:bg-violet-500 text-white"}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                {saved ? "Booking Confirmed!" : saving ? "Saving..." : "Confirm & Save Booking"}
              </Button>
            )}
            {!soldOut && !saved && (
              <p className="text-xs text-white/30 text-center">{remaining} slot{remaining !== 1 ? "s" : ""} left · this tier uses {slotsNeeded}</p>
            )}
            <div className="flex gap-2">
              <Button onClick={handleDownload} disabled={downloading} variant="outline" className="border-violet-500 text-black hover:bg-violet-500/20 flex-1">
                <Download className="w-4 h-4 mr-2" />
                {downloading ? "Generating..." : "Download PNG"}
              </Button>
              <Button onClick={handleShare} variant="outline" className="border-violet-500 text-black hover:bg-violet-500/20 flex-1">
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
            </div>
          </div>
        </div>

        {/* ── Ticket Preview ── */}
        <div className="p-5 flex items-center justify-center bg-[#0a0a0f]">
          <div ref={wrapperRef} style={{ width: "100%", maxWidth: "720px", position: "relative" }}>

            {/* The actual ticket — always 1080×540 native, CSS-scaled to fit */}
            <div
              ref={ticketRef}
              style={{
                width: "1080px",
                height: "540px",
                transformOrigin: "top left",
                display: "flex",
                flexDirection: "row",
                background: "linear-gradient(135deg, #1a0a2e 0%, #0d0d1a 50%, #1a0a0d 100%)",
                borderRadius: "24px",
                overflow: "hidden",
                fontFamily: "system-ui, sans-serif",
                position: "relative",
              }}
            >
              {/* Background image */}
              {event.image_url && (
                <>
                  <img
                    src={event.image_url}
                    alt=""
                    crossOrigin="anonymous"
                    style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center" }}
                  />
                  <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to right, rgba(10,10,15,0.85) 0%, rgba(10,10,15,0.75) 60%, rgba(10,10,15,0.9) 100%)" }} />
                </>
              )}

              {/* ─── Left: Event info ─── */}
              <div style={{ position: "relative", flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "24px 30px 22px", boxSizing: "border-box" }}>

                {/* Row 1: Brand */}
                <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
                  <div style={{ width: "34px", height: "34px", borderRadius: "9px", background: "linear-gradient(135deg, #8B5CF6, #F59E0B)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", flexShrink: 0 }}>🎬</div>
                  <span style={{ color: "rgba(255,255,255,0.6)", fontWeight: "700", fontSize: "14px", letterSpacing: "2px", textTransform: "uppercase" }}>JNE Nightouts</span>
                </div>

                {/* Row 2: Type + Title */}
                <div style={{ marginTop: "14px", flexShrink: 0 }}>
                  <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "2px", marginBottom: "4px" }}>
                    {event.type === "movie_night" ? "🎬 Movie Night" : "🎵 Music Event"}
                  </div>
                  <div style={{ color: "white", fontWeight: "800", fontSize: "26px", lineHeight: "1.15" }}>{event.title}</div>
                  {event.artist_or_movie && (
                    <div style={{ color: "rgba(167, 139, 250, 0.9)", fontSize: "15px", marginTop: "3px" }}>{event.artist_or_movie}</div>
                  )}
                </div>

                {/* Row 3: Info grid */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 16px", marginTop: "14px", alignContent: "start" }}>
                  {[
                    { label: "Date", value: event.date ? format(new Date(event.date), "EEE, MMM d, yyyy") : "TBA" },
                    { label: "Time", value: event.date ? format(new Date(event.date), "h:mm a") : "TBA" },
                    { label: "Venue", value: event.venue },
                    { label: "City", value: event.city || "Various" },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <div style={{ color: "rgba(255,255,255,0.35)", fontSize: "10px", textTransform: "uppercase", letterSpacing: "1.5px" }}>{label}</div>
                      <div style={{ color: "white", fontSize: "14px", fontWeight: "600", marginTop: "1px" }}>{value}</div>
                    </div>
                  ))}
                </div>

                {/* Row 4: Attendee + Tier + Price */}
                <div style={{ borderTop: "1px dashed rgba(139, 92, 246, 0.4)", paddingTop: "10px", display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: "12px", alignItems: "end", flexShrink: 0 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ color: "rgba(255,255,255,0.35)", fontSize: "10px", textTransform: "uppercase", letterSpacing: "1.5px" }}>Attendee</div>
                    <div style={{ color: "white", fontWeight: "700", fontSize: "16px", marginTop: "2px", whiteSpace: "nowrap", lineHeight: "1.3" }}>{attendeeName}</div>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ color: "rgba(255,255,255,0.35)", fontSize: "10px", textTransform: "uppercase", letterSpacing: "1.5px" }}>Ticket Type</div>
                    <div style={{ color: "#A78BFA", fontWeight: "700", fontSize: "16px", marginTop: "2px", whiteSpace: "nowrap", lineHeight: "1.3" }}>{tier.label}</div>
                  </div>
                  <div style={{ color: "rgba(245, 158, 11, 0.95)", fontWeight: "800", fontSize: "20px", textAlign: "right", lineHeight: "1.3" }}>
                    {tier.price?.toLocaleString()} {event.currency || "XAF"}
                  </div>
                </div>
              </div>

              {/* ─── Vertical tear line ─── */}
              <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", width: "26px", flexShrink: 0 }}>
                <div style={{ width: "22px", height: "22px", borderRadius: "50%", background: "#0a0a0f", flexShrink: 0, marginTop: "-11px" }} />
                <div style={{ flex: 1, borderLeft: "3px dashed rgba(139, 92, 246, 0.35)", width: 0 }} />
                <div style={{ width: "22px", height: "22px", borderRadius: "50%", background: "#0a0a0f", flexShrink: 0, marginBottom: "-11px" }} />
              </div>

              {/* ─── Right: QR Code ─── */}
              <div style={{ position: "relative", width: "200px", flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "12px", padding: "20px", boxSizing: "border-box" }}>
                <div style={{ background: "white", padding: "10px", borderRadius: "12px" }}>
                  <QRCodeSVG
                    value={`${appParams.appBaseUrl || window.location.origin}/ScanTicket?id=${ticketId}`}
                    size={110}
                    level="H"
                  />
                </div>
                <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "12px", fontFamily: "monospace", letterSpacing: "1px", textAlign: "center", wordBreak: "break-all" }}>
                  {ticketId}
                </span>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}