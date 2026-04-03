import { useState } from "react";
import { Mail, Sparkles, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useLang } from "@/lib/LanguageContext";

export default function NewsletterSection() {
    const { t } = useLang();
    const [email, setEmail] = useState("");
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        // Simulate API call for newsletter
        await new Promise(r => setTimeout(r, 1000));

        setSubmitted(true);
        setLoading(false);
        setEmail("");
    };

    return (
        <section className="py-20 relative overflow-hidden">
            <div className="absolute inset-0 bg-violet-600/5 -z-10" />
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="relative p-8 sm:p-12 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-sm overflow-hidden">
                    {/* Background Gradient */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/20 rounded-full blur-[80px]" />
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-amber-500/20 rounded-full blur-[80px]" />

                    <div className="relative z-10 text-center space-y-8">
                        <div className="inline-flex p-3 rounded-2xl bg-violet-500/10 text-violet-400 mb-2">
                            <Sparkles className="w-6 h-6" />
                        </div>

                        <div className="space-y-3">
                            <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
                                Don’t miss any night out
                            </h2>
                            <p className="text-white/50 text-lg max-w-xl mx-auto">
                                Get notified about upcoming movie nights, music events, and secret sessions before they sell out.
                            </p>
                        </div>

                        <AnimatePresence mode="wait">
                            {!submitted ? (
                                <motion.form
                                    key="form"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    onSubmit={handleSubmit}
                                    className="max-w-md mx-auto relative group"
                                >
                                    <div className="relative flex items-center">
                                        <div className="absolute left-4 text-white/30 pointer-events-none transition-colors group-focus-within:text-violet-400">
                                            <Mail className="w-5 h-5" />
                                        </div>
                                        <input
                                            type="email"
                                            required
                                            placeholder="Enter your email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-32 text-white placeholder:text-white/20 focus:outline-none focus:border-violet-500/50 transition-all focus:ring-4 focus:ring-violet-500/10"
                                        />
                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="absolute right-2 px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-medium transition-all transform active:scale-95 disabled:opacity-50 disabled:active:scale-100"
                                        >
                                            {loading ? "Joining..." : "Join Us"}
                                        </button>
                                    </div>
                                </motion.form>
                            ) : (
                                <motion.div
                                    key="success"
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="flex items-center justify-center gap-3 py-4 text-emerald-400 font-medium"
                                >
                                    <CheckCircle2 className="w-6 h-6" />
                                    <span>You're on the list! See you soon.</span>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <p className="text-[10px] uppercase tracking-widest text-white/20 font-medium pt-4">
                            Weekly updates • Instant booking • No spam
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
}
