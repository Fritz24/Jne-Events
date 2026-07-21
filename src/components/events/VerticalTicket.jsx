import { useRef, useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import html2canvas from "html2canvas";
import { Download } from "lucide-react";
import { useLocalized } from "@/lib/LanguageContext";
import { formatLocalizedDate } from "@/lib/localize";

export default function VerticalTicket({ booking, event, attendeeName, tierLabel, ticketId, showActions = false, showDone = true, onDone }) {
  const ticketRef = useRef(null);
  const wrapperRef = useRef(null);
  const actionsRef = useRef(null);
  const [downloading, setDownloading] = useState(false);
  const { t, lang } = useLocalized();

  useEffect(() => {
    if (showActions) {
      const timer = setTimeout(() => {
        actionsRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [showActions]);

  useEffect(() => {
    const handleResize = () => {
      if (!wrapperRef.current || !ticketRef.current) return;
      const parentWidth = wrapperRef.current.offsetWidth;
      const nativeWidth = 340;
      const nativeHeight = 640;
      const scale = Math.min(parentWidth / nativeWidth, 1.2);
      ticketRef.current.style.transform = `scale(${scale})`;
      ticketRef.current.style.transformOrigin = "top center";
      wrapperRef.current.style.height = `${Math.ceil(nativeHeight * scale)}px`;
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    const timer = setTimeout(handleResize, 100);
    return () => {
      window.removeEventListener("resize", handleResize);
      clearTimeout(timer);
    };
  }, [attendeeName, tierLabel, ticketId]);

  const downloadTicket = async () => {
    if (!ticketRef.current || downloading) return;
    setDownloading(true);
    const renderContainer = document.createElement("div");
    renderContainer.style.position = "absolute";
    renderContainer.style.left = "-9999px";
    renderContainer.style.top = "-9999px";
    renderContainer.style.width = "340px";
    renderContainer.style.height = "640px";
    renderContainer.style.overflow = "hidden";
    document.body.appendChild(renderContainer);
    const clone = ticketRef.current.cloneNode(true);
    clone.style.transform = "none";
    clone.style.transformOrigin = "initial";
    clone.style.width = "340px";
    clone.style.height = "640px";
    clone.style.position = "relative";
    clone.style.margin = "0";
    clone.style.boxShadow = "none";
    renderContainer.appendChild(clone);
    await new Promise(r => setTimeout(r, 400));
    try {
      const canvas = await html2canvas(clone, {
        scale: 3,
        useCORS: true,
        backgroundColor: "#0d0d14",
        logging: false,
        width: 340,
        height: 640,
        scrollX: 0,
        scrollY: 0,
        windowWidth: 340,
        windowHeight: 640,
      });
      const dataUrl = canvas.toDataURL("image/png");
      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF({ orientation: "portrait", unit: "px", format: [340, 640] });
      pdf.addImage(dataUrl, "PNG", 0, 0, 340, 640, undefined, "FAST");
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      if (isMobile) {
        const blob = pdf.output("blob");
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = `JNE-Ticket-${ticketId || "ticket"}.pdf`;
        a.target = "_blank";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => { window.location.href = blobUrl; }, 150);
      } else {
        pdf.save(`JNE-Ticket-${ticketId || "ticket"}.pdf`);
      }
    } catch (err) {
      console.error("Failed to download PDF ticket", err);
    } finally {
      document.body.removeChild(renderContainer);
      setDownloading(false);
    }
  };

  const eventDate = event?.date ? new Date(event.date) : null;
  const dateStr = eventDate ? formatLocalizedDate(event.date, "EEE, MMM d yyyy", lang) : "TBA";
  const timeStr = eventDate ? formatLocalizedDate(event.date, "HH:mm", lang) : "TBA";
  const displayAttendee = attendeeName || booking?.attendee_name || "Guest";
  const displayTier = tierLabel || booking?.tier_label || "Standard";
  const displayId = ticketId || booking?.ticket_id || "JNE-PREVIEW-TICKET";

  // Film strip holes — decorative perforations along left edge
  const filmHoles = Array.from({ length: 10 });

  return (
    <div className="flex flex-col items-center w-full max-w-[340px] mx-auto animate-in fade-in zoom-in-95 duration-300">
      <div ref={wrapperRef} className="w-full relative flex justify-center" style={{ minHeight: "300px" }}>
        {/* Native 340x640 ticket */}
        <div
          ref={ticketRef}
          className="relative w-[340px] h-[640px] select-none shrink-0 overflow-hidden"
          style={{
            background: "linear-gradient(160deg, #0d0d18 0%, #0a0a12 100%)",
            boxShadow: "0 32px 64px rgba(0,0,0,0.7), 0 0 0 1px rgba(212,175,55,0.15)",
            borderRadius: "20px",
          }}
        >
          {/* === FILM STRIP PERFORATIONS (left edge) === */}
          <div className="absolute left-0 top-0 bottom-0 w-[22px] flex flex-col justify-around items-center z-30 py-3" style={{ background: "rgba(0,0,0,0.4)" }}>
            {filmHoles.map((_, i) => (
              <div
                key={i}
                className="w-[10px] h-[7px] rounded-sm"
                style={{ background: "#0a0a12", border: "1px solid rgba(212,175,55,0.2)" }}
              />
            ))}
          </div>

          {/* Gold left border accent */}
          <div className="absolute left-[22px] top-0 bottom-0 w-px" style={{ background: "linear-gradient(to bottom, rgba(212,175,55,0.5), rgba(212,175,55,0.1), rgba(212,175,55,0.5))" }} />

          {/* === TOP: Event Poster Section === */}
          <div className="absolute left-[23px] right-0 top-0 h-[230px] overflow-hidden">
            {event?.image_url ? (
              <img
                src={event.image_url}
                alt=""
                crossOrigin="anonymous"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full" style={{ background: "linear-gradient(135deg, #1a0a2e 0%, #2d1b00 50%, #0a0a12 100%)" }} />
            )}
            {/* Gradient fade into body */}
            <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(13,13,24,0.6) 70%, rgba(13,13,24,1) 100%)" }} />

            {/* ADMIT ONE badge */}
            <div
              className="absolute top-3 right-3 px-2.5 py-1 text-[9px] font-black tracking-[0.2em] uppercase"
              style={{
                background: "linear-gradient(135deg, #d4af37, #f5d96b, #b8940a)",
                color: "#0a0a12",
                borderRadius: "4px",
                letterSpacing: "0.2em",
              }}
            >
              ADMIT ONE
            </div>
          </div>

          {/* === MIDDLE: Title & Info Body === */}
          <div className="absolute left-[23px] right-0 top-[190px] px-5 pt-2 pb-0">
            {/* JNE branding tag */}
            <div className="flex items-center gap-1.5 mb-2">
              <div className="w-1 h-1 rounded-full" style={{ background: "#d4af37" }} />
              <span className="text-[8px] font-bold tracking-[0.25em] uppercase" style={{ color: "#d4af37" }}>
                JNE Events
              </span>
            </div>

            {/* Event Title */}
            <h2 className="text-white font-black text-[18px] leading-tight tracking-tight mb-3" style={{ textShadow: "0 2px 8px rgba(0,0,0,0.8)" }}>
              {event ? event.title : "Special Event"}
            </h2>

            {/* Tier Badge */}
            <div
              className="inline-flex items-center gap-1.5 px-3 py-1 mb-4 text-[10px] font-bold tracking-wider uppercase rounded-full"
              style={{ background: "rgba(212,175,55,0.12)", border: "1px solid rgba(212,175,55,0.3)", color: "#d4af37" }}
            >
              {displayTier}
            </div>

            {/* Info grid */}
            <div className="grid grid-cols-2 gap-x-3 gap-y-3 mb-3">
              <div>
                <p className="text-[8px] font-bold tracking-widest uppercase mb-0.5" style={{ color: "rgba(212,175,55,0.5)" }}>Date</p>
                <p className="text-white text-[11px] font-bold leading-tight">{dateStr}</p>
              </div>
              <div>
                <p className="text-[8px] font-bold tracking-widest uppercase mb-0.5" style={{ color: "rgba(212,175,55,0.5)" }}>Time</p>
                <p className="text-white text-[11px] font-bold">{timeStr}</p>
              </div>
              <div className="col-span-2">
                <p className="text-[8px] font-bold tracking-widest uppercase mb-0.5" style={{ color: "rgba(212,175,55,0.5)" }}>Venue</p>
                <p className="text-white text-[11px] font-bold leading-tight">
                  {event?.venue || "TBA"}{event?.city ? `, ${event.city}` : ""}
                </p>
              </div>
            </div>

            {/* Attendee row */}
            <div
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(212,175,55,0.12)" }}
            >
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 font-black text-xs"
                style={{ background: "linear-gradient(135deg, #d4af37, #b8940a)", color: "#0a0a12" }}
              >
                {displayAttendee.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-[8px] font-bold tracking-widest uppercase" style={{ color: "rgba(212,175,55,0.5)" }}>Attendee</p>
                <p className="text-white text-[11px] font-bold mt-0.5">{displayAttendee}</p>
              </div>
            </div>
          </div>

          {/* === TEAR LINE === */}
          <div className="absolute left-[23px] right-0 flex items-center" style={{ top: "440px" }}>
            {/* Left notch bite */}
            <div className="absolute left-[-10px] w-[20px] h-[20px] rounded-full z-20" style={{ background: "#0a0a12", border: "1px solid rgba(212,175,55,0.2)" }} />
            {/* Dashed gold line */}
            <div className="w-full mx-2" style={{ borderTop: "1.5px dashed rgba(212,175,55,0.25)" }} />
            {/* Right notch bite */}
            <div className="absolute right-[-10px] w-[20px] h-[20px] rounded-full z-20" style={{ background: "#0a0a12", border: "1px solid rgba(212,175,55,0.2)" }} />
          </div>

          {/* === BOTTOM STUB: QR + Ticket ID === */}
          <div className="absolute left-[23px] right-0 flex items-center justify-between px-5" style={{ top: "452px", bottom: "0" }}>
            <div className="flex-1 pr-3 min-w-0">
              <p className="text-[8px] font-bold tracking-widest uppercase mb-1.5" style={{ color: "rgba(212,175,55,0.5)" }}>Ticket ID</p>
              <p className="font-mono text-[9px] text-white/70 break-all leading-relaxed">{displayId}</p>

              {/* Mini barcode lines decorative */}
              <div className="flex gap-px mt-3">
                {[3,1,4,1,5,2,3,1,2,4,1,3,2,5,1,3,4].map((h, i) => (
                  <div
                    key={i}
                    style={{ width: "2px", height: `${h * 4}px`, background: i % 3 === 0 ? "rgba(212,175,55,0.6)" : "rgba(255,255,255,0.2)", borderRadius: "1px" }}
                  />
                ))}
              </div>
            </div>

            {/* QR Code */}
            <div className="shrink-0 p-2 rounded-xl" style={{ background: "#ffffff" }}>
              <QRCodeSVG
                value={displayId}
                size={82}
                level="H"
                includeMargin={false}
                fgColor="#0a0a12"
                bgColor="#ffffff"
              />
            </div>
          </div>

          {/* Gold bottom border accent */}
          <div className="absolute left-[23px] right-0 bottom-0 h-px" style={{ background: "linear-gradient(to right, rgba(212,175,55,0.5), rgba(212,175,55,0.1))" }} />
        </div>
      </div>

      {/* Action buttons */}
      {showActions && (
        <div ref={actionsRef} className="w-full flex flex-col gap-2.5 mt-6 z-10">
          <button
            onClick={downloadTicket}
            disabled={downloading}
            className="w-full py-3.5 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-70 text-[#0a0a12]"
            style={{ background: "linear-gradient(135deg, #d4af37, #f5d96b, #b8940a)", boxShadow: "0 8px 24px rgba(212,175,55,0.3)" }}
          >
            <Download className="w-4 h-4" />
            {downloading ? t.ticketSaving || "Saving..." : t.ticketSave || "Save Ticket"}
          </button>

          {showDone && onDone && (
            <button
              onClick={onDone}
              className="w-full py-3 rounded-2xl text-sm font-semibold text-white/60 hover:text-white transition-all bg-white/5 border border-white/10 hover:bg-white/10"
            >
              {t.ticketDone || "Done"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
