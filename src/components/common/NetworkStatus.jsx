import { useState, useEffect } from "react";
import { WifiOff, Zap } from "lucide-react";
import { isSlowNetwork } from "@/lib/supabase";

export default function NetworkStatus() {
  const [isOnline, setIsOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [is2G, setIs2G] = useState(() => isSlowNetwork());

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    const checkConn = () => {
      setIs2G(isSlowNetwork());
    };

    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (conn) {
      conn.addEventListener("change", checkConn);
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (conn) conn.removeEventListener("change", checkConn);
    };
  }, []);

  if (isOnline && !is2G) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#161622]/90 backdrop-blur-md border border-white/10 shadow-2xl text-xs font-medium text-white/80">
        {!isOnline ? (
          <>
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <WifiOff className="w-3.5 h-3.5 text-red-400" />
            <span>Offline mode • Showing cached events</span>
          </>
        ) : (
          <>
            <div className="w-2 h-2 rounded-full bg-amber-400" />
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Slow connection (2G) • Lightweight mode</span>
          </>
        )}
      </div>
    </div>
  );
}
