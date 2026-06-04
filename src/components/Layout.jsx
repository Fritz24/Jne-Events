import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { Film, Music, Calendar, Menu, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { useLang } from "@/lib/LanguageContext";
import { useAuth } from "@/lib/AuthContext";
import { LogOut, LayoutDashboard, LogIn } from "lucide-react";
import SearchBar from "./common/SearchBar";

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { lang, t, toggleLang } = useLang();
  const { user, signOut } = useAuth();
  const [navSearch, setNavSearch] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const searchValue = params.get("search") || params.get("q") || "";
    setNavSearch(searchValue);
  }, [location.search]);

  const submitNavSearch = () => {
    const q = navSearch.trim();
    if (!q) {
      navigate("/events");
      setMobileOpen(false);
      return;
    }
    navigate(`/events?search=${encodeURIComponent(q)}`);
    setMobileOpen(false);
  };

  const navLinks = [
    { to: "/home", label: t.home, icon: Calendar },
    { to: "/events", label: t.events, icon: Film },
    { to: "/calendar", label: t.calendar, icon: Calendar },
    { to: "/albums", label: t.memoriesNav, icon: Film },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <style>{`
        :root {
          --accent-violet: #8B5CF6;
          --accent-gold: #F59E0B;
          --surface-dark: #111118;
          --surface-card: rgba(255,255,255,0.04);
        }
      `}</style>

      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-[#0a0a0f]/80 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/Home" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-amber-500 flex items-center justify-center">
                <Music className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-semibold tracking-tight">JnE Events</span>
            </Link>

            <div className="hidden md:flex flex-1 justify-center px-6">
              <SearchBar
                className="w-full min-w-[220px] max-w-md"
                value={navSearch}
                onChange={(e) => setNavSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    submitNavSearch();
                  }
                }}
              />
            </div>

            <div className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    location.pathname === link.to
                      ? "bg-white/10 text-white"
                      : "text-white/60 hover:text-white hover:bg-white/5"
                  }`}
                >
                  {link.label}
                </Link>
              ))}

              <button
                onClick={toggleLang}
                className="ml-2 px-3 py-1.5 rounded-lg border border-white/10 text-xs font-bold text-white/70 hover:text-white hover:border-white/30 transition-all tracking-wider"
              >
                {lang === "en" ? "FR" : "EN"}
              </button>

              <div className="ml-4 h-6 w-px bg-white/10" />

              {user?.role === "admin" && (
                <div className="flex items-center gap-2 ml-4">
                  <Link
                    to="/admin"
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-400 hover:bg-amber-500/30 transition-all font-semibold text-xs"
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    {t.adminPanel}
                  </Link>
                </div>
              )}

              {user && (
                <div className="ml-4 flex items-center gap-2">
                  <button
                    onClick={signOut}
                    className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-all"
                    title={t.logout}
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              )}

              {!user && (
                <Link
                  to="/Login"
                  className="ml-4 flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-all"
                >
                  <LogIn className="w-4 h-4" />
                  {t.login || "Login"}
                </Link>
              )}
            </div>

            <div className="md:hidden flex items-center gap-2">
              <button
                onClick={toggleLang}
                className="px-2.5 py-1 rounded-lg border border-white/10 text-xs font-bold text-white/70 hover:text-white transition-all"
              >
                {lang === "en" ? "FR" : "EN"}
              </button>

              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/5"
              >
                {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div className="md:hidden pb-3 pt-2">
            <SearchBar
              className="w-full"
              value={navSearch}
              onChange={(e) => setNavSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  submitNavSearch();
                }
              }}
            />
          </div>
        </div>

        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="md:hidden overflow-hidden border-t border-white/5"
            >
              <div className="px-4 py-3 space-y-1">
                {navLinks.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      location.pathname === link.to
                        ? "bg-white/10 text-white"
                        : "text-white/60 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <link.icon className="w-4 h-4" />
                    {link.label}
                  </Link>
                ))}

                {user ? (
                  <>
                    {user.role === "admin" && (
                      <Link
                        to="/admin"
                        onClick={() => setMobileOpen(false)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white/60 hover:text-white"
                      >
                        <LayoutDashboard className="w-4 h-4" />
                        {t.dashboard}
                      </Link>
                    )}

                    <button
                      onClick={() => {
                        signOut();
                        setMobileOpen(false);
                      }}
                      className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:text-red-300"
                    >
                      <LogOut className="w-4 h-4" />
                      {t.logout}
                    </button>
                  </>
                ) : (
                  <Link
                    to="/login"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-violet-400 hover:text-violet-300"
                  >
                    <LogIn className="w-4 h-4" />
                    {t.login}
                  </Link>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      <main className="pt-16">
        <Outlet />
      </main>

      <footer className="border-t border-white/5 mt-20 bg-white/[0.01]">
        <DynamicFooter t={t} lang={lang} toggleLang={toggleLang} />
      </footer>
    </div>
  );
}

function DynamicFooter({ t, lang, toggleLang }) {
  const { data: events = [] } = useQuery({
    queryKey: ["events_footer"],
    queryFn: async () => {
      const { data } = await supabase.from("jne_events").select("city, type, status");
      return data || [];
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["event_categories_footer"],
    queryFn: async () => {
      const { data } = await supabase
        .from("jne_settings")
        .select("value")
        .eq("key", "event_categories")
        .maybeSingle();
      return data?.value ? JSON.parse(data.value) : [];
    },
  });

  const activeCities = useMemo(() => {
    const cities = [...new Set(events.filter((e) => e.city).map((e) => e.city))];
    return cities.sort();
  }, [events]);

  const activeTypes = useMemo(() => {
    const types = [...new Set(events.filter((e) => e.type).map((e) => e.type))];
    return categories.filter((c) => types.includes(c.id));
  }, [events, categories]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
        <div className="col-span-1 md:col-span-1">
          <div className="flex items-center gap-2.5 mb-6">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-amber-500 flex items-center justify-center">
              <Music className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-lg">JnE Events</span>
          </div>
          <p className="text-sm text-white/40 leading-relaxed">{t.footerTagline}</p>
        </div>

        <div>
          <h4 className="text-sm font-bold uppercase tracking-widest text-white/20 mb-6">{t.exploreCities}</h4>
          <ul className="space-y-3 text-sm">
            {activeCities.length > 0 ? (
              activeCities.map((city) => (
                <li key={city}>
                  <Link
                    to={`/events/city/${city.toLowerCase()}`}
                    className="text-white/50 hover:text-violet-400 transition-colors capitalize"
                  >
                    {t.eventsIn} {city}
                  </Link>
                </li>
              ))
            ) : (
              <li className="text-white/20 italic text-xs">{t.noActiveLocations}</li>
            )}
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-bold uppercase tracking-widest text-white/20 mb-6">{t.topActivities}</h4>
          <ul className="space-y-3 text-sm">
            {activeTypes.length > 0 ? (
              activeTypes.map((type) => (
                <li key={type.id}>
                  <Link
                    to={`/events/category/${type.id}`}
                    className="text-white/50 hover:text-violet-400 transition-colors"
                  >
                    {type.label}
                  </Link>
                </li>
              ))
            ) : (
              <li className="text-white/20 italic text-xs">{t.noActiveActivities}</li>
            )}
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-bold uppercase tracking-widest text-white/20 mb-6">{t.language}</h4>
          <button
            onClick={toggleLang}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/5 bg-white/[0.02] text-sm text-white/60 hover:text-white hover:bg-white/5 transition-all"
          >
            <span>{lang === "en" ? t.frenchVersion : t.englishVersion}</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-center justify-between pt-8 border-t border-white/5 gap-4">
        <p className="text-xs text-white/20">
          © {new Date().getFullYear()} JnE Events. {t.allRightsReserved}
        </p>
        <div className="flex gap-6 text-xs text-white/20">
          <Link to="/privacy" className="hover:text-white/40">
            {t.privacyPolicy}
          </Link>
          <Link to="/terms" className="hover:text-white/40">
            {t.termsOfService}
          </Link>
        </div>
      </div>
    </div>
  );
}
