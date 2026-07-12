import { useRef, useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import html2canvas from "html2canvas";
import { Download, Calendar, MapPin, Clock, ArrowLeft } from "lucide-react";
import { useLocalized } from "@/lib/LanguageContext";
import { formatLocalizedDate } from "@/lib/localize";

export default function VerticalTicket({ booking, event, attendeeName, tierLabel, ticketId, showActions = false, showDone = true, onDone }) {
  const ticketRef = useRef(null);
  const wrapperRef = useRef(null);
  const actionsRef = useRef(null);
  const [downloading, setDownloading] = useState(false);
  const { t, lang } = useLocalized();

  // Scroll to download buttons when ticket matches success stage
  useEffect(() => {
    if (showActions) {
      const timer = setTimeout(() => {
        actionsRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [showActions]);

  // Handle scaling to fit container width responsively
  useEffect(() => {
    const handleResize = () => {
      if (!wrapperRef.current || !ticketRef.current) return;
      const parentWidth = wrapperRef.current.offsetWidth;
      const nativeWidth = 340;
      const nativeHeight = 620;
      const scale = Math.min(parentWidth / nativeWidth, 1.2); // Cap scaling a bit for desktop
      
      ticketRef.current.style.transform = `scale(${scale})`;
      ticketRef.current.style.transformOrigin = "top center";
      wrapperRef.current.style.height = `${Math.ceil(nativeHeight * scale)}px`;
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    // Extra timeout to ensure parent elements have rendered/sized
    const timer = setTimeout(handleResize, 100);

    return () => {
      window.removeEventListener("resize", handleResize);
      clearTimeout(timer);
    };
  }, [attendeeName, tierLabel, ticketId]);

  const downloadTicket = async () => {
    if (!ticketRef.current || downloading) return;
    setDownloading(true);
    
    // Create an off-screen container for clean rendering (prevents mobile/scroll crop bugs)
    const renderContainer = document.createElement("div");
    renderContainer.style.position = "absolute";
    renderContainer.style.left = "-9999px";
    renderContainer.style.top = "-9999px";
    renderContainer.style.width = "340px";
    renderContainer.style.height = "620px";
    renderContainer.style.overflow = "hidden";
    document.body.appendChild(renderContainer);

    // Clone the ticket element
    const clone = ticketRef.current.cloneNode(true);
    clone.style.transform = "none";
    clone.style.transformOrigin = "initial";
    clone.style.width = "340px";
    clone.style.height = "620px";
    clone.style.position = "relative";
    clone.style.margin = "0";
    clone.style.boxShadow = "none"; // Remove shadow to prevent html2canvas canvas artifacts
    
    renderContainer.appendChild(clone);

    // Wait for the browser to ensure layout and image sources are populated
    await new Promise(r => setTimeout(r, 400));

    try {
      const canvas = await html2canvas(clone, {
        scale: 3, // Output a high-resolution canvas
        useCORS: true,
        backgroundColor: "#0a0a0f",
        logging: false,
        width: 340,
        height: 620,
        scrollX: 0,
        scrollY: 0,
        windowWidth: 340,
        windowHeight: 620,
      });

      const dataUrl = canvas.toDataURL("image/png");
      
      // Load jsPDF dynamically to keep initial load lightweight
      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "px",
        format: [340, 620]
      });

      pdf.addImage(dataUrl, "PNG", 0, 0, 340, 620, undefined, 'FAST');
      
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      if (isMobile) {
        const blob = pdf.output('blob');
        const blobUrl = URL.createObjectURL(blob);
        
        // Attempt download via anchor link
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = `JNE-Ticket-${ticketId || "ticket"}.pdf`;
        a.target = "_blank";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        // Strict webview fallback (Telegram, WhatsApp, Instagram in-app browsers):
        // redirect current window to display the PDF directly
        setTimeout(() => {
          window.location.href = blobUrl;
        }, 150);
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
  const dateStr = eventDate ? formatLocalizedDate(event.date, "EEEE, MMMM d, yyyy", lang) : "TBA";
  const timeStr = eventDate ? formatLocalizedDate(event.date, "HH:mm", lang) : "TBA";

  const displayAttendee = attendeeName || booking?.attendee_name || "Guest";
  const displayTier = tierLabel || booking?.tier_label || "Standard";
  const displayId = ticketId || booking?.ticket_id || "JNE-PREVIEW-TICKET";

  return (
    <div className="flex flex-col items-center w-full max-w-[340px] mx-auto animate-in fade-in zoom-in-95 duration-300">
      
      {/* Scaling Container Wrapper */}
      <div 
        ref={wrapperRef} 
        className="w-full relative flex justify-center rounded-[32px]"
        style={{ minHeight: "300px" }}
      >
        {/* Native Size Ticket (340px x 620px) - Relative layout prevents absolute coordinate screenshot bugs */}
        <div
          ref={ticketRef}
          className="relative w-[340px] h-[620px] rounded-[32px] overflow-hidden select-none shrink-0"
          style={{
            background: "linear-gradient(165deg, #161622 0%, #0e0e16 60%, #0a0a0f 100%)",
            boxShadow: "0 24px 48px rgba(0,0,0,0.6), inset 0 0 0 1px rgba(255,255,255,0.06)",
          }}
        >
          {/* Top Event Poster Backdrop with Gradient Mask */}
          <div className="relative w-full h-[220px] overflow-hidden">
            {event?.image_url ? (
              <img
                src={event.image_url}
                alt=""
                crossOrigin="anonymous"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-violet-900/50 via-zinc-900 to-amber-900/20" />
            )}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0e0e16]/80 to-[#0e0e16]" />
            
            {/* Overlay Branding & Title */}
            <div className="absolute inset-x-0 bottom-4 px-6">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-[9px] font-bold tracking-wider text-violet-400 uppercase mb-2">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                {t.ticketBrandLabel || "JNE Events"}
              </div>
              <h2 className="text-white font-extrabold text-xl leading-tight tracking-tight drop-shadow">
                {event ? event.title : "Special Event"}
              </h2>
            </div>
          </div>

          {/* Ticket Information Body */}
          <div className="px-6 pt-4 pb-3 flex flex-col justify-between h-[255px]">
            {/* Tier Type & Meta info */}
            <div>
              <p className="text-[10px] text-white/30 font-semibold tracking-wider uppercase mb-1">
                {t.ticketTypeLabel || "Ticket Type"}
              </p>
              <h3 className="text-lg font-bold text-violet-300 leading-tight">
                {displayTier}
              </h3>
            </div>

            {/* DateTime & Location details */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              <div>
                <p className="text-[9px] text-white/30 font-semibold tracking-wider uppercase mb-0.5">
                  {t.ticketDateLabel || "Date"}
                </p>
                <p className="text-white text-xs font-bold leading-normal">{dateStr}</p>
              </div>
              <div>
                <p className="text-[9px] text-white/30 font-semibold tracking-wider uppercase mb-0.5">
                  {t.ticketTimeLabel || "Time"}
                </p>
                <p className="text-white text-xs font-bold leading-normal">{timeStr}</p>
              </div>
              <div className="col-span-2">
                <p className="text-[9px] text-white/30 font-semibold tracking-wider uppercase mb-0.5">
                  {t.ticketVenueLabel || "Venue"}
                </p>
                <p className="text-white text-xs font-bold leading-normal">
                  {event?.venue || "TBA"}{event?.city ? `, ${event.city}` : ""}
                </p>
              </div>
            </div>

            {/* Attendee Name Display */}
            <div className="flex items-center gap-3 rounded-2xl bg-white/[0.03] border border-white/[0.05] p-3">
              <div className="w-8 h-8 rounded-full bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
                <span className="text-violet-300 text-xs font-bold">
                  {(displayAttendee).charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-[9px] text-white/30 font-semibold tracking-wider uppercase">
                  {t.ticketAttendeeLabel || "Attendee"}
                </p>
                <p className="text-white text-xs font-bold leading-normal mt-0.5">
                  {displayAttendee}
                </p>
              </div>
            </div>
          </div>

          {/* Cohesive Tear-off Separator Line (with round notch bites on left/right edges) */}
          <div className="relative flex items-center h-5 select-none pointer-events-none">
            {/* Left circular bite */}
            <div className="absolute left-[-10px] w-5 h-5 rounded-full bg-[#0a0a0f] border border-white/[0.06] shadow-inner shrink-0 z-20" />
            
            {/* Dashed line */}
            <div className="w-full border-t border-dashed border-white/10 mx-3 z-10" />
            
            {/* Right circular bite */}
            <div className="absolute right-[-10px] w-5 h-5 rounded-full bg-[#0a0a0f] border border-white/[0.06] shadow-inner shrink-0 z-20" />
          </div>

          {/* Bottom QR Code Stub */}
          <div className="h-[120px] flex items-center justify-between px-6 pb-2">
            <div className="min-w-0 pr-4">
              <p className="text-[9px] text-white/30 font-semibold tracking-wider uppercase mb-1">
                {t.ticketIdLabel || "Ticket ID"}
              </p>
              <p className="text-white font-mono text-[10px] break-all leading-normal max-w-[140px]">
                {displayId}
              </p>
            </div>
            
            {/* QR Code */}
            <div className="p-2 bg-white rounded-xl shadow-lg shrink-0">
              <QRCodeSVG
                value={displayId}
                size={80}
                level="H"
                includeMargin={false}
                fgColor="#0a0a0f"
                bgColor="#ffffff"
              />
            </div>
          </div>
          
        </div>
      </div>

      {/* Action buttons (only rendered when success is confirmed) */}
      {showActions && (
        <div ref={actionsRef} className="w-full flex flex-col gap-2.5 mt-6 z-10">
          <button
            onClick={downloadTicket}
            disabled={downloading}
            className="w-full py-3.5 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-70 bg-gradient-to-r from-violet-600 to-violet-700 hover:from-violet-500 hover:to-violet-600 text-white shadow-lg shadow-violet-600/20"
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
