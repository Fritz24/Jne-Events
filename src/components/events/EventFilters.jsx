import { Film, Music, LayoutGrid } from "lucide-react";
import { useLang } from "@/lib/LanguageContext";

export default function EventFilters({ activeFilter, onFilterChange }) {
  const { t } = useLang();
  const filters = [
    { value: "all", label: t.allEvents, icon: LayoutGrid },
    { value: "movie_night", label: t.movieNights, icon: Film },
    { value: "music", label: t.music, icon: Music },
  ];
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1">
      {filters.map(f => (
        <button
          key={f.value}
          onClick={() => onFilterChange(f.value)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
            activeFilter === f.value
              ? "bg-violet-600 text-white shadow-lg shadow-violet-500/20"
              : "bg-white/5 text-white/50 hover:text-white hover:bg-white/10"
          }`}
        >
          <f.icon className="w-4 h-4" />
          {f.label}
        </button>
      ))}
    </div>
  );
}