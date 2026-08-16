import { Link } from "react-router-dom";
import { Wrench, Volume2, Tv, Lightbulb, Zap, ArrowRight, ShieldCheck, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function RentalsPromoSection() {
  const highlights = [
    {
      icon: Volume2,
      title: "PA Sound & Audio",
      desc: "High-output active speakers, subwoofers, mixers & wireless microphones.",
    },
    {
      icon: Tv,
      title: "Screens & 4K Projectors",
      desc: "Giant outdoor cinema screens and laser projectors for sharp daytime/nighttime visuals.",
    },
    {
      icon: Lightbulb,
      title: "Stage Lighting & FX",
      desc: "Moving head beams, RGB stage ambient lighting, fog & smoke haze machines.",
    },
    {
      icon: Wrench,
      title: "Certified Installation Crew",
      desc: "Professional sound engineers & riggers for turnkey delivery, setup, and live operation.",
    },
  ];

  return (
    <section className="py-16 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-3xl bg-gradient-to-br from-violet-950/40 via-[#11111a] to-[#0a0a0f] border border-white/10 p-8 sm:p-12 overflow-hidden shadow-2xl">
          {/* Subtle background glow */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
            {/* Left Col: Info & CTA */}
            <div className="lg:col-span-6 space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/30 text-violet-300 text-xs font-semibold">
                <Wrench className="w-3.5 h-3.5" /> Turnkey Production & Staff
              </div>

              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-snug">
                Need Sound, Screens, or Installation Staff for Your Next Event?
              </h2>

              <p className="text-sm text-white/60 leading-relaxed">
                Rent industry-grade audiovisual equipment and hire certified sound engineers & setup crew for weddings, private parties, corporate events, and outdoor screenings.
              </p>

              <div className="flex flex-wrap gap-4 pt-2">
                <Link to="/rentals">
                  <Button className="bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs h-10 px-5 rounded-xl shadow-lg shadow-violet-950/50 flex items-center gap-2">
                    Rent Equipment & Crew <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
                <Link to="/rentals">
                  <Button variant="outline" className="bg-white/5 border-white/10 hover:bg-white/10 text-white text-xs h-10 px-4 rounded-xl">
                    View Pricing Catalog
                  </Button>
                </Link>
              </div>
            </div>

            {/* Right Col: Feature Cards */}
            <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {highlights.map((h, i) => {
                const Icon = h.icon;
                return (
                  <div
                    key={i}
                    className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/15 transition-all space-y-2"
                  >
                    <div className="w-8 h-8 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400 flex items-center justify-center">
                      <Icon className="w-4 h-4" />
                    </div>
                    <h3 className="font-semibold text-white text-sm">{h.title}</h3>
                    <p className="text-xs text-white/50 leading-relaxed">{h.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
