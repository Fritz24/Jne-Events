import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import {
    Mail, Calendar, Trash2, Search,
    Download, Copy, Check, Loader2
} from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function SubscriberManager() {
    const [search, setSearch] = useState("");
    const [copied, setCopied] = useState(false);
    const queryClient = useQueryClient();

    const { data: subscribers = [], isLoading } = useQuery({
        queryKey: ["subscribers"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('jne_subscribers')
                .select('*')
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data || [];
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (id) => {
            const { error } = await supabase.from('jne_subscribers').delete().eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["subscribers"] })
    });

    const filtered = subscribers.filter(s =>
        s.email.toLowerCase().includes(search.toLowerCase())
    );

    const copyAllEmails = () => {
        const emails = filtered.map(s => s.email).join(", ");
        navigator.clipboard.writeText(emails);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="relative flex-1 w-full max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                    <Input
                        placeholder="Search emails..."
                        className="bg-white/5 border-white/10 pl-10 text-white"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                    <Button
                        variant="outline"
                        onClick={copyAllEmails}
                        className="flex-1 sm:flex-none bg-white/5 border-white/10 text-white hover:bg-white/10"
                    >
                        {copied ? <Check className="w-4 h-4 mr-2 text-emerald-400" /> : <Copy className="w-4 h-4 mr-2" />}
                        {copied ? "Copied!" : "Copy All Emails"}
                    </Button>
                </div>
            </div>

            <div className="rounded-2xl bg-white/[0.03] border border-white/[0.08] overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-white/[0.02] text-[10px] uppercase tracking-widest text-white/30 font-bold border-b border-white/[0.08]">
                                <th className="px-6 py-4">Subscriber Email</th>
                                <th className="px-6 py-4 text-center">Date Joined</th>
                                <th className="px-6 py-4 text-center">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.04]">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-white/20 italic">
                                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 opacity-50" />
                                        Fetching subscriber list...
                                    </td>
                                </tr>
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-white/20 italic">
                                        No subscribers found
                                    </td>
                                </tr>
                            ) : filtered.map(sub => (
                                <tr key={sub.id} className="hover:bg-white/[0.01] transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center text-violet-400">
                                                <Mail className="w-4 h-4" />
                                            </div>
                                            <span className="text-sm font-medium text-white">{sub.email}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center text-sm text-white/40">
                                        {format(new Date(sub.created_at), "MMM dd, yyyy")}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
                                            <div className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                                            Active
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => deleteMutation.mutate(sub.id)}
                                            className="p-2 rounded-lg hover:bg-red-500/10 text-red-400/40 hover:text-red-400 transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            <p className="text-[10px] text-white/20 italic">
                Total Subscribers: {filtered.length} {search && `(matching "${search}")`}
            </p>
        </div>
    );
}
