import { AlertTriangle } from "lucide-react";
import { useLang } from "@/lib/LanguageContext";

export default function SoldOutBanner() {
  const { t } = useLang();
  return (
    <div className="flex items-center gap-3 px-5 py-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300">
      <AlertTriangle className="w-5 h-5 shrink-0 text-red-400" />
      <div>
        <span className="font-semibold">{t.soldOutTitle}</span>
        <span className="text-red-300/70 ml-2 text-sm">{t.soldOutDesc}</span>
      </div>
    </div>
  );
}