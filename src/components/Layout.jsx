import { Outlet, Link, useLocation } from "react-router-dom";
import { Film, Music, Calendar, Menu, X } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLang } from "@/lib/LanguageContext";
import { useAuth } from "@/lib/AuthContext";
import { LogOut, LayoutDashboard, LogIn } from "lucide-react";

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { lang, t, toggleLang } = useLang();
  const { user, signOut } = useAuth();

  const navLinks = [
    { to: "/Home", label: t.home, icon: Calendar },
    { to: "/Events", label: t.events, icon: Film },
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

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-[#0a0a0f]/80 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/Home" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-amber-500 flex items-center justify-center">
                <Music className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-semibold tracking-tight">JnE Events</span>
            </Link>

            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-1">
              {navLinks.map(link => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${location.pathname === link.to
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

              {user ? (
                <div className="flex items-center gap-2 ml-4">
                  <Link
                    to="/Admin"
                    className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-all"
                    title="Dashboard"
                  >
                    <LayoutDashboard className="w-4 h-4" />
                  </Link>
                  <button
                    onClick={signOut}
                    className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-all"
                    title="Logout"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <Link
                  to="/Login"
                  className="ml-4 flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-all"
                >
                  <LogIn className="w-4 h-4" />
                  {t.login || "Login"}
                </Link>
              )}
            </div>

            {/* Lang toggle (mobile) */}
            <button
              onClick={toggleLang}
              className="md:hidden px-2.5 py-1 rounded-lg border border-white/10 text-xs font-bold text-white/70 hover:text-white transition-all"
            >
              {lang === "en" ? "FR" : "EN"}
            </button>

            {/* Mobile toggle */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/5"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="md:hidden overflow-hidden border-t border-white/5"
            >
              <div className="px-4 py-3 space-y-1">
                {navLinks.map(link => (
                  <Link
                    key={link.to}
                    to={link.to}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${location.pathname === link.to
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
                    <Link
                      to="/Admin"
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white/60 hover:text-white"
                    >
                      <LayoutDashboard className="w-4 h-4" />
                      {t.dashboard}
                    </Link>
                    <button
                      onClick={() => { signOut(); setMobileOpen(false); }}
                      className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:text-red-300"
                    >
                      <LogOut className="w-4 h-4" />
                      {t.logout}
                    </button>
                  </>
                ) : (
                  <Link
                    to="/Login"
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

      {/* Main content */}
      <main className="pt-16">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-amber-500 flex items-center justify-center">
                <Music className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold">JnE Events</span>
            </div>
            <p className="text-sm text-white/40">
              © {new Date().getFullYear()} NightOut. {t.allRightsReserved}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}