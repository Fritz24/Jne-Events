import { useState } from "react";
import { Mail, Sparkles, CheckCircle2, MessageCircle, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useLang } from "@/lib/LanguageContext";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/lib/supabase";

function WhatsAppIcon({ className = "w-6 h-6" }) {
    return (
        <svg viewBox="0 0 48 48" className={className} fill="none">
            <circle cx="24" cy="24" r="24" fill="#25D366" />
            <path
                fill="white"
                fillRule="evenodd"
                clipRule="evenodd"
                d="M24 10C16.268 10 10 16.268 10 24C10 26.78 10.814 29.37 12.223 31.547L10.8 37.2L16.634 35.808C18.736 37.108 21.28 37.867 24 37.867C31.732 37.867 38 31.599 38 23.867C38 16.135 31.732 10 24 10ZM24 12.4C30.407 12.4 35.6 17.593 35.6 24C35.6 30.407 30.407 35.6 24 35.6C21.69 35.6 19.537 34.927 17.727 33.766L17.295 33.489L13.433 34.409L14.372 30.648L14.07 30.203C12.83 28.375 12.133 26.236 12.133 24C12.133 17.593 17.326 12.4 24 12.4ZM19.255 16.8C18.995 16.8 18.575 16.898 18.225 17.278C17.875 17.658 16.885 18.588 16.885 20.478C16.885 22.368 18.26 24.208 18.45 24.468C18.64 24.728 21.11 28.728 25.01 30.258C28.25 31.528 28.91 31.278 29.62 31.218C30.33 31.158 31.91 30.278 32.24 29.348C32.57 28.418 32.57 27.618 32.47 27.448C32.37 27.278 32.11 27.178 31.72 26.988C31.33 26.798 29.41 25.848 29.05 25.718C28.69 25.588 28.43 25.528 28.17 25.918C27.91 26.308 27.17 27.178 26.94 27.448C26.71 27.718 26.48 27.748 26.09 27.558C25.7 27.368 24.445 26.955 22.955 25.628C21.795 24.593 21.01 23.318 20.78 22.928C20.55 22.538 20.755 22.327 20.95 22.134C21.125 21.96 21.34 21.678 21.535 21.453C21.73 21.228 21.795 21.068 21.925 20.808C22.055 20.548 21.99 20.318 21.89 20.128C21.79 19.938 21.01 18.028 20.685 17.248C20.37 16.488 20.05 16.593 19.81 16.583C19.58 16.573 19.32 16.573 19.06 16.573L19.255 16.8Z"
            />
        </svg>
    );
}

export default function NewsletterSection() {
    const { t } = useLang();
    const { user } = useAuth();
    const [email, setEmail] = useState("");
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const { error: subError } = await supabase
                .from('jne_subscribers')
                .upsert({ email, status: 'active', source: 'home_newsletter' });

            if (subError) throw subError;

            setSubmitted(true);
            setEmail("");
        } catch (err) {
            console.error("Subscription error:", err);
            setError(t.newsletterError);
            setLoading(false);
        }
    };

    const whatsappLink = "https://chat.whatsapp.com/HPJ5NpYkswNKAgtr9cPt8y?mode=gi_t";

    return (
        <section className="py-20 relative overflow-hidden">
            <div className="absolute inset-0 bg-violet-600/5 -z-10" />
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="relative p-8 sm:p-12 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-sm overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/20 rounded-full blur-[80px]" />
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-amber-500/20 rounded-full blur-[80px]" />

                    <div className="relative z-10 text-center space-y-8">
                        <div className="inline-flex p-2.5 rounded-2xl bg-[#25D366]/10 text-[#25D366] mb-2">
                            {user ? <WhatsAppIcon className="w-7 h-7" /> : <Sparkles className="w-6 h-6 text-violet-400" />}
                        </div>

                        <div className="space-y-3">
                            <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
                                {user ? t.newsletterTitleUser : t.newsletterTitleGuest}
                            </h2>
                            <p className="text-white/50 text-lg max-w-xl mx-auto">
                                {user ? t.newsletterDescUser : t.newsletterDescGuest}
                            </p>
                        </div>

                        <AnimatePresence mode="wait">
                            {user ? (
                                <motion.div
                                    key="community"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="max-w-md mx-auto"
                                >
                                    <a
                                        href={whatsappLink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="group relative flex items-center justify-between p-4 rounded-2xl bg-[#25D366]/10 border border-[#25D366]/25 hover:border-[#25D366]/50 transition-all overflow-hidden shadow-lg shadow-black/20"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 shadow-md shadow-[#25D366]/30">
                                                <WhatsAppIcon className="w-11 h-11" />
                                            </div>
                                            <div className="text-left">
                                                <p className="font-bold text-[#25D366] group-hover:text-emerald-300 transition-colors">{t.whatsappCommunity}</p>
                                                <p className="text-xs text-white/50">{t.exclusiveAccess}</p>
                                            </div>
                                        </div>
                                        <ArrowRight className="w-5 h-5 text-[#25D366] group-hover:translate-x-1 transition-transform" />
                                    </a>
                                </motion.div>
                            ) : !submitted ? (
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
                                            placeholder={t.emailPlaceholder}
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-32 text-white placeholder:text-white/20 focus:outline-none focus:border-violet-500/50 transition-all focus:ring-4 focus:ring-violet-500/10"
                                        />
                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="absolute right-2 px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-medium transition-all transform active:scale-95 disabled:opacity-50 disabled:active:scale-100"
                                        >
                                            {loading ? t.joining : t.joinUs}
                                        </button>
                                    </div>
                                    {error && <p className="text-red-400 text-xs mt-3">{error}</p>}
                                </motion.form>
                            ) : (
                                <motion.div
                                    key="success"
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="flex items-center justify-center gap-3 py-4 text-emerald-400 font-medium"
                                >
                                    <CheckCircle2 className="w-6 h-6" />
                                    <span>{t.newsletterSuccess}</span>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <p className="text-[10px] uppercase tracking-widest text-white/20 font-medium pt-4">
                            {t.newsletterFooter}
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
}
