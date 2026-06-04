import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    Plus, Trash2, LayoutGrid, Loader2,
    Settings2, Utensils, GlassWater, Sparkles
} from "lucide-react";
import { Switch } from "@/components/ui/switch";

export default function CategoryDesigner() {
    const queryClient = useQueryClient();
    const [isAdding, setIsAdding] = useState(false);

    // Fetch categories
    const { data: categories = [], isLoading: loadingCats } = useQuery({
        queryKey: ["event_categories"],
        queryFn: async () => {
            const { data } = await supabase.from('jne_settings').select('value').eq('key', 'event_categories').maybeSingle();
            return data?.value ? JSON.parse(data.value) : [];
        }
    });

    // Fetch items (extras)
    const { data: items = [], isLoading: loadingItems } = useQuery({
        queryKey: ["shop_items"],
        queryFn: async () => {
            const { data } = await supabase.from('jne_shop_items').select('*').order('name');
            return data || [];
        }
    });

    const updateCategories = useMutation({
        mutationFn: async (newCats) => {
            const { error } = await supabase
                .from('jne_settings')
                .upsert({
                    key: 'event_categories',
                    value: JSON.stringify(newCats),
                    updated_at: new Date().toISOString()
                }, { onConflict: 'key' });
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["event_categories"] });
            queryClient.invalidateQueries({ queryKey: ["events"] });
        },
        onError: (err) => {
            console.error("Failed to save categories:", err);
            alert("Error saving category. Did you run the SQL migration?");
        }
    });

    const toggleExtraForCategory = async (catId, extraId, isChecked) => {
        const item = items.find(i => i.id === extraId);
        if (!item) return;

        let newTypes = item.applicable_event_types || [];
        if (isChecked) {
            if (!newTypes.includes(catId)) newTypes.push(catId);
        } else {
            newTypes = newTypes.filter(t => t !== catId);
        }

        await supabase.from('jne_shop_items').update({ applicable_event_types: newTypes }).eq('id', extraId);
        queryClient.invalidateQueries({ queryKey: ["shop_items"] });
    };

    if (loadingCats || loadingItems) return <div className="flex justify-center p-12"><Loader2 className="w-6 h-6 animate-spin text-violet-400" /></div>;

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            {/* Header */}
            <div className="flex justify-between items-center bg-white/[0.03] border border-white/[0.06] p-5 rounded-2xl">
                <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <Settings2 className="w-5 h-5 text-violet-400" />
                        Events Category
                    </h3>
                    <p className="text-[11px] text-white/30 px-2 mt-1">Design event types and define their extras templates.</p>
                </div>
                <button
                    onClick={() => setIsAdding(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-violet-600/20 hover:bg-violet-600/40 text-violet-300 border border-violet-500/30 font-bold rounded-xl transition-all text-xs"
                >
                    <Plus className="w-3.5 h-3.5" />
                    New Category
                </button>
            </div>

            {/* Quick Add Label Form */}
            {isAdding && (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 animate-in zoom-in-95">
                    <form onSubmit={(e) => {
                        e.preventDefault();
                        const label = new FormData(e.target).get('label');
                        const id = label.toLowerCase().replace(/\s+/g, '_');
                        if (categories.some(c => c.id === id)) return alert('Category already exists');
                        updateCategories.mutate([...categories, { id, label }]);
                        setIsAdding(false);
                    }} className="flex gap-2">
                        <input name="label" autoFocus placeholder="e.g. Workshop or VIP Premiere" className="flex-1 bg-white/5 border border-white/10 rounded-xl p-2.5 text-white text-sm" />
                        <button type="submit" className="px-5 bg-violet-500 text-black font-bold rounded-xl text-sm">Create</button>
                        <button type="button" onClick={() => setIsAdding(false)} className="px-3 text-white/40 text-sm">Cancel</button>
                    </form>
                </div>
            )}

            {/* Category Grid */}
            <div className="grid grid-cols-1 gap-4">
                {categories.map(cat => (
                    <div key={cat.id} className="bg-white/[0.02] border border-white/[0.05] rounded-2xl overflow-hidden group hover:border-white/10 transition-colors">
                        <div className="px-5 py-3.5 bg-white/[0.02] border-b border-white/[0.05] flex justify-between items-center">
                            <div>
                                <h4 className="text-sm font-bold text-white">{cat.label}</h4>
                                <p className="text-[9px] text-white/20 uppercase tracking-widest font-mono">ID: {cat.id}</p>
                            </div>
                            <button
                                onClick={() => {
                                    if (window.confirm(`Delete the "${cat.label}" event type?`)) {
                                        updateCategories.mutate(categories.filter(c => c.id !== cat.id));
                                    }
                                }}
                                className="text-red-400/20 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-500/10 transition-all"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        </div>

                        <div className="p-4">
                            <p className="text-[10px] text-violet-400/60 font-bold uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                <Sparkles className="w-3 h-3" />
                                Available Extras for this Type:
                            </p>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                                {items?.map(item => {
                                    const isActive = item.applicable_event_types?.includes(cat.id);
                                    const Icon = item.category === "Food" ? Utensils : GlassWater;
                                    return (
                                        <div key={item.id} className={`flex items-center justify-between gap-2 p-2 rounded-lg border transition-all ${isActive ? 'bg-violet-500/[0.03] border-violet-500/20' : 'bg-transparent border-white/[0.03] opacity-60 hover:opacity-100 hover:border-white/10'}`}>
                                            <div className="flex items-center gap-2 min-w-0">
                                                <Icon className={`w-3 h-3 shrink-0 ${isActive ? 'text-violet-400' : 'text-white/20'}`} />
                                                <div className="truncate">
                                                    <p className="text-[10px] font-bold text-white/80 leading-none truncate">{item.name}</p>
                                                    <p className="text-[8px] text-white/30 mt-0.5">{(item.price).toLocaleString()} XAF</p>
                                                </div>
                                            </div>
                                            <Switch
                                                checked={isActive}
                                                onCheckedChange={(checked) => toggleExtraForCategory(cat.id, item.id, checked)}
                                                className="scale-75 data-[state=checked]:bg-violet-500"
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                            {items.length === 0 && (
                                <p className="text-[10px] text-white/20 italic">No extras found in shop.</p>
                            )}
                        </div>
                    </div>
                ))}

                {categories.length === 0 && (
                    <div className="text-center py-16 bg-white/[0.01] border border-dashed border-white/5 rounded-2xl">
                        <LayoutGrid className="w-8 h-8 text-white/5 mx-auto mb-3" />
                        <h4 className="text-white/20 text-sm font-bold">No Event Categories</h4>
                        <p className="text-white/10 text-[10px] mt-1">Create one to start building templates.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
