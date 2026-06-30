import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    Plus, Trash2, Loader2, Star, MessageCircle, Phone, CreditCard
} from "lucide-react";

export default function SettingsPanel() {
    const queryClient = useQueryClient();

    // WhatsApp Contacts Only (Categories moved to Events section)
    const { data: contacts = [], isLoading: loadingContacts } = useQuery({
        queryKey: ["whatsapp_contacts"],
        queryFn: async () => {
            const { data } = await supabase
                .from('jne_settings')
                .select('value')
                .eq('key', 'whatsapp_contacts')
                .maybeSingle();
            return data?.value ? JSON.parse(data.value) : [];
        }
    });

    // Payment Flow Setting
    const { data: paymentFlow = "redirect", isLoading: loadingFlow } = useQuery({
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

    const savePaymentFlow = useMutation({
        mutationFn: async (flow) => {
            const { error } = await supabase
                .from('jne_settings')
                .upsert({ key: 'payment_flow', value: flow, updated_at: new Date().toISOString() });
            if (error) throw error;
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["payment_flow"] })
    });

    const saveContacts = useMutation({
        mutationFn: async (newContacts) => {
            const { error } = await supabase
                .from('jne_settings')
                .upsert({ key: 'whatsapp_contacts', value: JSON.stringify(newContacts), updated_at: new Date().toISOString() });
            if (error) throw error;
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["whatsapp_contacts"] })
    });

    const [newNumber, setNewNumber] = useState("");

    const addContact = () => {
        if (!newNumber.trim()) return;
        if (contacts.some(c => c.number === newNumber.trim())) return;
        saveContacts.mutate([...contacts, { number: newNumber.trim(), label: newNumber.trim(), isDefault: contacts.length === 0 }]);
        setNewNumber("");
    };

    const removeContact = (number) => {
        saveContacts.mutate(contacts.filter(c => c.number !== number));
    };

    const setDefault = (number) => {
        saveContacts.mutate(contacts.map(c => ({ ...c, isDefault: c.number === number })));
    };

    if (loadingContacts || loadingFlow) return <div className="flex justify-center p-12"><Loader2 className="w-5 h-5 animate-spin text-violet-400" /></div>;

    return (
        <div className="space-y-10">
            <section className="space-y-4">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                        <MessageCircle className="w-[18px] h-[18px] text-emerald-400" />
                    </div>
                    <div>
                        <h3 className="text-base font-bold text-white">WhatsApp Contacts</h3>
                        <p className="text-[11px] text-white/30">Manage booking contact numbers used across events.</p>
                    </div>
                </div>

                <div className="flex gap-2">
                    <input
                        value={newNumber}
                        onChange={e => setNewNumber(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && addContact()}
                        placeholder="+237 8XX XXX XXX"
                        className="flex-1 bg-white/5 border border-white/10 rounded-xl p-3 text-white text-sm placeholder:text-white/20"
                    />
                    <button onClick={addContact} className="px-5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-bold rounded-xl border border-emerald-500/20 transition-colors text-sm">
                        <Plus className="w-4 h-4" />
                    </button>
                </div>

                <div className="space-y-2">
                    {contacts.map(c => (
                        <div key={c.number} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] group">
                            <div className="flex items-center gap-3">
                                <Phone className="w-4 h-4 text-white/20" />
                                <span className="text-sm font-medium text-white">{c.number}</span>
                                {c.isDefault && (
                                    <span className="text-[9px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1">
                                        <Star className="w-2 h-2 fill-emerald-400" /> Default
                                    </span>
                                )}
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                {!c.isDefault && (
                                    <button onClick={() => setDefault(c.number)} className="p-2 hover:bg-amber-500/10 rounded-lg text-amber-500/60 hover:text-amber-400 transition-colors" title="Set as default">
                                        <Star className="w-3.5 h-3.5" />
                                    </button>
                                )}
                                <button onClick={() => removeContact(c.number)} className="p-2 hover:bg-red-500/10 rounded-lg text-red-400/40 hover:text-red-400 transition-colors" title="Remove">
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                    ))}
                    {contacts.length === 0 && (
                        <p className="text-xs text-white/20 italic p-3">No contacts saved yet.</p>
                    )}
                </div>
            </section>

            <section className="space-y-4 pt-6 border-t border-white/5">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center">
                        <CreditCard className="w-[18px] h-[18px] text-amber-400" />
                    </div>
                    <div>
                        <h3 className="text-base font-bold text-white">Payment Flow</h3>
                        <p className="text-[11px] text-white/30">Choose how users experience the mobile money checkout.</p>
                    </div>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={() => savePaymentFlow.mutate("redirect")}
                        className={`flex-1 p-4 rounded-xl border text-left transition-all ${
                            paymentFlow === "redirect" 
                            ? "bg-amber-500/10 border-amber-500/40 ring-1 ring-amber-500/20" 
                            : "bg-white/5 border-white/10 hover:bg-white/10 text-white/50"
                        }`}
                    >
                        <h4 className={`text-sm font-bold ${paymentFlow === "redirect" ? "text-amber-400" : "text-white/70"}`}>Redirect to Payunit</h4>
                        <p className="text-xs text-white/40 mt-1">Users are sent to Payunit's secure hosted page to complete payment.</p>
                    </button>
                    <button
                        onClick={() => savePaymentFlow.mutate("in-app")}
                        className={`flex-1 p-4 rounded-xl border text-left transition-all ${
                            paymentFlow === "in-app" 
                            ? "bg-amber-500/10 border-amber-500/40 ring-1 ring-amber-500/20" 
                            : "bg-white/5 border-white/10 hover:bg-white/10 text-white/50"
                        }`}
                    >
                        <h4 className={`text-sm font-bold ${paymentFlow === "in-app" ? "text-amber-400" : "text-white/70"}`}>In-App Prompt</h4>
                        <p className="text-xs text-white/40 mt-1">Users enter their number and get an automatic USSD prompt on their phone.</p>
                    </button>
                </div>
            </section>
        </div>
    );
}
