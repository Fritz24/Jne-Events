import { useState, useRef, useEffect } from "react";
import { format } from "date-fns";
import { X, Download, Share2, Ticket, CheckCircle, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import html2canvas from "html2canvas";
import { supabase } from "@/lib/supabase";
import { QRCodeSVG } from "qrcode.react";
import { appParams } from "@/lib/app-params";
import { isSoldOut, remainingSlots, tierSlotCount } from "@/utils/ticketCount";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export default function TicketGenerator({ event, events = [], onClose, onSaved }) {
  const queryClient = useQueryClient();
  const ticketRef = useRef(null);
  const wrapperRef = useRef(null);

  // If event is not provided directly, select from events list
  const [selectedEventId, setSelectedEventId] = useState(event?.id || events[0]?.id || "");
  const currentEvent = event || events.find(e => e.id === selectedEventId) || events[0] || {};

  const [attendeeName, setAttendeeName] = useState("Guest");
  const [attendeePhone, setAttendeePhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("MANUAL_CASH");
  const [copiedLink, setCopiedLink] = useState(false);

  const tiers = currentEvent.ticket_tiers?.length
    ? currentEvent.ticket_tiers
    : [{ label: "Standard", price: currentEvent.price || 0 }];
  const [selectedTier, setSelectedTier] = useState(tiers[0]?.label || "Standard");
  const [downloading, setDownloading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  // Sync tier when currentEvent changes
  useEffect(() => {
    if (tiers.length > 0 && !tiers.some(t => t.label === selectedTier)) {
      setSelectedTier(tiers[0].label);
    }
  }, [currentEvent.id]);

  const tier = tiers.find(t => t.label === selectedTier) || tiers[0] || { label: "Standard", price: 0 };
  const [ticketId] = useState(() => `JNE-${currentEvent.id?.slice(-5).toUpperCase() || "00001"}-${Date.now().toString(36).toUpperCase().slice(-4)}`);

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

  const eventBookings = allBookings.filter(b => b.event_id === currentEvent.id);
  const soldOut = isSoldOut(eventBookings, currentEvent.capacity || 50);
  const remaining = remainingSlots(eventBookings, currentEvent.capacity || 50);
  const slotsNeeded = tierSlotCount(tier.label);

  // ─── Download: temporarily show ticket at native size, capture, restore ───
  const captureTicket = async () => {
    const el = ticketRef.current;
    if (!el) return null;

    // Save current styles
    const savedTransform = el.style.transform;
    const savedOverflow = el.style.overflow;

    // Temporarily make it full native size with no clipping
    el.style.transform = "none";
    el.style.overflow = "visible";

    // Wait for the browser to FULLY reflow + repaint at the new size
    await new Promise(r => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setTimeout(r, 400);
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

  const handleDownload = async (e) => {
    e?.preventDefault();
    e?.stopPropagation();
    setDownloading(true);
    try {
      const canvas = await captureTicket();
      if (!canvas) return;
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.download = `JNE-Ticket-${(currentEvent.title || "ticket").replace(/\s+/g, "-")}.png`;
        link.href = url;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 2000);
      }, "image/png");
    } catch (err) {
      console.error("Download failed:", err);
    } finally {
      setDownloading(false);
    }
  };

  const handleCopyLink = (e) => {
    e?.preventDefault();
    e?.stopPropagation();
    const cleanPhone = attendeePhone.replace(/\D/g, "");
    const ticketUrl = cleanPhone 
      ? `${window.location.origin}/tickets?phone=${cleanPhone}` 
      : `${window.location.origin}/scanticket?id=${ticketId}`;
    navigator.clipboard.writeText(ticketUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleShare = async (e) => {
    e?.preventDefault();
    e?.stopPropagation();
    const timeStr = currentEvent.date ? format(new Date(currentEvent.date), "h:mm a") : "";
    const cleanPhone = attendeePhone.replace(/\D/g, "");
    const ticketUrl = cleanPhone 
      ? `${window.location.origin}/tickets?phone=${cleanPhone}` 
      : `${window.location.origin}/scanticket?id=${ticketId}`;
    const message = `Hi ${attendeeName}! Here is your confirmed ticket for ${currentEvent.title} on ${currentEvent.date ? format(new Date(currentEvent.date), "EEE, MMM d") : "TBA"}${timeStr ? ` at ${timeStr}` : ""}. Tier: ${tier.label}. Ticket ID: ${ticketId}. View ticket: ${ticketUrl} 🎟️`;

    try {
      const canvas = await captureTicket();
      if (canvas && navigator.share && navigator.canShare) {
        canvas.toBlob(async (blob) => {
          try {
            const file = new File([blob], "ticket.png", { type: "image/png" });
            if (navigator.canShare({ files: [file] })) {
              await navigator.share({ files: [file], title: `JNE Nightouts – ${currentEvent.title}`, text: message });
              return;
            }
          } catch (shareErr) {
            console.log("File share skipped, falling back to text/link", shareErr);
          }
          // Fallback to text share
          window.open(`https://wa.me/${cleanPhone || (currentEvent.whatsapp_number || "").replace(/\D/g, "")}?text=${encodeURIComponent(message)}`, "_blank");
        });
      } else {
        window.open(`https://wa.me/${cleanPhone || (currentEvent.whatsapp_number || "").replace(/\D/g, "")}?text=${encodeURIComponent(message)}`, "_blank");
      }
    } catch (err) {
      console.error("Share error:", err);
      window.open(`https://wa.me/${cleanPhone || (currentEvent.whatsapp_number || "").replace(/\D/g, "")}?text=${encodeURIComponent(message)}`, "_blank");
    }
  };

  const handleSaveBooking = async (e) => {
    e?.preventDefault();
    e?.stopPropagation();
    setSaving(true);
    const cleanPhone = attendeePhone.replace(/\D/g, "");
    const { error } = await supabase
      .from('jne_bookings')
      .insert([{
        ticket_id: ticketId,
        event_id: currentEvent.id,
        event_title: currentEvent.title,
        attendee_name: attendeeName.trim() || "Guest",
        phone: cleanPhone || null,
        payment_method: paymentMethod,
        tier_label: tier.label,
        tier_price: tier.price || 0,
        currency: currentEvent.currency || "XAF",
        status: "confirmed",
        failure_reason: null,
      }]);

    if (error) {
      console.error("Booking save failed:", error);
      alert("Failed to save booking: " + error.message);
    } else {
      setSaved(true);
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.invalidateQueries({ queryKey: ["booking-stats"] });
      if (onSaved) onSaved();
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
    <div 
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-[#111118] border border-white/10 rounded-2xl w-full max-w-4xl overflow-hidden max-h-[95vh] overflow-y-auto shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <div className="flex items-center gap-2 text-white font-semibold">
            <Ticket className="w-5 h-5 text-violet-400" />
            <span>Manual Ticket Generator</span>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="text-white/40 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/5"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Controls grid */}
        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 border-b border-white/10">
          {/* Event selector if events array provided */}
          {events.length > 1 && (
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-white/60 text-xs font-semibold uppercase tracking-wider">Event</Label>
              <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue placeholder="Select Event" />
                </SelectTrigger>
                <SelectContent className="bg-[#14141c] border-white/10 text-white">
                  {events.map(ev => (
                    <SelectItem key={ev.id} value={ev.id}>
                      {ev.title} ({ev.date ? format(new Date(ev.date), "MMM d") : "TBA"})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-white/60 text-xs font-semibold uppercase tracking-wider">Attendee Name</Label>
            <Input
              value={attendeeName}
              onChange={e => { setAttendeeName(e.target.value); setSaved(false); }}
              placeholder="e.g. Massene Noelle"
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-white/60 text-xs font-semibold uppercase tracking-wider">Phone Number</Label>
            <Input
              value={attendeePhone}
              onChange={e => { setAttendeePhone(e.target.value); setSaved(false); }}
              placeholder="6XX XXX XXX"
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-white/60 text-xs font-semibold uppercase tracking-wider">Ticket Tier</Label>
            <Select value={selectedTier} onValueChange={v => { setSelectedTier(v); setSaved(false); }}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#14141c] border-white/10 text-white">
                {tiers.map(t => (
                  <SelectItem key={t.label} value={t.label}>
                    {t.label} — {t.price?.toLocaleString()} {currentEvent.currency || "XAF"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-white/60 text-xs font-semibold uppercase tracking-wider">Payment Method</Label>
            <Select value={paymentMethod} onValueChange={v => { setPaymentMethod(v); setSaved(false); }}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#14141c] border-white/10 text-white">
                <SelectItem value="MANUAL_CASH">Manual (Cash)</SelectItem>
                <SelectItem value="CM_ORANGE">Orange Money (Verified)</SelectItem>
                <SelectItem value="CM_MTNMOMO">MTN MoMo (Verified)</SelectItem>
                <SelectItem value="COMPLIMENTARY">Complimentary / Free</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Action Buttons Row */}
        <div className="px-5 py-3.5 bg-white/[0.02] border-b border-white/10 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {(soldOut || slotsNeeded > remaining) && !saved ? (
              <span className="px-3 py-1.5 rounded-lg bg-red-500/15 border border-red-500/30 text-red-300 text-xs font-medium">
                🎉 Sold Out ({remaining} slots left)
              </span>
            ) : (
              <span className="text-xs text-white/40">
                {remaining} slot{remaining !== 1 ? "s" : ""} left · uses {slotsNeeded}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              onClick={handleSaveBooking}
              disabled={saving || saved}
              className={saved ? "bg-emerald-600 text-white" : "bg-violet-600 hover:bg-violet-500 text-white"}
            >
              <CheckCircle className="w-4 h-4 mr-1.5" />
              {saved ? "Booking Saved & Confirmed!" : saving ? "Saving..." : "Confirm & Save Booking"}
            </Button>

            <Button 
              type="button"
              onClick={handleDownload} 
              disabled={downloading} 
              variant="outline" 
              className="border-white/10 text-white hover:bg-white/10"
            >
              <Download className="w-4 h-4 mr-1.5" />
              {downloading ? "Generating..." : "Download PNG"}
            </Button>

            <Button 
              type="button"
              onClick={handleCopyLink} 
              variant="outline" 
              className="border-white/10 text-white hover:bg-white/10"
            >
              {copiedLink ? <Check className="w-4 h-4 mr-1.5 text-emerald-400" /> : <Copy className="w-4 h-4 mr-1.5" />}
              {copiedLink ? "Link Copied!" : "Copy Link"}
            </Button>

            <Button 
              type="button"
              onClick={handleShare} 
              variant="outline" 
              className="border-white/10 text-white hover:bg-white/10"
            >
              <Share2 className="w-4 h-4 mr-1.5" />
              WhatsApp
            </Button>
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
              {currentEvent.image_url && (
                <>
                  <img
                    src={currentEvent.image_url}
                    alt=""
                    crossOrigin="anonymous"
                    style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center" }}
                  />
                  <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to right, rgba(10,10,15,0.95) 0%, rgba(10,10,15,0.85) 60%, rgba(10,10,15,0.95) 100%)" }} />
                </>
              )}

              {/* ─── Left: Event info ─── */}
              <div style={{ position: "relative", flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "24px 30px 22px", boxSizing: "border-box" }}>

                {/* Row 1: Brand */}
                <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
                  <div style={{ width: "34px", height: "34px", borderRadius: "9px", background: "linear-gradient(135deg, #8B5CF6, #F59E0B)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", flexShrink: 0 }}>🎬</div>
                  <span style={{ color: "rgba(255,255,255,0.8)", fontWeight: "700", fontSize: "14px", letterSpacing: "2px", textTransform: "uppercase" }}>JNE Nightouts</span>
                </div>

                {/* Row 2: Type + Title */}
                <div style={{ marginTop: "14px", flexShrink: 0 }}>
                  <div style={{ color: "rgba(255,255,255,0.6)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "2px", marginBottom: "4px" }}>
                    {(currentEvent.type === 'movie_night' || currentEvent.title?.toLowerCase().includes('movie')) ? "🎬 Movie Night" : (currentEvent.type === "music" ? "🎵 Music Event" : "✨ Special Event")}
                  </div>
                  <div style={{ color: "white", fontWeight: "800", fontSize: "26px", lineHeight: "1.15" }}>{currentEvent.title}</div>
                  {currentEvent.artist_or_movie && (
                    <div style={{ color: "rgba(167, 139, 250, 0.9)", fontSize: "15px", marginTop: "3px" }}>{currentEvent.artist_or_movie}</div>
                  )}
                </div>

                {/* Row 3: Info grid */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 16px", marginTop: "14px", alignContent: "start" }}>
                  {[
                    { label: "Date", value: currentEvent.date ? format(new Date(currentEvent.date), "EEE, MMM d, yyyy") : "TBA" },
                    { label: "Time", value: currentEvent.date ? format(new Date(currentEvent.date), "h:mm a") : "TBA" },
                    { label: "Venue", value: currentEvent.venue },
                    { label: "City", value: currentEvent.city || "Various" },
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
                    {tier.price?.toLocaleString()} {currentEvent.currency || "XAF"}
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