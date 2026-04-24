import { useState } from "react";
import { Headphones, ExternalLink, Armchair, Cookie, Coffee, Plus, Minus, Loader2, Ticket, Utensils, GlassWater } from "lucide-react";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export default function TicketTiers({ event, compact = false }) {
  const whatsappBase = event?.whatsapp_number?.replace(/[^0-9]/g, "") || "237681770020";
  const currency = event?.currency || "XAF";
  const dateStr = event?.date ? format(new Date(event.date), "EEE, MMM d") : "";

  // Dynamic Add-ons from DB
  const { data: dynamicAddons = [] } = useQuery({
    queryKey: ["shop_items_available"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('jne_shop_items')
        .select('*')
        .eq('available', true);
      if (error) throw error;
      return data.map(item => ({
        id: item.id,
        label: item.label,
        price: item.price,
        category: item.category
      }));
    }
  });

  const tiers = event?.ticket_tiers?.length
    ? event.ticket_tiers
    : event?.price
      ? [{ label: "Standard Ticket", price: event.price, description: "" }]
      : [];

  const [quantities, setQuantities] = useState(() =>
    Object.fromEntries(tiers.map((_, i) => [i, 0]))
  );
  const [addonQty, setAddonQty] = useState({});

  if (!tiers.length) return null;

  const setQty = (index, delta) => {
    setQuantities(prev => ({
      ...prev,
      [index]: Math.max(0, (prev[index] || 0) + delta),
    }));
  };

  const setAddon = (key, delta) => {
    setAddonQty(prev => ({ ...prev, [key]: Math.max(0, (prev[key] || 0) + delta) }));
  };

  const totalTickets = Object.values(quantities).reduce((s, q) => s + q, 0);
  const ticketPrice = tiers.reduce((s, tier, i) => s + (quantities[i] || 0) * (tier.price || 0), 0);

  const addonPrice = tiers.reduce((s, _, i) =>
    s + dynamicAddons.reduce((as, a) => as + (addonQty[`${i}_${a.id}`] || 0) * a.price, 0), 0);

  const totalPrice = ticketPrice + addonPrice;

  const buildWhatsAppMessage = () => {
    const ticketLines = tiers
      .map((tier, i) => {
        if (!(quantities[i] > 0)) return null;

        const included = [];
        if (tier.headphones_included) included.push("Headphones 🎧");
        if (tier.seat_included) included.push("Seat/Blanket 💺");
        if (tier.snack_included) included.push("Snack/Popcorn 🍿");
        if (tier.drink_included) included.push("Drink 🥤");

        let line = `• ${quantities[i]}x ${tier.label} @ ${(tier.price || 0).toLocaleString()} ${currency} = ${(quantities[i] * tier.price).toLocaleString()} ${currency}`;
        if (included.length > 0) {
          line += `\n  (Includes: ${included.join(", ")})`;
        }
        return line;
      })
      .filter(Boolean);

    const addonLines = tiers.flatMap((tier, i) => {
      if (!quantities[i]) return [];
      return dynamicAddons
        .filter(a => addonQty[`${i}_${a.id}`] > 0)
        .map(a => `  ↳ ${addonQty[`${i}_${a.id}`]}x ${a.label} (${tier.label}) = ${(addonQty[`${i}_${a.id}`] * a.price).toLocaleString()} ${currency}`);
    });

    const sections = [...ticketLines];
    if (addonLines.length) {
      sections.push("", "Extras:", ...addonLines);
    }

    return [
      `Hi! I'd like to book tickets for *${event?.title || "JNE Nightout"}*${dateStr ? ` on ${dateStr}` : ""}:`,
      "",
      ...sections,
      "",
      `*Total: ${totalPrice.toLocaleString()} ${currency}* (${totalTickets} ticket${totalTickets !== 1 ? "s" : ""})`,
      "",
      "Please let me know how to proceed. 🎟️",
    ].join("\n");
  };

  return (
    <div className="space-y-4">
      {/* Tier rows */}
      <div className={`grid grid-cols-1 ${compact ? "gap-3" : "sm:grid-cols-3 gap-4"}`}>
        {tiers.map((tier, i) => {
          const isHighlight = i === 1 && tiers.length > 1;
          const qty = quantities[i] || 0;

          return (
            <div
              key={i}
              className={`relative rounded-2xl p-5 flex flex-col gap-4 transition-all border ${isHighlight
                ? "bg-violet-600/15 border-violet-500/40 ring-1 ring-violet-500/30"
                : "bg-white/[0.03] border-white/[0.07] hover:border-white/10 hover:bg-white/[0.05]"
                }`}
            >
              <div>
                <h4 className={`font-bold text-base ${isHighlight ? "text-violet-200" : "text-white"}`}>
                  {tier.label}
                </h4>
                <p className={`text-2xl font-bold mt-1 ${isHighlight ? "text-white" : "text-white/90"}`}>
                  {tier.price?.toLocaleString()} {currency}
                </p>
                {tier.description && (
                  <p className="text-sm text-white/50 mt-1">{tier.description}</p>
                )}
              </div>

              {(tier.headphones_included || tier.seat_included || tier.snack_included || tier.drink_included) && (
                <div className="flex flex-wrap gap-x-4 gap-y-1.5 border-b border-white/5 pb-3 mb-1">
                  <p className="w-full text-[10px] text-white/30 uppercase font-bold tracking-widest mb-1">Included free with ticket:</p>
                  {tier.headphones_included && (
                    <div className="flex items-center gap-1.5 text-xs text-white/60 bg-white/5 px-2 py-1 rounded-md">
                      <Headphones className={`w-3.5 h-3.5 shrink-0 ${isHighlight ? "text-violet-300" : "text-violet-400"}`} />
                      Headphones
                    </div>
                  )}
                  {tier.seat_included && (
                    <div className="flex items-center gap-1.5 text-xs text-white/60 bg-white/5 px-2 py-1 rounded-md">
                      <Armchair className={`w-3.5 h-3.5 shrink-0 ${isHighlight ? "text-violet-300" : "text-sky-400"}`} />
                      Seat / Blanket
                    </div>
                  )}
                  {tier.snack_included && (
                    <div className="flex items-center gap-1.5 text-xs text-white/60 bg-white/5 px-2 py-1 rounded-md">
                      <Cookie className={`w-3.5 h-3.5 shrink-0 ${isHighlight ? "text-violet-300" : "text-orange-400"}`} />
                      Popcorn / Snack
                    </div>
                  )}
                  {tier.drink_included && (
                    <div className="flex items-center gap-1.5 text-xs text-white/60 bg-white/5 px-2 py-1 rounded-md">
                      <Coffee className={`w-3.5 h-3.5 shrink-0 ${isHighlight ? "text-violet-300" : "text-emerald-400"}`} />
                      Drink
                    </div>
                  )}
                </div>
              )}

              {/* Quantity selector */}
              <div className="flex items-center gap-3 mt-auto">
                <button
                  onClick={() => setQty(i, -1)}
                  disabled={qty === 0}
                  className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-all"
                >
                  <Minus className="w-3.5 h-3.5 text-white" />
                </button>
                <span className="text-white font-bold text-lg w-6 text-center">{qty}</span>
                <button
                  onClick={() => setQty(i, 1)}
                  className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all"
                >
                  <Plus className="w-3.5 h-3.5 text-white" />
                </button>
                {qty > 0 && (
                  <span className="text-white/50 text-sm ml-auto">
                    = {(qty * tier.price).toLocaleString()} {currency}
                  </span>
                )}
              </div>

              {/* Add-ons + Book button per tier */}
              {qty > 0 && dynamicAddons.length > 0 && (
                <div className="border-t border-white/10 pt-3 space-y-3">
                  <p className="text-xs font-semibold text-violet-400 uppercase tracking-wider">Add Paid Extras:</p>
                  {dynamicAddons.map(addon => {
                    const aqty = addonQty[`${i}_${addon.id}`] || 0;
                    const Icon = addon.category === "Food" ? Utensils : GlassWater;

                    return (
                      <div key={addon.id} className="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/5 group hover:border-violet-500/30 transition-colors">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-violet-500/10 flex items-center justify-center text-violet-500">
                            <Icon className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-white">{addon.label}</p>
                            <p className="text-[10px] text-white/40">{addon.price.toLocaleString()} {currency}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => setAddon(`${i}_${addon.id}`, -1)}
                            disabled={aqty === 0}
                            className="w-6 h-6 rounded-md bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-all"
                          >
                            <Minus className="w-3 h-3 text-white" />
                          </button>
                          <span className="text-white font-bold w-4 text-center text-xs">{aqty}</span>
                          <button
                            onClick={() => setAddon(`${i}_${addon.id}`, 1)}
                            className="w-6 h-6 rounded-md bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all"
                          >
                            <Plus className="w-3 h-3 text-white" />
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {/* Book button */}
                  <div className="pt-1">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white/40 text-xs">{qty} ticket{qty !== 1 ? "s" : ""}{(() => { const ap = dynamicAddons.reduce((s, a) => s + (addonQty[`${i}_${a.id}`] || 0) * a.price, 0); return ap > 0 ? ` + extras` : ""; })()}</span>
                      <span className="text-white font-bold text-sm">
                        {(qty * tier.price + dynamicAddons.reduce((s, a) => s + (addonQty[`${i}_${a.id}`] || 0) * a.price, 0)).toLocaleString()} {currency}
                      </span>
                    </div>
                    <a
                      href={`https://wa.me/${whatsappBase}?text=${encodeURIComponent(buildWhatsAppMessage())}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-all shadow-lg shadow-emerald-500/20"
                    >
                      Book on WhatsApp
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              )}
              {/* Fallback book button if no addons available */}
              {qty > 0 && dynamicAddons.length === 0 && (
                <div className="pt-3">
                  <a
                    href={`https://wa.me/${whatsappBase}?text=${encodeURIComponent(buildWhatsAppMessage())}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-all shadow-lg shadow-emerald-500/20"
                  >
                    Book on WhatsApp
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}