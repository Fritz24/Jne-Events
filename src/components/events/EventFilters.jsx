import { Film, Music, LayoutGrid, Search, MapPin, Tag } from "lucide-react";
import { useLang } from "@/lib/LanguageContext";

export default function EventFilters({ filters, onFilterChange, genres, cities }) {
  const { t } = useLang();

  const handleTypeChange = (val) => onFilterChange(prev => ({ ...prev, type: val }));
  const handleGenreChange = (val) => onFilterChange(prev => ({ ...prev, genre: val }));
  const handleLocationChange = (val) => onFilterChange(prev => ({ ...prev, location: val }));
  const handleSearchChange = (val) => onFilterChange(prev => ({ ...prev, search: val }));

  const filterConfigs = [
    { value: "all", label: t.allEvents, icon: LayoutGrid },
    { value: "movie_night", label: t.movieNights, icon: Film },
    { value: "music", label: t.music, icon: Music },
  ];

  const selectClass = "bg-white/5 border border-white/10 rounded-lg text-sm text-white/70 px-3 py-2 outline-none focus:border-violet-500 transition-all cursor-pointer appearance-none min-w-[120px]";

  return (
    <div className="space-y-6 mb-8">
      {/* Top Row: Type Tabs & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {filterConfigs.map(f => (
            <button
              key={f.value}
              onClick={() => handleTypeChange(f.value)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${filters.type === f.value
                ? "bg-violet-600 text-white shadow-lg shadow-violet-500/20"
                : "bg-white/5 text-white/50 hover:text-white hover:bg-white/10"
                }`}
            >
              <f.icon className="w-4 h-4" />
              {f.label}
            </button>
          ))}
        </div>

        <div className="relative group min-w-[280px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 group-focus-within:text-violet-400 transition-colors" />
          <input
            type="text"
            placeholder={t.searchEvents || "Search events..."}
            value={filters.search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder:text-white/20 outline-none focus:border-violet-500/50 transition-all"
          />
        </div>
      </div>

      {/* Bottom Row: Genre & Location Dropdowns (Only if multiple options exist) */}
      <div className="flex flex-wrap items-center gap-4 pt-1">
        {(genres.length > 1) && (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-white/30 uppercase tracking-wider">
              <Tag className="w-3 h-3" />
              Genre
            </div>
            <div className="relative">
              <select
                value={filters.genre}
                onChange={(e) => handleGenreChange(e.target.value)}
                className={selectClass}
              >
                {genres.map(g => (
                  <option key={g} value={g} className="bg-[#0a0a0f] text-white">
                    {g === "all" ? t.allGenres || "All Genres" : g}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {(cities.length > 1) && (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-white/30 uppercase tracking-wider">
              <MapPin className="w-3 h-3" />
              City
            </div>
            <div className="relative">
              <select
                value={filters.location}
                onChange={(e) => handleLocationChange(e.target.value)}
                className={selectClass}
              >
                {cities.map(city => (
                  <option key={city} value={city} className="bg-[#0a0a0f] text-white">
                    {city === "all" ? t.allCities || "All Cities" : city}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}