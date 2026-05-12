import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    Plus, Trash2, Edit2, Check, Loader2, Package,
    Utensils, GlassWater, LayoutGrid
} from "lucide-react";

export default function ExtrasManager() {
    const queryClient = useQueryClient();
    const [editingItem, setEditingItem] = useState(null);
    const [isAdding, setIsAdding] = useState(false);

    // Fetch dynamic categories
    const { data: categories = [] } = useQuery({
        queryKey: ["event_categories"],
        queryFn: async () => {
            const { data } = await supabase.from('jne_settings').select('value').eq('key', 'event_categories').maybeSingle();
            return data?.value ? JSON.parse(data.value) : [];
        }
    });

    const { data: items, isLoading } = useQuery({
        queryKey: ["shop_items"],
        queryFn: async () => {
            const { data, error } = await supabase.from('jne_shop_items').select('*').order('created_at', { ascending: false });
            if (error) throw error;
            return data;
        }
    });

    const saveMutation = useMutation({
        mutationFn: async (item) => {
            if (item.id) {
                const { error } = await supabase.from('jne_shop_items').update(item).eq('id', item.id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('jne_shop_items').insert([item]);
                if (error) throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["shop_items"] });
            setEditingItem(null);
            setIsAdding(false);
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (id) => {
            const { error } = await supabase.from('jne_shop_items').delete().eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["shop_items"] });
        }
    });

    if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-violet-500" /></div>;

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Package className="w-5 h-5 text-violet-400" />
                        Extras Gallery
                    </h2>
                    <p className="text-sm text-white/40 mt-1">Manage food, drinks, and other items available for events.</p>
                </div>
                <button
                    onClick={() => setIsAdding(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-violet-600/20 hover:bg-violet-600/40 text-violet-300 border border-violet-500/30 font-bold rounded-xl transition-all"
                >
                    <Plus className="w-4 h-4" />
                    New Extra
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(isAdding || editingItem) && (
                    <div className="col-span-full bg-white/[0.05] border border-white/10 rounded-2xl p-6 mb-4 animate-in fade-in slide-in-from-top-4">
                        <h3 className="text-lg font-bold text-white mb-4">
                            {isAdding ? "Add New Extra" : `Edit ${editingItem?.name}`}
                        </h3>
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                const formData = new FormData(e.target);
                                const selectedTypes = categories
                                    .filter(t => formData.get(`type_${t.id}`) === 'on')
                                    .map(t => t.id);

                                const item = {
                                    name: formData.get('name'),
                                    price: Number(formData.get('price')),
                                    category: formData.get('category'),
                                    available: formData.get('available') === 'on',
                                    applicable_event_types: selectedTypes
                                };
                                if (editingItem?.id) item.id = editingItem.id;
                                saveMutation.mutate(item);
                            }}
                            className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                        >
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-white/40 uppercase">Extra Name</label>
                                <input name="name" defaultValue={editingItem?.name} required className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white text-sm" placeholder="e.g. Chicken Wings" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-white/40 uppercase">Price (XAF)</label>
                                <input name="price" type="number" defaultValue={editingItem?.price} required className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white text-sm" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-white/40 uppercase">Group</label>
                                <select name="category" defaultValue={editingItem?.category || "Food"} className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl p-3 text-white text-sm appearance-none cursor-pointer">
                                    <option value="Food">Food & Snacks</option>
                                    <option value="Refreshments">Drinks & More</option>
                                </select>
                            </div>
                            <div className="space-y-1.5 col-span-full border-t border-white/5 pt-4 mt-2">
                                <label className="text-xs font-bold text-white/40 uppercase">Assign to Event Types:</label>
                                <div className="flex flex-wrap gap-4 mt-2">
                                    {categories.map(type => (
                                        <div key={type.id} className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                name={`type_${type.id}`}
                                                id={`type_${type.id}`}
                                                defaultChecked={editingItem?.applicable_event_types?.includes(type.id)}
                                                className="w-4 h-4 accent-violet-500 rounded border-white/10"
                                            />
                                            <label htmlFor={`type_${type.id}`} className="text-sm text-white/70 cursor-pointer">{type.label}</label>
                                        </div>
                                    ))}
                                </div>
                                <p className="text-[10px] text-white/20 italic mt-1.5">If none are checked, this extra will appear on ALL events.</p>
                            </div>

                            <div className="flex items-center gap-3 pt-4">
                                <input name="available" type="checkbox" id="available_check" defaultChecked={editingItem ? editingItem.available : true} className="w-5 h-5 accent-emerald-500" />
                                <label htmlFor="available_check" className="text-sm font-medium text-white italic cursor-pointer">Available for order</label>
                            </div>
                            <div className="col-span-full flex gap-3 mt-2">
                                <button type="submit" disabled={saveMutation.isPending} className="flex-1 bg-violet-500 text-black font-bold py-3 rounded-xl flex items-center justify-center gap-2 text-sm">
                                    {saveMutation.isPending ? <Loader2 className="animate-spin w-4 h-4" /> : <Check className="w-4 h-4" />}
                                    Save Extra
                                </button>
                                <button type="button" onClick={() => { setIsAdding(false); setEditingItem(null); }} className="px-6 bg-white/10 text-white font-bold rounded-xl text-sm">
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {items?.map(item => {
                    const Icon = item.category === "Food" ? Utensils : GlassWater;
                    return (
                        <div key={item.id} className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 flex items-center justify-between group">
                            <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.available ? 'bg-violet-500/10 text-violet-400' : 'bg-gray-500/10 text-gray-500 grayscale'}`}>
                                    <Icon className="w-5 h-5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className={`font-bold truncate ${item.available ? 'text-white' : 'text-white/40'}`}>{item.name}</h4>
                                    <div className="flex gap-2 items-center flex-wrap mt-1">
                                        <span className="text-violet-400 font-bold text-sm">{(item.price || 0).toLocaleString()} XAF</span>
                                        {item.applicable_event_types?.length > 0 ? (
                                            item.applicable_event_types.map(t => (
                                                <span key={t} className="text-[9px] bg-white/5 text-white/30 px-1.5 py-0.5 rounded border border-white/5">
                                                    {categories.find(et => et.id === t)?.label || t}
                                                </span>
                                            ))
                                        ) : (
                                            <span className="text-[9px] bg-white/5 text-white/30 px-1.5 py-0.5 rounded border border-white/5 flex items-center gap-1">
                                                <LayoutGrid className="w-2.5 h-2.5" /> All Types
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-1">
                                <button onClick={() => setEditingItem(item)} className="p-2 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-all">
                                    <Edit2 className="w-4 h-4" />
                                </button>
                                <button onClick={() => { if (window.confirm('Delete this extra?')) deleteMutation.mutate(item.id); }} className="p-2 rounded-lg hover:bg-red-500/10 text-white/40 hover:text-red-400 transition-all">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
