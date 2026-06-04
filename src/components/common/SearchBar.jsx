import * as React from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

export default function SearchBar({ className, value, onChange, onKeyDown, placeholder = "Search events" }) {
  return (
    <div
      className={cn(
        "flex h-9 items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 shadow-sm shadow-black/20 backdrop-blur-xl",
        "focus-within:border-violet-400/40 focus-within:ring-2 focus-within:ring-violet-500/20",
        className
      )}
    >
      <Search className="h-4 w-4 text-white/50" />
      <input
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-full w-full bg-transparent text-sm text-white/90 placeholder:text-white/40 outline-none"
      />
    </div>
  );
}
