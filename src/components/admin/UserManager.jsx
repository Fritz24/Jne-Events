import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Search, Loader2, Shield, User, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function UserManager() {
    const [searchTerm, setSearchTerm] = useState("");
    const queryClient = useQueryClient();

    const { data: users = [], isLoading } = useQuery({
        queryKey: ["users"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .order('id', { ascending: false });
            if (error) throw error;
            return data || [];
        },
    });

    const toggleAdminMutation = useMutation({
        mutationFn: async ({ id, is_super_admin }) => {
            const { error } = await supabase
                .from('users')
                .update({ is_super_admin: !is_super_admin })
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
    });

    const deleteMutation = useMutation({
        mutationFn: async (id) => {
            const { error } = await supabase
                .from('users')
                .delete()
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
    });

    const filteredUsers = users.filter(user => {
        const matchesSearch = (user.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (user.email?.toLowerCase() || '').includes(searchTerm.toLowerCase());

        // Filter out users who belong strictly to OTHER platforms and not events
        const platforms = Array.isArray(user.active_platforms) ? user.active_platforms : [];
        // We only show them here if they are 'events' users, OR if their platforms array is totally empty (meaning they created an account here before the tagging fix)
        const isEventsRelevant = platforms.includes('events') || platforms.length === 0;

        return matchesSearch && isEventsRelevant;
    });

    if (isLoading) {
        return (
            <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-violet-400" />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-xl font-bold text-white">Events Platform Users</h2>
                    <p className="text-sm text-white/50 mt-1">Manage users who are registered to the Events platform.</p>
                </div>
                <div className="relative w-full sm:w-auto">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                    <Input
                        placeholder="Search by name or email..."
                        className="pl-9 bg-white/5 border-white/10 text-white w-full sm:w-[300px]"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-white/10 text-xs font-semibold text-white/50 uppercase tracking-widest bg-white/[0.02]">
                            <th className="p-4 rounded-tl-xl">User</th>
                            <th className="p-4">Contact</th>
                            <th className="p-4">Platforms</th>
                            <th className="p-4">Role</th>
                            <th className="p-4 text-right rounded-tr-xl">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10 text-sm">
                        {filteredUsers.length === 0 ? (
                            <tr>
                                <td colSpan="5" className="p-8 text-center text-white/40">No users found.</td>
                            </tr>
                        ) : (
                            filteredUsers.map((u) => {
                                const platforms = Array.isArray(u.active_platforms) ? u.active_platforms : [];
                                const isEventsUser = platforms.includes('events');

                                return (
                                    <tr key={u.id} className="hover:bg-white/[0.02] transition-colors group">
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 flex items-center justify-center shrink-0 border border-white/10">
                                                    {u.name ? u.name.charAt(0).toUpperCase() : <User className="w-5 h-5 text-white/50" />}
                                                </div>
                                                <div className="font-medium text-white max-w-[150px] truncate">
                                                    {u.name || "Unknown User"}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4 text-white/70">
                                            <div className="flex flex-col gap-1">
                                                <span className="truncate max-w-[200px]">{u.email || "-"}</span>
                                                {u.phone && <span className="text-xs text-white/40">{u.phone}</span>}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex flex-wrap gap-1.5">
                                                {platforms.map(p => (
                                                    <span key={p} className={`px-2 py-0.5 rounded-md text-[10px] font-medium uppercase tracking-wider ${p === 'events' ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30' : 'bg-white/10 text-white/60 border border-white/20'}`}>
                                                        {p}
                                                    </span>
                                                ))}
                                                {platforms.length === 0 && (
                                                    <span className="text-xs text-white/30 italic">None</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            {u.is_super_admin ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-500/20 text-violet-300 text-xs font-medium border border-violet-500/30">
                                                    <Shield className="w-3 h-3" /> Admin
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 text-white/50 text-xs font-medium border border-white/10">
                                                    <User className="w-3 h-3" /> Customer
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {!isEventsUser && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => togglePlatformMutation.mutate({ id: u.id, platforms: [...platforms, 'events'] })}
                                                        className="h-8 bg-violet-500/10 text-violet-300 border-violet-500/20 hover:bg-violet-500/20 hover:text-white shrink-0 text-xs"
                                                    >
                                                        Tag to Events
                                                    </Button>
                                                )}
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => toggleAdminMutation.mutate({ id: u.id, is_super_admin: u.is_super_admin })}
                                                    className="h-8 bg-white/5 border-white/10 hover:bg-white/10 hover:text-white shrink-0 text-xs"
                                                >
                                                    {u.is_super_admin ? "Remove Admin" : "Make Admin"}
                                                </Button>
                                                <Button
                                                    variant="destructive"
                                                    size="icon"
                                                    onClick={() => {
                                                        if (window.confirm("Are you sure you want to delete this user from the entire ecosystem?")) {
                                                            deleteMutation.mutate(u.id);
                                                        }
                                                    }}
                                                    className="h-8 w-8 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white shrink-0"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
