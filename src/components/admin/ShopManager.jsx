import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Edit2, Check, X, Loader2, Package, Utensils, GlassWater } from "lucide-react";

export default function ShopManager() {
    const queryClient = useQueryClient();
    const [editingItem, setEditingItem] = useState(null);
    const [isAdding, setIsAdding] = useState(false);

    const { data: items, isLoading } = useQuery({
        queryKey: ["shop_items"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('jne_shop_items')
                .select('*')
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data;
        }
    });

    const saveMutation = useMutation({
        mutationFn: async (item) => {
            if (item.id) {
                const { error } = await supabase
                    .from('jne_shop_items')
                    .update(item)
                    .eq('id', item.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('jne_shop_items')
                    .insert([item]);
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
            const { error } = await supabase
                .from('jne_shop_items')
                .delete()
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["shop_items"] });
        }
    });

    if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Package className="w-5 h-5 text-violet-400" />
                    Extras & Refreshments
                </h2>
                <button
                    onClick={() => setIsAdding(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-violet-500 hover:bg-violet-400 text-black font-bold rounded-xl transition-all"
                >
                    <Plus className="w-4 h-4" />
                    Add Item
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Add/Edit Form Overlay */}
                {(isAdding || editingItem) && (
                    <div className="col-span-full bg-white/[0.05] border border-white/10 rounded-2xl p-6 mb-4 animate-in fade-in slide-in-from-top-4">
                        <h3 className="text-lg font-bold text-white mb-4">
                            {isAdding ? "Create New Extra" : `Edit ${editingItem?.label || "Item"}`}
                        </h3>
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                const formData = new FormData(e.target);
                                const item = {
                                    label: formData.get('label'),
                                    price: Number(formData.get('price')),
                                    category: formData.get('category'),
                                    available: formData.get('available') === 'on'
                                };
                                if (editingItem?.id) item.id = editingItem.id;
                                saveMutation.mutate(item);
                            }}
                            className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                        >
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-white/40 uppercase">Item Name</label>
                                <input name="label" defaultValue={editingItem?.label} required className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white" placeholder="e.g. Chicken Wings" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-white/40 uppercase">Price (XAF)</label>
                                <input name="price" type="number" defaultValue={editingItem?.price} required className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-white/40 uppercase">Category</label>
                                <select
                                    name="category"
                                    defaultValue={editingItem?.category || "Food"}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white appearance-none cursor-pointer"
                                    style={{ backgroundColor: '#1a1a1a' }}
                                >
                                    <option value="Food" style={{ color: 'white', backgroundColor: '#333' }}>Food & Snacks</option>
                                    <option value="Refreshments" style={{ color: 'white', backgroundColor: '#333' }}>Refreshments & Drinks</option>
                                </select>
                            </div>
                            <div className="flex items-center gap-3 pt-6">
                                <input name="available" type="checkbox" defaultChecked={editingItem ? editingItem.available : true} className="w-5 h-5 accent-violet-500" />
                                <label className="text-sm font-medium text-white">Available for booking</label>
                            </div>
                            <div className="col-span-full flex gap-3 mt-2">
                                <button type="submit" disabled={saveMutation.isPending} className="flex-1 bg-violet-500 text-black font-bold py-3 rounded-xl flex items-center justify-center gap-2">
                                    {saveMutation.isPending ? <Loader2 className="animate-spin w-4 h-4" /> : <Check className="w-4 h-4" />}
                                    Save Changes
                                </button>
                                <button type="button" onClick={() => { setIsAdding(false); setEditingItem(null); }} className="px-6 bg-white/10 text-white font-bold rounded-xl">
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {items?.map(item => {
                        const Icon = item.category === "Food" ? Utensils : GlassWater;
                        return (
                            <div key={item.id} className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 flex items-center justify-between group">
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.available ? 'bg-violet-500/10 text-violet-400' : 'bg-gray-500/10 text-gray-500 grayscale'}`}>
                                        <Icon className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h4 className={`font-bold ${item.available ? 'text-white' : 'text-white/40'}`}>{item.label}</h4>
                                        <div className="flex gap-2 items-center">
                                            <span className="text-violet-400 font-bold text-sm">{(item.price || 0).toLocaleString()} XAF</span>
                                            <span className="text-[10px] uppercase tracking-widest text-white/20 font-bold">{item.category}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => setEditingItem(item)}
                                        className="p-2 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-all"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => { if (window.confirm('Delete this item?')) deleteMutation.mutate(item.id); }}
                                        className="p-2 rounded-lg hover:bg-red-500/10 text-white/40 hover:text-red-400 transition-all"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {items?.length === 0 && !isAdding && (
                    <div className="col-span-full py-12 text-center border-2 border-dashed border-white/5 rounded-3xl">
                        <Package className="w-8 h-8 text-white/10 mx-auto mb-3" />
                        <p className="text-white/40">No refreshments added yet.</p>
                    </div>
                )}
            </div>
        </div >
    );
}
