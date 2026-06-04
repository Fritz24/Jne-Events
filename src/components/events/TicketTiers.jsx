import { useState, useEffect, useRef } from "react";
import { Headphones, Armchair, Cookie, Coffee, Plus, Minus, Loader2, Utensils, GlassWater, Check, Phone, ArrowRight, X } from "lucide-react";
import { formatLocalizedDate, getLocalizedEventField } from "@/lib/localize";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { logAnalyticsEvent } from "../../utils/analytics";
import { requestPayment, checkTransactionStatus } from "@/lib/campay";
import { useLocalized } from "@/lib/LanguageContext";
import GuestTicket from "./GuestTicket";

export default function TicketTiers({ event, compact = false, showMobileMoney = false }) {
  const { t, lang } = useLocalized();
  const eventTitle = getLocalizedEventField(event, "title", lang);
  const whatsappBase = event?.whatsapp_number?.replace(/[^0-9]/g, "") || "237681770020";
  const currency = event?.currency || "XAF";
  const dateStr = event?.date ? formatLocalizedDate(event.date, "EEE, MMM d", lang) : "";

  // Dynamic Add-ons from DB
  const { data: dynamicAddons = [] } = useQuery({
    queryKey: ["shop_items_available"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('jne_shop_items')
        .select('*')
        .eq('available', true);
      if (error) throw error;
      return data
        .filter(item => {
          if (!item.applicable_event_types || item.applicable_event_types.length === 0) return true;
          return item.applicable_event_types.includes(event?.type);
        })
        .map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          category: item.category
        }));
    }
  });

  const tiers = event?.ticket_tiers?.length
    ? event.ticket_tiers
    : event?.price
      ? [{ label: t.standardTicket, price: event.price, description: "" }]
      : [];

  const [quantities, setQuantities] = useState(() =>
    Object.fromEntries(tiers.map((_, i) => [i, 0]))
  );
  const [addonQty, setAddonQty] = useState({});

  // Mobile Money Payment State
  const [payingTier, setPayingTier] = useState(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [attendeeName, setAttendeeName] = useState("");
  const [payState, setPayState] = useState("idle"); // idle, processing, polling, success, error
  const [payError, setPayError] = useState("");
  const [finalTicket, setFinalTicket] = useState(null);
  const [finalBooking, setFinalBooking] = useState(null);
  const pollingIntervalRef = useRef(null);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    };
  }, []);

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

  // Process Mobile Money via Campay
  const handlePayment = async (tierIndex) => {
    if (!attendeeName.trim()) {
      setPayError(t.enterName || "Please enter the primary attendee's full name");
      return;
    }
    if (!phoneNumber.trim()) {
      setPayError(t.enterMobileMoney);
      return;
    }
    
    setPayError("");
    setPayState("processing");

    try {
      const qty = quantities[tierIndex];
      const tier = tiers[tierIndex];
      const tierPrice = qty * tier.price;
      const addonsPrice = dynamicAddons.reduce((s, a) => s + (addonQty[`${tierIndex}_${a.id}`] || 0) * a.price, 0);
      const totalAmount = tierPrice + addonsPrice;

      const { data: booking, error: dbError } = await supabase
        .from('jne_bookings')
        .insert([{
           event_id: event.id,
           event_title: event.title,
           tier_label: qty > 1 ? `${qty}x ${tier.label}` : tier.label,
           tier_price: totalAmount,
           attendee_name: attendeeName.trim(),
           status: "pending",
           ticket_id: `JNE-${Math.floor(Date.now() / 1000)}-${Math.floor(Math.random() * 1000)}`
        }])
        .select()
        .single();

      if (dbError) throw dbError;
      setFinalBooking(booking);

      const description = `${qty}x ${tier.label} - ${event.title}`;
      const paymentRes = await requestPayment(totalAmount, phoneNumber, description, booking.id);
      
      setPayState("polling");
      pollTransaction(paymentRes.reference, booking.id, booking.ticket_id);

    } catch (err) {
      console.error(err);
      setPayError(err.message || t.paymentError);
      setPayState("error");
    }
  };

  const pollTransaction = (reference, bookingId, ticketId) => {
    if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    let attempts = 0;
    pollingIntervalRef.current = setInterval(async () => {
      attempts++;
      try {
        const statusData = await checkTransactionStatus(reference);
        if (statusData.status === "SUCCESSFUL") {
          clearInterval(pollingIntervalRef.current);
          await supabase.from('jne_bookings').update({ status: 'confirmed' }).eq('id', bookingId);
          setFinalTicket(ticketId);
          setPayState("success");
          logAnalyticsEvent("ticket_purchased", event.id, event.title);
        } else if (statusData.status === "FAILED") {
          clearInterval(pollingIntervalRef.current);
          await supabase.from('jne_bookings').update({ status: 'failed' }).eq('id', bookingId);
          setPayError(t.transactionFailed);
          setPayState("error");
        }
      } catch (err) {
        console.error("Polling error:", err);
      }

      if (attempts >= 40) { // 2 mins max
         clearInterval(pollingIntervalRef.current);
         setPayError(t.transactionTimeout);
         setPayState("error");
      }
    }, 3000);
  };

  const handleCancelPayment = () => {
    if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    setPayState("idle");
    setPayError("");
  };

  const buildWhatsAppMessage = () => {
    const ticketLines = tiers
      .map((tier, i) => {
        if (!(quantities[i] > 0)) return null;

        const included = [];
        if (tier.headphones_included) included.push(`${t.headphones} 🎧`);
        if (tier.seat_included) included.push(`${t.seatBlanket} 💺`);
        if (tier.snack_included) included.push(`${t.popcornSnack} 🍿`);
        if (tier.drink_included) included.push(`${t.drink} 🥤`);

        if (tier.inclusions) {
          tier.inclusions.forEach(inc => {
            if (tier.headphones_included && inc === "Headphones") return;
            if (tier.seat_included && inc === "Seat / Blanket") return;
            if (tier.snack_included && inc === "Popcorn / Snack") return;
            if (tier.drink_included && inc === "Drink") return;
            included.push(`${inc} ✅`);
          });
        }

        let line = `• ${quantities[i]}x ${tier.label} @ ${(tier.price || 0).toLocaleString()} ${currency} = ${(quantities[i] * tier.price).toLocaleString()} ${currency}`;
        if (included.length > 0) {
          line += `\n  (${t.whatsappIncludes} ${included.join(", ")})`;
        }
        return line;
      })
      .filter(Boolean);

    const addonLines = tiers.flatMap((tier, i) => {
      if (!quantities[i]) return [];
      return dynamicAddons
        .filter(a => addonQty[`${i}_${a.id}`] > 0)
        .map(a => `  ↳ ${addonQty[`${i}_${a.id}`]}x ${a.name} (${tier.label}) = ${(addonQty[`${i}_${a.id}`] * a.price).toLocaleString()} ${currency}`);
    });

    const sections = [...ticketLines];
    if (addonLines.length) {
      sections.push("", t.whatsappExtras, ...addonLines);
    }

    const timeStr = event?.date ? formatLocalizedDate(event.date, "HH:mm", lang) : "";
    
    // If the admin defined a custom WhatsApp message for this event, use it as the intro!
    let introMessage = t.whatsappBookingIntro.replace("{title}", eventTitle || "JNE Nightout") + (dateStr ? t.whatsappBookingDate.replace("{date}", dateStr).replace("{time}", timeStr) : "") + ":";
    let outroMessage = t.whatsappBookingOutro;

    if (event?.whatsapp_message) {
      // We assume the custom message is the intro. If it contains "Please let me know", we can strip it or just use the whole thing.
      introMessage = event.whatsapp_message;
      outroMessage = ""; // Avoid duplicating the outro if it's already in their custom message
    }

    return [
      introMessage,
      "",
      ...sections,
      "",
      `*${t.whatsappTotal} ${totalPrice.toLocaleString()} ${currency}* (${totalTickets} ${totalTickets !== 1 ? t.tickets : t.ticket})`,
      outroMessage ? "" : null,
      outroMessage || null,
    ].filter(line => line !== null).join("\n");
  };

  const logClick = async () => {
    logAnalyticsEvent('whatsapp_click', event?.id, event?.title);
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

              {(tier.headphones_included || tier.seat_included || tier.snack_included || tier.drink_included || (tier.inclusions?.length > 0)) && (
                <div className="flex flex-wrap gap-x-4 gap-y-1.5 border-b border-white/5 pb-3 mb-1">
                  <p className="w-full text-[10px] text-white/30 uppercase font-bold tracking-widest mb-1">{t.includedFree}</p>
                  {tier.headphones_included && (
                    <div className="flex items-center gap-1.5 text-xs text-white/60 bg-white/5 px-2 py-1 rounded-md">
                      <Headphones className={`w-3.5 h-3.5 shrink-0 ${isHighlight ? "text-violet-300" : "text-violet-400"}`} />
                      {t.headphones}
                    </div>
                  )}
                  {tier.seat_included && (
                    <div className="flex items-center gap-1.5 text-xs text-white/60 bg-white/5 px-2 py-1 rounded-md">
                      <Armchair className={`w-3.5 h-3.5 shrink-0 ${isHighlight ? "text-violet-300" : "text-sky-400"}`} />
                      {t.seatBlanket}
                    </div>
                  )}
                  {tier.snack_included && (
                    <div className="flex items-center gap-1.5 text-xs text-white/60 bg-white/5 px-2 py-1 rounded-md">
                      <Cookie className={`w-3.5 h-3.5 shrink-0 ${isHighlight ? "text-violet-300" : "text-orange-400"}`} />
                      {t.popcornSnack}
                    </div>
                  )}
                  {tier.drink_included && (
                    <div className="flex items-center gap-1.5 text-xs text-white/60 bg-white/5 px-2 py-1 rounded-md">
                      <Coffee className={`w-3.5 h-3.5 shrink-0 ${isHighlight ? "text-violet-300" : "text-emerald-400"}`} />
                      Drink
                    </div>
                  )}
                  {(tier.inclusions || []).map((inc, incIdx) => {
                    if (tier.headphones_included && inc === "Headphones") return null;
                    if (tier.seat_included && inc === "Seat / Blanket") return null;
                    if (tier.snack_included && inc === "Popcorn / Snack") return null;
                    if (tier.drink_included && inc === "Drink") return null;
                    return (
                      <div key={incIdx} className="flex items-center gap-1.5 text-xs text-white/60 bg-white/5 px-2 py-1 rounded-md">
                        <Check className={`w-3.5 h-3.5 shrink-0 ${isHighlight ? "text-violet-300" : "text-violet-400"}`} />
                        {inc}
                      </div>
                    );
                  })}
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
                  <p className="text-xs font-semibold text-violet-400 uppercase tracking-wider">{t.addPaidExtras}</p>
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
                            <p className="text-sm font-medium text-white">{addon.name}</p>
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

                  </div>
                )}

                {/* Book / Payment buttons (always shows if qty > 0) */}
                {qty > 0 && (
                  <div className="pt-4 mt-4 border-t border-white/10">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-white/40 text-xs">{qty} {qty !== 1 ? t.tickets : t.ticket}{(() => { const ap = dynamicAddons.reduce((s, a) => s + (addonQty[`${i}_${a.id}`] || 0) * a.price, 0); return ap > 0 ? ` + ${t.extras}` : ""; })()}</span>
                      <span className="text-white font-bold text-sm">
                        {(qty * tier.price + dynamicAddons.reduce((s, a) => s + (addonQty[`${i}_${a.id}`] || 0) * a.price, 0)).toLocaleString()} {currency}
                      </span>
                    </div>

                    {payingTier === i ? (
                      <div className="space-y-4 pt-2 animate-in fade-in zoom-in-95 duration-200">
                        {payState === 'success' ? (
                          <GuestTicket 
                            booking={finalBooking} 
                            event={event} 
                            onDone={() => {
                              setPayingTier(null); 
                              setPayState("idle");
                              setAttendeeName("");
                              setPhoneNumber("");
                            }} 
                          />
                        ) : payState === 'polling' ? (
                          <div className="flex flex-col items-center justify-center py-6 text-center">
                            <Loader2 className="w-10 h-10 text-amber-400 animate-spin mb-4" />
                            <h4 className="text-white font-bold text-lg mb-2 tracking-tight">{t.checkYourPhone}</h4>
                            <p className="text-white/60 text-sm">{t.enterPin}</p>
                            {(() => {
                              const cleanPhone = phoneNumber.replace(/\D/g, '');
                              const isMTN = /^(67|650|651|652|653|654|68)/.test(cleanPhone);
                              const isOrange = /^(69|655|656|657|658|659)/.test(cleanPhone);
                              
                              if (isMTN) return <p className="text-amber-400/90 text-xs mt-4 bg-amber-500/10 border border-amber-500/20 py-2 px-3 rounded-lg">{t.noPopupMtn} <strong className="text-amber-400 text-sm tracking-wider">*126#</strong></p>;
                              if (isOrange) return <p className="text-amber-400/90 text-xs mt-4 bg-amber-500/10 border border-amber-500/20 py-2 px-3 rounded-lg">{t.noPopupOrange} <strong className="text-amber-400 text-sm tracking-wider">#150*50#</strong></p>;
                              return null;
                            })()}
                            
                            <button 
                              onClick={handleCancelPayment}
                              className="mt-8 flex items-center justify-center gap-2 px-6 py-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white text-sm font-medium transition-all group"
                            >
                              <X className="w-4 h-4 text-white/50 group-hover:text-white transition-colors" />
                              {t.cancelPayment}
                            </button>
                          </div>
                        ) : (
                          <>
                            {/* Name Input */}
                            <div className="flex flex-col mb-4">
                              <label className="text-xs font-semibold text-white/50 uppercase tracking-widest mb-2.5">
                                {t.ticketAttendeeName}
                              </label>
                              <input
                                type="text"
                                placeholder={t.ticketNamePlaceholder}
                                value={attendeeName}
                                onChange={(e) => setAttendeeName(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-white placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/40 transition-all font-medium"
                                disabled={payState === 'processing'}
                              />
                            </div>

                            {/* MoMo Input */}
                            <div className="flex items-center justify-between mb-2">
                              <label className="text-sm font-medium text-white/90 flex items-center gap-2">
                                <Phone className="w-4 h-4 text-amber-400" />
                                {t.mobileMoneyNumber}
                              </label>
                              {(() => {
                                const cleanPhone = phoneNumber.replace(/\D/g, '');
                                if (cleanPhone.length >= 2) {
                                  if (/^(67|650|651|652|653|654|68)/.test(cleanPhone)) {
                                    return <span className="text-[10px] font-bold bg-[#ffcc00] text-black px-2 py-0.5 rounded-sm shadow-sm animate-in fade-in slide-in-from-right-2">MTN MOMO</span>;
                                  }
                                  if (/^(69|655|656|657|658|659)/.test(cleanPhone)) {
                                    return <span className="text-[10px] font-bold bg-[#ff6600] text-white px-2 py-0.5 rounded-sm shadow-sm animate-in fade-in slide-in-from-right-2">ORANGE MONEY</span>;
                                  }
                                }
                                return null;
                              })()}
                            </div>
                            <input
                              type="tel"
                              placeholder="e.g. 670 00 00 00"
                              value={phoneNumber}
                              onChange={(e) => setPhoneNumber(e.target.value)}
                              className="w-full bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl px-4 py-3.5 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all font-medium"
                              disabled={payState === 'processing'}
                            />
                            {payError && <p className="text-red-400 text-xs font-medium leading-relaxed">{payError}</p>}
                            <div className="flex gap-3 mt-4">
                              <button
                                onClick={() => {setPayingTier(null); setPayState("idle"); setPayError("");}}
                                className="flex-1 py-3.5 rounded-xl bg-white/5 text-white/70 text-sm font-semibold hover:bg-white/10 hover:text-white transition-all border border-white/5"
                                disabled={payState === 'processing'}
                              >
                                {t.cancel}
                              </button>
                              <button
                                onClick={() => handlePayment(i)}
                                disabled={payState === 'processing' || !phoneNumber}
                                className="flex-[2] flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black text-sm font-bold transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50"
                              >
                                {payState === 'processing' ? <Loader2 className="w-5 h-5 animate-spin" /> : t.payNow}
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3">
                        {showMobileMoney && (
                        <button
                          onClick={() => setPayingTier(i)}
                          className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black text-sm font-bold transition-all shadow-lg shadow-amber-500/20"
                        >
                          {t.payWithMobileMoney}
                          <ArrowRight className="w-4 h-4" />
                        </button>
                        )}
                        <a
                          href={`https://wa.me/${whatsappBase}?text=${encodeURIComponent(buildWhatsAppMessage())}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={logClick}
                          className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 text-sm font-semibold transition-all"
                        >
                          {t.bookViaWhatsApp}
                        </a>
                      </div>
                    )}
                  </div>
                )}
            </div>
          );
        })}
      </div>
    </div>
  );
}