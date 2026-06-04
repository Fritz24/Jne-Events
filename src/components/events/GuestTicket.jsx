import { useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import html2canvas from "html2canvas";
import { Download, Calendar, MapPin, Clock, CheckCircle2 } from "lucide-react";
import { useLocalized } from "@/lib/LanguageContext";

export default function GuestTicket({ booking, event, onDone }) {
  const ticketRef = useRef(null);
  const [downloading, setDownloading] = useState(false);
  const { t } = useLocalized();

  const downloadTicket = async () => {
    if (!ticketRef.current || downloading) return;
    setDownloading(true);
    try {
      const canvas = await html2canvas(ticketRef.current, {
        scale: 3,
        useCORS: true,
        backgroundColor: "#0a0a0f",
        logging: false,
      });
      const dataUrl = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `JNE-Ticket-${booking.ticket_id}.png`;
      a.click();
    } catch (err) {
      console.error("Failed to download ticket", err);
    } finally {
      setDownloading(false);
    }
  };

  if (!booking || !event) return null;

  const eventDate = event.date ? new Date(event.date) : null;
  const dateStr = eventDate ? eventDate.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "long" }) : "TBA";
  const timeStr = eventDate ? eventDate.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : "TBA";

  return (
    <div className="flex flex-col items-center w-full animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Success Badge */}
      <div className="flex items-center gap-2 mb-6 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20">
        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
        <span className="text-emerald-300 text-sm font-medium">{t.ticketReady}</span>
      </div>

      {/* Ticket */}
      <div
        ref={ticketRef}
        className="relative w-full max-w-[320px] rounded-[28px] overflow-visible"
        style={{
          background: "linear-gradient(160deg, #141418 0%, #0d0d11 60%, #0a0a0e 100%)",
          boxShadow: "0 32px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.07)",
        }}
      >
        {/* Top glow */}
        <div
          className="absolute -top-20 left-1/2 -translate-x-1/2 w-40 h-40 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(139,92,246,0.25) 0%, transparent 70%)" }}
        />

        {/* Header */}
        <div className="relative z-10 px-6 pt-7 pb-6 flex flex-col items-center text-center">
          {/* Brand pill */}
          <div
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full mb-5 text-[10px] font-bold tracking-[0.15em] uppercase"
            style={{ background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.3)", color: "#a78bfa" }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
            {t.ticketBrandLabel}
          </div>
          <h2 className="text-white font-bold text-lg leading-snug mb-1 tracking-tight">{event.title}</h2>
          <p className="text-white/40 text-xs font-medium">{booking.tier_label}</p>
        </div>

        {/* Divider with cutouts */}
        <div className="relative z-10 flex items-center gap-0">
          <div
            className="w-5 h-5 rounded-full shrink-0 -ml-2.5"
            style={{ background: "#06060a", border: "1px solid rgba(255,255,255,0.06)" }}
          />
          <div className="flex-1 border-t border-dashed border-white/10" />
          <div
            className="w-5 h-5 rounded-full shrink-0 -mr-2.5"
            style={{ background: "#06060a", border: "1px solid rgba(255,255,255,0.06)" }}
          />
        </div>

        {/* QR Section */}
        <div className="relative z-10 flex flex-col items-center py-7 px-6">
          <div
            className="p-4 rounded-2xl mb-4"
            style={{
              background: "#ffffff",
              boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
            }}
          >
            <QRCodeSVG
              value={booking.ticket_id}
              size={148}
              level="H"
              includeMargin={false}
              fgColor="#0a0a0f"
              bgColor="#ffffff"
            />
          </div>
          <p className="text-white/30 font-mono tracking-[0.18em] text-[10px] uppercase">{booking.ticket_id}</p>
        </div>

        {/* Divider with cutouts */}
        <div className="relative z-10 flex items-center gap-0">
          <div
            className="w-5 h-5 rounded-full shrink-0 -ml-2.5"
            style={{ background: "#06060a", border: "1px solid rgba(255,255,255,0.06)" }}
          />
          <div className="flex-1 border-t border-dashed border-white/10" />
          <div
            className="w-5 h-5 rounded-full shrink-0 -mr-2.5"
            style={{ background: "#06060a", border: "1px solid rgba(255,255,255,0.06)" }}
          />
        </div>

        {/* Event Details */}
        <div className="relative z-10 px-6 pt-5 pb-7">
          <div className="grid grid-cols-2 gap-x-4 gap-y-4 mb-4">
            <div>
              <div className="flex items-center gap-1 text-white/30 text-[9px] uppercase tracking-widest font-semibold mb-1">
                <Calendar className="w-2.5 h-2.5" /> {t.ticketDateLabel}
              </div>
              <p className="text-white text-sm font-semibold leading-tight">{dateStr}</p>
            </div>
            <div>
              <div className="flex items-center gap-1 text-white/30 text-[9px] uppercase tracking-widest font-semibold mb-1">
                <Clock className="w-2.5 h-2.5" /> {t.ticketTimeLabel}
              </div>
              <p className="text-white text-sm font-semibold">{timeStr}</p>
            </div>
            <div className="col-span-2">
              <div className="flex items-center gap-1 text-white/30 text-[9px] uppercase tracking-widest font-semibold mb-1">
                <MapPin className="w-2.5 h-2.5" /> {t.ticketVenueLabel}
              </div>
              <p className="text-white text-sm font-semibold truncate">{event.venue}{event.city ? `, ${event.city}` : ""}</p>
            </div>
          </div>

          {/* Attendee chip */}
          <div
            className="flex items-center gap-3 rounded-2xl px-4 py-3 mt-1"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
          >
            <div className="w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center shrink-0">
              <span className="text-violet-300 text-xs font-bold">
                {(booking.attendee_name || "G").charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-white/30 text-[9px] uppercase tracking-widest font-semibold">{t.ticketAttendeeLabel}</p>
              <p className="text-white text-sm font-bold truncate">{booking.attendee_name || "Guest"}</p>
            </div>
          </div>
        </div>

        {/* Bottom glow */}
        <div
          className="absolute -bottom-16 left-1/2 -translate-x-1/2 w-32 h-32 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(251,191,36,0.12) 0%, transparent 70%)" }}
        />
      </div>

      {/* Actions */}
      <div className="w-full max-w-[320px] flex flex-col gap-2.5 mt-6">
        <button
          onClick={downloadTicket}
          disabled={downloading}
          className="w-full py-4 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-70"
          style={{
            background: "linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)",
            boxShadow: "0 8px 24px rgba(109,40,217,0.35)",
            color: "#fff",
          }}
        >
          <Download className="w-4 h-4" />
          {downloading ? t.ticketSaving : t.ticketSave}
        </button>
        <button
          onClick={onDone}
          className="w-full py-3.5 rounded-2xl text-sm font-medium text-white/60 hover:text-white transition-all"
          style={{ background: "rgba(255,255,255,0.05)" }}
        >
          {t.ticketDone}
        </button>
      </div>
    </div>
  );
}
