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
  const soldOut = isSoldOut(allBookings);
  const remaining = remainingSlots(allBookings);
  const slotsNeeded = tierSlotCount(tier.label);
  const wrapperRef = useRef(null);

  useEffect(() => {
    const updateScale = () => {
      if (wrapperRef.current && ticketRef.current) {
        const containerWidth = wrapperRef.current.offsetWidth;
        const scale = containerWidth / 1080;
        ticketRef.current.style.setProperty("--ticket-scale", scale);
        ticketRef.current.style.transform = `scale(${scale})`;
        // Update the padding-bottom of the parent to match scaled height
        const parent = ticketRef.current.parentElement;
        if (parent) parent.style.paddingBottom = `${540 * scale}px`;
      }
    };
    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, []);

  const captureTicket = async () => {
    return html2canvas(ticketRef.current, { backgroundColor: null, scale: 2, useCORS: true });
  };

  const handleDownload = async () => {
    setDownloading(true);
    const canvas = await captureTicket();
    const link = document.createElement("a");
    link.download = `JNE-Ticket-${event.title.replace(/\s+/g, "-")}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
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

        {/* Ticket Preview — fixed 1080×540 scaled down */}
        <div className="p-5 flex items-center justify-center bg-[#0a0a0f]">
          <div ref={wrapperRef} style={{ width: "100%", maxWidth: "720px" }}>
            {/* Scale wrapper: ticket is always 1080×540 internally, scaled to fit */}
            <div style={{ position: "relative", paddingBottom: "50%", overflow: "hidden" }}>
              <div
                ref={ticketRef}
                style={{
                  position: "absolute",
                  top: 0, left: 0,
                  width: "1080px",
                  height: "540px",
                  transformOrigin: "top left",
                  transform: "scale(var(--ticket-scale, 0.667))",
                  display: "flex",
                  flexDirection: "row",
                  background: "linear-gradient(135deg, #1a0a2e 0%, #0d0d1a 50%, #1a0a0d 100%)",
                  border: "1px solid rgba(139, 92, 246, 0.3)",
                  borderRadius: "24px",
                  overflow: "hidden",
                  fontFamily: "system-ui, sans-serif",
                }}
              >
                {/* Full-bleed background image */}
                {event.image_url && (
                  <>
                    <img
                      src={event.image_url}
                      alt=""
                      crossOrigin="anonymous"
                      style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center", display: "block" }}
                    />
                    {/* Dark overlay so text is always readable */}
                    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to right, rgba(10,10,15,0.82) 0%, rgba(10,10,15,0.72) 60%, rgba(10,10,15,0.88) 100%)" }} />
                  </>
                )}

                {/* Middle: Event Details */}
                <div style={{ position: "relative", flex: 1, padding: "40px 36px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                  {/* Brand */}
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: "linear-gradient(135deg, #8B5CF6, #F59E0B)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px", flexShrink: 0 }}>🎬</div>
                    <span style={{ color: "rgba(255,255,255,0.6)", fontWeight: "700", fontSize: "18px", letterSpacing: "2px", textTransform: "uppercase" }}>JNE Nightouts</span>
                  </div>

                  {/* Title */}
                  <div>
                    <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "16px", textTransform: "uppercase", letterSpacing: "2px", marginBottom: "8px" }}>
                      {event.type === "movie_night" ? "🎬 Movie Night" : "🎵 Music Event"}
                    </div>
                    <div style={{ color: "white", fontWeight: "800", fontSize: "32px", lineHeight: "1.15" }}>{event.title}</div>
                    {event.artist_or_movie && (
                      <div style={{ color: "rgba(167, 139, 250, 0.9)", fontSize: "20px", marginTop: "6px" }}>{event.artist_or_movie}</div>
                    )}
                  </div>

                  {/* Info Grid */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                    {[
                      { label: "Date", value: event.date ? format(new Date(event.date), "EEE, MMM d, yyyy") : "TBA" },
                      { label: "Time", value: event.date ? format(new Date(event.date), "h:mm a") : "TBA" },
                      { label: "Venue", value: event.venue, sub: event.venue_description },
                      { label: "City", value: event.city || "Various" },
                    ].map(({ label, value, sub }) => (
                      <div key={label}>
                        <div style={{ color: "rgba(255,255,255,0.35)", fontSize: "13px", textTransform: "uppercase", letterSpacing: "1.5px" }}>{label}</div>
                        <div style={{ color: "white", fontSize: "17px", fontWeight: "600", marginTop: "4px" }}>{value}</div>
                        {sub && (
                          <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "11px", marginTop: "2px", lineHeight: "1.2", fontWeight: "400" }}>
                            {sub}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Attendee, Tier & Price */}
                  <div style={{ borderTop: "1px dashed rgba(139, 92, 246, 0.4)", paddingTop: "20px", display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: "16px", alignItems: "flex-end" }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ color: "rgba(255,255,255,0.35)", fontSize: "12px", textTransform: "uppercase", letterSpacing: "1.5px" }}>Attendee</div>
                      <div style={{ color: "white", fontWeight: "700", fontSize: "20px", marginTop: "4px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{attendeeName}</div>
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ color: "rgba(255,255,255,0.35)", fontSize: "12px", textTransform: "uppercase", letterSpacing: "1.5px" }}>Ticket Type</div>
                      <div style={{ color: "#A78BFA", fontWeight: "700", fontSize: "20px", marginTop: "4px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{tier.label}</div>
                    </div>
                    <div style={{ color: "rgba(245, 158, 11, 0.95)", fontWeight: "800", fontSize: "26px", textAlign: "right" }}>
                      {tier.price?.toLocaleString()} {event.currency || "XAF"}
                    </div>
                  </div>
                </div>

                {/* Vertical tear line */}
                <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", padding: "0 2px" }}>
                  <div style={{ width: "22px", height: "22px", borderRadius: "50%", background: "#0a0a0f", flexShrink: 0, marginTop: "-11px" }} />
                  <div style={{ flex: 1, borderLeft: "3px dashed rgba(139, 92, 246, 0.35)", width: 0 }} />
                  <div style={{ width: "22px", height: "22px", borderRadius: "50%", background: "#0a0a0f", flexShrink: 0, marginBottom: "-11px" }} />
                </div>

                {/* Right: QR Code */}
                <div style={{ position: "relative", width: "200px", flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "14px", padding: "30px 28px" }}>
                  <div style={{ background: "white", padding: "12px", borderRadius: "12px" }}>
                    <QRCodeSVG
                      value={`${appParams.appBaseUrl || window.location.origin}/ScanTicket?id=${ticketId}`}
                      size={120}
                      level="H"
                    />
                  </div>
                  <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "13px", fontFamily: "monospace", letterSpacing: "1px", textAlign: "center", wordBreak: "break-all" }}>
                    {ticketId}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}