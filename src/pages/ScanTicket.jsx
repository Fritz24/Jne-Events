import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { CheckCircle, XCircle, AlertTriangle, Loader2, ShieldOff } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";

export default function ScanTicket() {
  const { user, isLoadingAuth, navigateToLogin } = useAuth();
  const [status, setStatus] = useState("loading"); // loading | auth | unauthorized | valid | already_used | invalid
  const [booking, setBooking] = useState(null);

  useEffect(() => {
    if (isLoadingAuth) return;

    if (!user) {
      navigateToLogin();
      return;
    }

    if (user.role !== "admin") {
      setStatus("unauthorized");
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const ticketId = params.get("id");
    if (!ticketId) { setStatus("invalid"); return; }
    verify(ticketId);
  }, [user, isLoadingAuth]);

  const verify = async (ticketId) => {
    setStatus("loading");
    let b = null;
    let hadFetchError = false;

    try {
      const { data: results, error: fetchError } = await supabase
        .from('jne_bookings')
        .select('*')
        .eq('ticket_id', ticketId);

      if (!fetchError && results && results.length > 0) {
        b = results[0];
      } else if (fetchError) {
        hadFetchError = true;
      }
    } catch (err) {
      console.warn("Scan online fetch error:", err);
      hadFetchError = true;
    }

    // 2G / Offline fallback: check cached admin bookings if online fetch had an issue
    if (!b) {
      try {
        const cachedRaw = localStorage.getItem("jne_cached_admin_bookings");
        if (cachedRaw) {
          const cached = JSON.parse(cachedRaw);
          b = cached.find((x) => x.ticket_id?.toLowerCase() === ticketId.toLowerCase() || x.id === ticketId);
        }
      } catch (e) {}
    }

    if (!b) {
      if (hadFetchError) {
        setStatus("connection_error");
      } else {
        setStatus("invalid");
      }
      return;
    }

    setBooking(b);

    if (b.status === "checked_in") {
      setStatus("already_used");
      return;
    }
    if (b.status === "cancelled") {
      setStatus("invalid");
      return;
    }

    // Mark as checked in locally in cache immediately
    try {
      const cachedRaw = localStorage.getItem("jne_cached_admin_bookings");
      if (cachedRaw) {
        const cached = JSON.parse(cachedRaw);
        const updated = cached.map((x) => (x.id === b.id ? { ...x, status: "checked_in" } : x));
        localStorage.setItem("jne_cached_admin_bookings", JSON.stringify(updated));
      }
    } catch (e) {}

    // Mark as checked in on Supabase in background
    supabase
      .from('jne_bookings')
      .update({ status: "checked_in" })
      .eq('id', b.id)
      .then(({ error: updateError }) => {
        if (updateError) {
          console.warn("Background check-in update error:", updateError);
        }
      })
      .catch((e) => console.warn("Background check-in caught:", e));

    setStatus("valid");
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center space-y-5">
        {(status === "loading" || isLoadingAuth) && (
          <>
            <Loader2 className="w-12 h-12 text-violet-400 animate-spin mx-auto" />
            <p className="text-white/60">Verifying ticket...</p>
          </>
        )}

        {status === "connection_error" && (
          <>
            <div className="w-16 h-16 rounded-full bg-amber-500/15 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8 text-amber-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Slow Connection</h2>
              <p className="text-white/50 mt-1 text-sm">Could not reach the server on this connection.</p>
            </div>
            <button
              onClick={() => {
                const params = new URLSearchParams(window.location.search);
                const tid = params.get("id");
                if (tid) verify(tid);
              }}
              className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs cursor-pointer shadow-lg shadow-amber-500/20"
            >
              Retry Scanning
            </button>
          </>
        )}

        {status === "unauthorized" && (
          <>
            <div className="w-16 h-16 rounded-full bg-red-500/15 flex items-center justify-center mx-auto">
              <ShieldOff className="w-8 h-8 text-red-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Access Denied</h2>
              <p className="text-white/50 mt-1 text-sm">Only admins can scan tickets.</p>
            </div>
          </>
        )}

        {status === "valid" && (
          <>
            <div className="w-16 h-16 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Valid Ticket ✓</h2>
              <p className="text-white/50 mt-1 text-sm">Welcome in!</p>
            </div>
            {booking && (
              <div className="rounded-xl bg-white/5 p-4 text-left space-y-2 text-sm">
                <Row label="Attendee" value={booking.attendee_name} />
                <Row label="Event" value={booking.event_title} />
                <Row label="Tier" value={booking.tier_label} />
                <Row label="Ticket ID" value={booking.ticket_id} mono />
              </div>
            )}
          </>
        )}

        {status === "already_used" && (
          <>
            <div className="w-16 h-16 rounded-full bg-yellow-500/15 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8 text-yellow-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Already Scanned</h2>
              <p className="text-white/50 mt-1 text-sm">This ticket has already been used for entry.</p>
            </div>
            {booking && (
              <div className="rounded-xl bg-white/5 p-4 text-left space-y-2 text-sm">
                <Row label="Attendee" value={booking.attendee_name} />
                <Row label="Event" value={booking.event_title} />
                <Row label="Ticket ID" value={booking.ticket_id} mono />
              </div>
            )}
          </>
        )}

        {status === "invalid" && (
          <>
            <div className="w-16 h-16 rounded-full bg-red-500/15 flex items-center justify-center mx-auto">
              <XCircle className="w-8 h-8 text-red-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Invalid Ticket</h2>
              <p className="text-white/50 mt-1 text-sm">This ticket was not found or has been cancelled.</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, mono = false }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-white/40">{label}</span>
      <span className={`text-white font-medium text-right ${mono ? "font-mono text-xs" : ""}`}>{value}</span>
    </div>
  );
}