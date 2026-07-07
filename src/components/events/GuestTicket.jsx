import { CheckCircle2 } from "lucide-react";
import { useLocalized } from "@/lib/LanguageContext";
import VerticalTicket from "./VerticalTicket";

export default function GuestTicket({ booking, event, onDone }) {
  const { t } = useLocalized();

  if (!booking || !event) return null;

  return (
    <div className="flex flex-col items-center w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Success Badge */}
      <div className="flex items-center gap-2 mb-6 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20">
        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
        <span className="text-emerald-300 text-sm font-medium">{t.ticketReady || "Ticket is ready!"}</span>
      </div>

      <VerticalTicket
        booking={booking}
        event={event}
        ticketId={booking.ticket_id}
        showActions={true}
        onDone={onDone}
      />
    </div>
  );
}
