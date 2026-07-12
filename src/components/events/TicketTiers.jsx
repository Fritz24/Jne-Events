import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Headphones, Armchair, Cookie, Coffee, Plus, Minus, Loader2, Utensils, GlassWater, Check, Phone, ArrowRight, X, ShoppingCart, ArrowLeft } from "lucide-react";
import { formatLocalizedDate, getLocalizedEventField } from "@/lib/localize";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { logAnalyticsEvent } from "../../utils/analytics";
import { initializePayment, makeDirectPayment, checkTransactionStatus } from "@/lib/payunit";
import { useLocalized } from "@/lib/LanguageContext";
import GuestTicket from "./GuestTicket";
import VerticalTicket from "./VerticalTicket";
import { useAuth } from "@/lib/AuthContext";
import { saveLocalTicket } from "@/lib/tickets";

export default function TicketTiers({ event, compact = false, showMobileMoney = false }) {
  const { t, lang } = useLocalized();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin" || showMobileMoney;
  const eventTitle = getLocalizedEventField(event, "title", lang);
  const whatsappBase = event?.whatsapp_number?.replace(/[^0-9]/g, "") || "237681770020";
  const currency = event?.currency || "XAF";
  const dateStr = event?.date ? formatLocalizedDate(event.date, "EEEE, MMMM d, yyyy · HH:mm", lang) : "";

  // Modal Open State & Steps
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState("select"); // "select", "billing", "polling", "success"

  // Payment Flow Setting
  const { data: paymentFlow = "redirect" } = useQuery({
    queryKey: ["payment_flow"],
    queryFn: async () => {
      const { data } = await supabase
        .from('jne_settings')
        .select('value')
        .eq('key', 'payment_flow')
        .maybeSingle();
      return data?.value || "redirect";
    }
  });

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
  const [phoneNumber, setPhoneNumber] = useState("");
  const [selectedGateway, setSelectedGateway] = useState(""); // "CM_MTNMOMO" | "CM_ORANGE"
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

  // Listen to returning transaction query parameters from Payunit hosted pages
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const txId = urlParams.get("transaction_id");
    const bkId = urlParams.get("booking_id");
    
    if (txId && bkId) {
      // Clean query parameters from URL to avoid re-triggering on page refresh
      const cleanUrl = new URL(window.location.href);
      cleanUrl.searchParams.delete("transaction_id");
      cleanUrl.searchParams.delete("booking_id");
      window.history.replaceState({}, document.title, cleanUrl.toString());

      const checkBookingOnMount = async () => {
        try {
          const { data: booking, error } = await supabase
            .from('jne_bookings')
            .select('*')
            .eq('id', bkId)
            .single();

          if (error || !booking) return;

          setIsModalOpen(true);
          setFinalBooking(booking);

          if (booking.status === "confirmed") {
            setPayState("success");
            setCheckoutStep("success");
            setFinalTicket(booking.ticket_id);
          } else if (booking.status === "pending") {
            setPayState("polling");
            setCheckoutStep("polling");
            pollTransaction(booking.ticket_id, booking.id, booking.ticket_id);
          } else {
            setPayState("error");
            setCheckoutStep("billing");
            setPayError(t.transactionFailed || "Transaction failed.");
          }
        } catch (err) {
          console.error("Error checking transaction return parameters:", err);
        }
      };

      checkBookingOnMount();
    }
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

  // Process Mobile Money via Payunit
  const handlePayment = async () => {
    if (!attendeeName.trim()) {
      setPayError(t.enterName || "Please enter the primary attendee's full name");
      return;
    }
    if (!selectedGateway) {
      setPayError("Please select a Mobile Money provider (MTN or Orange).");
      return;
    }
    if (!phoneNumber.trim()) {
      setPayError(t.enterMobileMoney || "Please enter a Mobile Money phone number");
      return;
    }
    
    setPayError("");
    setPayState("processing");

    let createdBookingId = null;
    try {
      // Build a multi-tier display string (e.g. "2x Standard, 1x VIP")
      const tierLabel = tiers
        .map((tier, i) => quantities[i] > 0 ? `${quantities[i]}x ${tier.label}` : null)
        .filter(Boolean)
        .join(", ");

      const { data: booking, error: dbError } = await supabase
        .from('jne_bookings')
        .insert([{
           event_id: event.id,
           event_title: event.title,
           user_id: user?.id || null,
           tier_label: tierLabel,
           tier_price: totalPrice,
           attendee_name: attendeeName.trim(),
           status: "pending",
           ticket_id: (() => {
              const clean = phoneNumber.replace(/[^0-9]/g, "");
              const isMockPhone = clean.endsWith("0000") || clean.startsWith("600") || clean.startsWith("237600");
              // Use alphanumeric only - no hyphens - PayUnit rejects transaction IDs with special chars
              const baseId = `JNE${Math.floor(Date.now() / 1000)}${Math.floor(Math.random() * 9000 + 1000)}`;
              return isMockPhone ? `${baseId}MOCK` : baseId;
            })()
        }])
        .select()
        .single();

      if (dbError) throw dbError;
      createdBookingId = booking.id;
      setFinalBooking(booking);

      // Create return URL
      const returnUrl = new URL(window.location.href);
      returnUrl.searchParams.set("transaction_id", booking.ticket_id);
      returnUrl.searchParams.set("booking_id", booking.id);
      
      let returnUrlStr = "";
      if (returnUrl.hostname === "localhost" || returnUrl.hostname === "127.0.0.1") {
        returnUrl.protocol = "https:";
        returnUrl.host = "jneevents.bookontransapp.com";
        returnUrlStr = returnUrl.toString();
      } else {
        returnUrl.protocol = "https:";
        returnUrlStr = returnUrl.toString();
      }
      
      // Step 1: Initialize transaction — registers transaction under our custom ID
      await initializePayment(totalPrice, booking.ticket_id, returnUrlStr);

      // Step 2: Push direct MoMo using the SAME custom transaction ID
      const formattedPhone = (() => {
        const clean = phoneNumber.replace(/[^0-9]/g, "");
        // Extract the last 9 digits (standard Cameroon mobile format e.g. 6xxxxxxxx)
        return clean.length >= 9 ? clean.slice(-9) : clean;
      })();

      try {
        await makeDirectPayment(totalPrice, booking.ticket_id, formattedPhone, returnUrlStr, selectedGateway);
        setPayState("polling");
        setCheckoutStep("polling");
        pollTransaction(booking.ticket_id, booking.id, booking.ticket_id);
      } catch (directErr) {
        console.warn("Direct MoMo push failed:", directErr);
        throw directErr;
      }

    } catch (err) {
      console.error(err);
      if (createdBookingId) {
        try {
          await supabase.from('jne_bookings').update({ status: 'failed' }).eq('id', createdBookingId);
        } catch (dbErr) {
          console.error("Failed to update booking status to failed:", dbErr);
        }
      }
      let userFriendlyError = err.message || t.paymentError || "Payment initialization failed. Please try again.";
      if (typeof userFriendlyError === "string" && userFriendlyError.toLowerCase().includes("payment request failed")) {
        userFriendlyError = "Payment request failed. This usually means you have insufficient funds in your MoMo wallet, the phone number doesn't match the selected provider, or your network requires you to dial a code (like #150*50# for Orange) to authorize payments first.";
      }
      setPayError(userFriendlyError);
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
        if (statusData.transaction_status === "SUCCESS") {
          clearInterval(pollingIntervalRef.current);
          await supabase.from('jne_bookings').update({ status: 'confirmed' }).eq('id', bookingId);
          if (!user?.id) {
            supabase.from('jne_bookings').select('*').eq('id', bookingId).single()
              .then(({ data: updatedBooking }) => {
                 if (updatedBooking) saveLocalTicket(updatedBooking, event);
              });
          }
          setFinalTicket(ticketId);
          setPayState("success");
          setCheckoutStep("success");
          logAnalyticsEvent("ticket_purchased", event.id, event.title);
        } else if (statusData.transaction_status === "FAILED" || statusData.transaction_status === "CANCELLED") {
          clearInterval(pollingIntervalRef.current);
          await supabase.from('jne_bookings').update({ status: 'failed' }).eq('id', bookingId);
          setPayError(t.transactionFailed || "Transaction failed or was cancelled.");
          setPayState("error");
          setCheckoutStep("billing");
        }
      } catch (err) {
        console.error("Polling error:", err);
      }

      if (attempts >= 40) { // 2 mins max
         clearInterval(pollingIntervalRef.current);
         setPayError(t.transactionTimeout || "Transaction timed out. Please try again.");
         setPayState("error");
         setCheckoutStep("billing");
      }
    }, 3000);
  };

  const handleCancelPayment = async () => {
    if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    if (finalBooking?.id) {
      try {
        await supabase.from('jne_bookings').update({ status: 'cancelled' }).eq('id', finalBooking.id);
      } catch (dbErr) {
        console.error("Failed to update booking status to cancelled:", dbErr);
      }
    }
    setPayState("idle");
    setPayError("");
    setCheckoutStep("billing");
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
    let introMessage = t.whatsappBookingIntro.replace("{title}", eventTitle || "JNE Nightout") + (dateStr ? ` on ${formatLocalizedDate(event.date, "EEE, MMM d", lang)} at ${timeStr}` : "") + ":";
    let outroMessage = t.whatsappBookingOutro;

    if (event?.whatsapp_message) {
      introMessage = event.whatsapp_message;
      outroMessage = "";
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
    <>
      {/* TRIGGER UI: Apple-style interactive block on the details page flow */}
      {!compact ? (
        <div className="rounded-3xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-2xl p-6 sm:p-8 shadow-[0_30px_70px_rgba(0,0,0,0.5)] space-y-6 text-center">
          <p className="text-sm text-white/40">Choose packages and reserve your slots securely</p>
          <button
            onClick={() => {
              setIsModalOpen(true);
              setCheckoutStep("select");
            }}
            className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-base transition-all shadow-lg shadow-violet-600/20"
          >
            {t.getTickets || "Get Tickets"}
            <ArrowRight className="w-5 h-5 ml-1" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => {
            setIsModalOpen(true);
            setCheckoutStep("select");
          }}
          className="hidden md:flex w-full items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-base transition-all shadow-lg shadow-violet-600/20"
        >
          {t.getTickets || "Get Tickets"}
          <ArrowRight className="w-5 h-5 ml-1" />
        </button>
      )}

      {/* MOBILE STICKY VIEWPORT FOOTER BAR */}
      <div className="fixed bottom-0 inset-x-0 z-40 md:hidden bg-[#06060a]/90 backdrop-blur-xl border-t border-white/[0.06] p-4 flex items-center justify-between animate-in slide-in-from-bottom duration-300">
        <div>
          <p className="text-[11px] text-white/40 font-semibold tracking-wide">Tickets from</p>
          <p className="text-lg font-bold text-white">
            {(tiers.length ? Math.min(...tiers.map(t => t.price || 0)) : 0).toLocaleString()} {currency}
          </p>
        </div>
        <button
          onClick={() => {
            setIsModalOpen(true);
            setCheckoutStep("select");
          }}
          className="px-6 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-sm transition-all"
        >
          {t.getTickets || "Get Tickets"}
        </button>
      </div>

      {/* EVENTBRITE-STYLE TWO-COLUMN CHECKOUT MODAL OVERLAY */}
      {isModalOpen && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-0 md:p-6 animate-in fade-in duration-200 text-white">
          
          <div className="relative w-full max-w-5xl h-full md:h-[85vh] bg-[#14141c] border border-transparent md:border-white/10 rounded-none md:rounded-[2.5rem] flex flex-col md:flex-row overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.8)]">
            
            {/* Modal Close Icon */}
            <button
              onClick={() => {
                setIsModalOpen(false);
                setCheckoutStep("select");
                setPayState("idle");
              }}
              className="absolute top-4 right-4 z-50 p-2.5 rounded-full bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-all"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Left Panel: Ticket Selector or Payment Forms */}
            <div className="flex-[3] flex flex-col justify-between h-full bg-[#14141c] border-r border-white/[0.06]">
              
              {/* Header */}
              <div className="p-6 border-b border-white/[0.06] flex items-center gap-3">
                {checkoutStep === "billing" && (
                  <button 
                    onClick={() => setCheckoutStep("select")}
                    className="p-1.5 hover:bg-white/5 rounded-lg text-white/50 hover:text-white transition-all mr-2"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                )}
                <div>
                  <h2 className="text-lg font-bold text-white line-clamp-1 pr-12">{eventTitle}</h2>
                  <p className="text-[11px] text-white/40 mt-0.5">{dateStr}</p>
                </div>
              </div>

              {/* Scrollable Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                
                {/* STEP 1: Select tickets */}
                {checkoutStep === "select" && (
                  <div className="space-y-4">
                    {tiers.map((tier, i) => {
                      const qty = quantities[i] || 0;
                      return (
                        <div
                          key={i}
                          className={`p-5 rounded-2xl border transition-all ${
                            qty > 0 
                              ? "bg-violet-600/10 border-violet-500/50" 
                              : "bg-white/[0.03] border-white/10 hover:bg-white/[0.06]"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-6">
                            <div className="space-y-1 flex-1">
                              <h4 className="font-bold text-white text-base tracking-tight">{tier.label}</h4>
                              <p className="text-sm font-semibold text-white/70">
                                {tier.price?.toLocaleString()} {currency}
                              </p>
                              {tier.description && (
                                <p className="text-xs text-white/40 leading-relaxed pt-1">{tier.description}</p>
                              )}

                              {/* Included Perks display */}
                              {(tier.headphones_included || tier.seat_included || tier.snack_included || tier.drink_included || (tier.inclusions?.length > 0)) && (
                                <div className="flex flex-wrap gap-1.5 pt-3">
                                  {tier.headphones_included && (
                                    <span className="inline-flex items-center gap-1 text-[10px] text-white/60 bg-white/5 px-2 py-0.5 rounded">
                                      <Headphones className="w-3 h-3 text-violet-400" />
                                      {t.headphones}
                                    </span>
                                  )}
                                  {tier.seat_included && (
                                    <span className="inline-flex items-center gap-1 text-[10px] text-white/60 bg-white/5 px-2 py-0.5 rounded">
                                      <Armchair className="w-3 h-3 text-sky-400" />
                                      {t.seatBlanket}
                                    </span>
                                  )}
                                  {tier.snack_included && (
                                    <span className="inline-flex items-center gap-1 text-[10px] text-white/60 bg-white/5 px-2 py-0.5 rounded">
                                      <Cookie className="w-3 h-3 text-orange-400" />
                                      {t.popcornSnack}
                                    </span>
                                  )}
                                  {tier.drink_included && (
                                    <span className="inline-flex items-center gap-1 text-[10px] text-white/60 bg-white/5 px-2 py-0.5 rounded">
                                      <Coffee className="w-3 h-3 text-emerald-400" />
                                      Drink
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Quantity buttons */}
                            <div className="flex items-center gap-3 shrink-0">
                              <button
                                onClick={() => setQty(i, -1)}
                                disabled={qty === 0}
                                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 disabled:opacity-20 disabled:cursor-not-allowed flex items-center justify-center border border-white/10 text-white transition-all"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="text-white font-bold text-base w-6 text-center">{qty}</span>
                              <button
                                onClick={() => setQty(i, 1)}
                                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center border border-white/10 text-white transition-all"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                           {/* Extras/Add-ons display (only expands if ticket selected) */}
                           {qty > 0 && dynamicAddons.length > 0 && (
                             <div className="mt-5 pt-4 border-t border-white/[0.04] space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                               <p className="text-[11px] font-bold text-violet-400 tracking-wide">{t.addPaidExtras || "Add Extras"}</p>
                               {dynamicAddons.map(addon => {
                                 const aqty = addonQty[`${i}_${addon.id}`] || 0;
                                 const Icon = addon.category === "Food" ? Utensils : GlassWater;
 
                                 return (
                                   <div key={addon.id} className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                                     <div className="flex items-center gap-2">
                                       <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-white/50">
                                         <Icon className="w-3.5 h-3.5" />
                                       </div>
                                       <div>
                                         <p className="text-xs font-semibold text-white/80">{addon.name}</p>
                                         <p className="text-[10px] text-white/40">{addon.price.toLocaleString()} {currency}</p>
                                       </div>
                                     </div>
                                     <div className="flex items-center gap-2">
                                       <button
                                         onClick={() => setAddon(`${i}_${addon.id}`, -1)}
                                         disabled={aqty === 0}
                                         className="w-6 h-6 rounded bg-white/5 hover:bg-white/10 disabled:opacity-20 flex items-center justify-center text-white text-xs border border-white/10"
                                       >
                                         -
                                       </button>
                                       <span className="text-white text-xs font-bold w-4 text-center">{aqty}</span>
                                       <button
                                         onClick={() => setAddon(`${i}_${addon.id}`, 1)}
                                         className="w-6 h-6 rounded bg-white/5 hover:bg-white/10 flex items-center justify-center text-white text-xs border border-white/10"
                                       >
                                         +
                                       </button>
                                     </div>
                                   </div>
                                 );
                               })}
                             </div>
                           )}
 
                         </div>
                       );
                     })}
                   </div>
                 )}
 
                 {/* STEP 2: Billing & payment detail prompt */}
                 {checkoutStep === "billing" && (
                   <div className="space-y-6 max-w-md mx-auto py-4">
                     <div>
                       <h3 className="text-lg font-bold text-white tracking-tight">Billing & Attendee Info</h3>
                       <p className="text-xs text-white/40 mt-1">Enter details to complete the Mobile Money transaction push</p>
                     </div>
 
                     <div className="space-y-4">
                       {/* Name Input */}
                       <div className="flex flex-col">
                         <label className="text-xs font-semibold text-white/50 mb-2">
                           Attendee Name
                         </label>
                         <input
                           type="text"
                           placeholder={t.ticketNamePlaceholder || "Enter full name"}
                           value={attendeeName}
                           onChange={(e) => setAttendeeName(e.target.value)}
                           className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/40 transition-all font-medium text-base"
                         />
                       </div>

                        {/* Provider Selector */}
                        <div className="flex flex-col">
                          <label className="text-xs font-semibold text-white/50 mb-2">Mobile Money Provider</label>
                          <div className="grid grid-cols-2 gap-3">
                            <button
                              type="button"
                              onClick={() => setSelectedGateway("CM_MTNMOMO")}
                              className={`flex items-center justify-center gap-2 py-3 rounded-2xl border font-bold text-sm transition-all ${
                                selectedGateway === "CM_MTNMOMO"
                                  ? "bg-[#ffcc00] border-[#ffcc00] text-black shadow-lg"
                                  : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10"
                              }`}
                            >
                              <span className="text-base">📲</span> MTN MoMo
                            </button>
                            <button
                              type="button"
                              onClick={() => setSelectedGateway("CM_ORANGE")}
                              className={`flex items-center justify-center gap-2 py-3 rounded-2xl border font-bold text-sm transition-all ${
                                selectedGateway === "CM_ORANGE"
                                  ? "bg-[#ff6600] border-[#ff6600] text-white shadow-lg"
                                  : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10"
                              }`}
                            >
                              <span className="text-base">📲</span> Orange Money
                            </button>
                          </div>
                        </div>

                        {/* Phone Input with +237 prefix */}
                        <div className="flex flex-col">
                          <label className="text-xs font-semibold text-white/50 mb-2">Phone Number</label>
                          <div className="flex gap-2">
                            <div className="flex items-center gap-1.5 px-3 py-3.5 bg-white/5 border border-white/10 rounded-2xl text-white/60 font-bold text-sm shrink-0">
                              🇨🇲 +237
                            </div>
                            <div className="relative flex-1">
                              <input
                                type="tel"
                                placeholder="6XX XXX XXX"
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/40 transition-all font-medium text-base"
                              />
                            </div>
                          </div>
                        </div>
                    </div>

                    {payError && (
                      <p className="text-red-400 text-xs font-semibold leading-relaxed p-3 rounded-lg bg-red-500/5 border border-red-500/10">
                        {payError}
                      </p>
                    )}
                  </div>
                )}

                {/* STEP 3: Polling for USSD Pin Confirm */}
                {checkoutStep === "polling" && (
                  <div className="flex flex-col items-center justify-center py-12 text-center max-w-sm mx-auto space-y-6">
                    <div className="relative">
                      <div className="w-16 h-16 rounded-full border-4 border-amber-500/20 border-t-amber-500 animate-spin flex items-center justify-center" />
                      <Loader2 className="w-6 h-6 text-amber-400 animate-pulse absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                    </div>
                    
                    <div>
                      <h4 className="text-white font-bold text-lg tracking-tight mb-2">{t.checkYourPhone || "Check your phone"}</h4>
                      <p className="text-white/60 text-sm">{t.enterPin || "A USSD payment prompt has been sent. Please enter your mobile money PIN to confirm."}</p>
                    </div>

                    {(() => {
                      const cleanPhone = phoneNumber.replace(/\D/g, '');
                      const isMTN = /^(67|650|651|652|653|654|68)/.test(cleanPhone);
                      const isOrange = /^(69|655|656|657|658|659)/.test(cleanPhone);
                      
                      if (isMTN) return <p className="text-amber-400/90 text-xs bg-amber-500/5 border border-amber-500/10 py-2.5 px-4 rounded-xl">{t.noPopupMtn || "Dial *126# if you didn't receive a popup."}</p>;
                      if (isOrange) return <p className="text-amber-400/90 text-xs bg-amber-500/5 border border-amber-500/10 py-2.5 px-4 rounded-xl">{t.noPopupOrange || "Dial #150*50# to authorize the prompt."}</p>;
                      return null;
                    })()}

                    <button 
                      onClick={handleCancelPayment}
                      className="px-6 py-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white text-xs font-semibold transition-all flex items-center gap-2"
                    >
                      <X className="w-3.5 h-3.5" />
                      {t.cancelPayment || "Cancel Payment"}
                    </button>
                  </div>
                )}

                {/* STEP 4: Success Ticket Render */}
                {checkoutStep === "success" && (
                  <div className="max-w-md mx-auto py-2 animate-in zoom-in-95 duration-200">
                    {/* On mobile devices: Show the ticket right here inside the main scroll view */}
                    <div className="md:hidden">
                      <GuestTicket 
                        booking={finalBooking} 
                        event={event} 
                        onDone={() => {
                          setIsModalOpen(false);
                          setCheckoutStep("select");
                          setPayState("idle");
                          setAttendeeName("");
                          setPhoneNumber("");
                        }} 
                      />
                    </div>

                    {/* On desktop viewports: Show a congratulations panel since the ticket is forming in the right sidebar */}
                    <div className="hidden md:flex flex-col items-center justify-center text-center p-8 space-y-6">
                      <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center text-emerald-400">
                        <Check className="w-8 h-8" />
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-2xl font-extrabold text-white tracking-tight">{t.ticketConfirmed || "Booking Confirmed!"}</h3>
                        <p className="text-white/60 text-sm max-w-sm">
                          {t.ticketConfirmedDesc || "Your payment was processed successfully. You can download your ticket from the preview panel on the right."}
                        </p>
                      </div>
                      
                      <button
                        onClick={() => {
                          setIsModalOpen(false);
                          setCheckoutStep("select");
                          setPayState("idle");
                          setAttendeeName("");
                          setPhoneNumber("");
                          setSelectedGateway("");
                        }}
                        className="px-8 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold transition-all"
                      >
                        {t.ticketDone || "Done"}
                      </button>
                    </div>
                  </div>
                )}

              </div>

              {/* Sticky Left footer */}
              <div className="p-6 border-t border-white/[0.06] bg-[#14141c] flex items-center justify-between z-10 shrink-0">
                {checkoutStep === "select" && (
                  <>
                    <span className="hidden md:inline text-[11px] text-white/40 font-semibold tracking-wide">Powered by JNE Events</span>
                    
                    {/* Mobile Viewports: Stack buttons vertically in Left Panel sticky footer */}
                    <div className="flex flex-col w-full gap-3 md:hidden">
                      <button
                        onClick={() => setCheckoutStep("billing")}
                        disabled={totalTickets === 0}
                        className="w-full py-3.5 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm transition-all shadow-lg shadow-violet-600/10"
                      >
                        Check out
                      </button>
                      {totalTickets > 0 && (
                        <a
                          href={`https://wa.me/${whatsappBase}?text=${encodeURIComponent(buildWhatsAppMessage())}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={logClick}
                          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/85 text-xs font-bold text-center transition-all"
                        >
                          {t.bookViaWhatsApp || "Book via WhatsApp"}
                        </a>
                      )}
                    </div>
                  </>
                )}

                {checkoutStep === "billing" && (
                  <>
                    <span className="text-[11px] text-white/40 font-semibold tracking-wide">Powered by JNE Events</span>
                    <button
                      onClick={handlePayment}
                      disabled={payState === "processing" || !phoneNumber || !attendeeName || !selectedGateway}
                      className="flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 disabled:opacity-40 text-black font-extrabold text-sm tracking-wide transition-all shadow-lg shadow-amber-500/10"
                    >
                      {payState === "processing" ? <Loader2 className="w-4 h-4 animate-spin" /> : t.payNow || "Pay Now"}
                    </button>
                  </>
                )}
              </div>

            </div>

            {/* Right Panel: Cart Summary or Ticket Preview (Dynamic Sidebar) */}
            <div className="hidden md:flex flex-[2] flex-col h-full bg-[#14141c] p-6 justify-between overflow-y-auto z-10 select-none">
              
              {checkoutStep === "select" ? (
                <div className="space-y-6 h-full flex flex-col justify-between">
                  <div className="space-y-6">
                    {/* Event Image */}
                    {event.image_url && (
                      <img
                        src={event.image_url}
                        alt="Event poster"
                        className="w-full aspect-[16/10] object-cover rounded-2xl border border-white/[0.06]"
                      />
                    )}

                    <div className="space-y-4">
                      <h3 className="text-xs font-bold text-white/40 tracking-wide">Order Summary</h3>

                      {totalTickets === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 text-center text-white/20 space-y-3">
                          <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
                            <ShoppingCart className="w-5 h-5 text-white/30" />
                          </div>
                          <p className="text-xs font-medium">Select tickets to continue</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {/* Ticket rows in cart */}
                          <div className="divide-y divide-white/[0.04] space-y-3">
                            {tiers.map((tier, i) => {
                              const qty = quantities[i] || 0;
                              if (qty === 0) return null;
                              return (
                                <div key={i} className="flex justify-between items-start text-sm pt-3 first:pt-0">
                                  <div className="text-white/80">
                                    <span className="font-bold text-white mr-2">{qty}x</span>
                                    {tier.label}
                                  </div>
                                  <span className="text-white font-semibold">{(qty * tier.price).toLocaleString()} {currency}</span>
                                </div>
                              );
                            })}

                            {/* Addon rows in cart */}
                            {tiers.map((tier, i) => {
                              if (!quantities[i]) return null;
                              return dynamicAddons
                                .filter(a => addonQty[`${i}_${a.id}`] > 0)
                                .map(a => {
                                  const aqty = addonQty[`${i}_${a.id}`];
                                  return (
                                    <div key={a.id} className="flex justify-between items-center text-xs text-white/50 pt-2">
                                      <span>{aqty}x {a.name} ({tier.label})</span>
                                      <span>{(aqty * a.price).toLocaleString()} {currency}</span>
                                    </div>
                                  );
                                });
                            })}
                          </div>

                          {/* Total row */}
                          <div className="border-t border-white/[0.06] pt-4 flex justify-between items-center">
                            <span className="text-sm font-bold text-white/70">Total</span>
                            <span className="text-xl font-extrabold text-white">{totalPrice.toLocaleString()} {currency}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {totalTickets > 0 && (
                    <div className="border-t border-white/[0.04] pt-4 mt-6">
                      <button
                        onClick={() => setCheckoutStep("billing")}
                        className="w-full py-3.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-sm transition-all mb-3 shadow-lg shadow-violet-600/10"
                      >
                        Check out
                      </button>
                      <a
                        href={`https://wa.me/${whatsappBase}?text=${encodeURIComponent(buildWhatsAppMessage())}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={logClick}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/85 text-xs font-bold transition-all text-center"
                      >
                        {t.bookViaWhatsApp || "Book via WhatsApp"}
                      </a>
                    </div>
                  )}
                </div>
              ) : (
                // Live preview forming/completed ticket view
                <div className="space-y-6 flex flex-col justify-start h-full pt-6 pb-12 overflow-y-auto animate-in fade-in duration-300">
                  <div className="text-center space-y-1">
                    <h3 className="text-xs font-bold text-white/40 tracking-wide">
                      {checkoutStep === "success" ? "Your Ticket" : "Ticket Preview"}
                    </h3>
                  </div>
                  
                  <VerticalTicket
                    booking={finalBooking}
                    event={event}
                    attendeeName={attendeeName}
                    tierLabel={tiers.find((_, i) => quantities[i] > 0)?.label}
                    ticketId={finalBooking?.ticket_id}
                    showActions={checkoutStep === "success"}
                    showDone={false}
                    onDone={() => {
                      setIsModalOpen(false);
                      setCheckoutStep("select");
                      setPayState("idle");
                      setAttendeeName("");
                      setPhoneNumber("");
                    }}
                  />
                </div>
              )}

            </div>

          </div>
        </div>,
        document.body
      )}
    </>
  );
}