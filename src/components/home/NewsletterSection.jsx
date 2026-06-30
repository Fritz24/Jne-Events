import { useState } from "react";
import { Mail, Sparkles, CheckCircle2, MessageCircle, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useLang } from "@/lib/LanguageContext";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/lib/supabase";

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

    const whatsappLink = "https://chat.whatsapp.com/your-group-id";

    return (
        <section className="py-20 relative overflow-hidden">
            <div className="absolute inset-0 bg-violet-600/5 -z-10" />
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="relative p-8 sm:p-12 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-sm overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/20 rounded-full blur-[80px]" />
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-amber-500/20 rounded-full blur-[80px]" />

                    <div className="relative z-10 text-center space-y-8">
                        <div className="inline-flex p-3 rounded-2xl bg-violet-500/10 text-violet-400 mb-2">
                            {user ? <MessageCircle className="w-6 h-6" /> : <Sparkles className="w-6 h-6" />}
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
                                        className="group relative flex items-center justify-between p-4 rounded-2xl bg-violet-600/10 border border-violet-500/20 hover:border-violet-500/40 transition-all overflow-hidden"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-[#25D366] flex items-center justify-center text-white">
                                                <svg 
                                                    viewBox="0 0 24 24" 
                                                    fill="currentColor" 
                                                    className="w-6 h-6"
                                                >
                                                    <path d="M12.031 2C6.479 2 2 6.477 2 12.029c0 1.91.533 3.78 1.543 5.425L2 22l4.708-1.503a9.98 9.98 0 0 0 5.321 1.531c5.551 0 10.03-4.478 10.03-10.029C22.059 6.477 17.582 2 12.031 2zm0 18.05c-1.637 0-3.238-.43-4.64-1.25l-.333-.194-2.772.885.9-.2.721-.23-.217-.34a8.156 8.156 0 0 1-1.238-4.288c0-4.52 3.676-8.2 8.196-8.2 2.19 0 4.248.85 5.797 2.4a8.134 8.134 0 0 1 2.4 5.8c0 4.52-3.678 8.2-8.197 8.2zm4.515-6.177c-.247-.124-1.464-.723-1.691-.806-.226-.083-.393-.124-.557.124-.165.247-.64.806-.784.97-.145.165-.29.185-.537.062a7.514 7.514 0 0 1-1.99-1.229 8.287 8.287 0 0 1-1.378-1.714c-.145-.248-.015-.38.109-.504.112-.112.247-.29.37-.434.125-.145.166-.248.248-.413.083-.165.042-.31-.02-.434-.063-.124-.558-1.343-.765-1.84-.2-.48-.426-.413-.558-.42l-.475-.007c-.165 0-.434.062-.66.31-.227.247-.867.847-.867 2.066 0 1.219.887 2.397 1.01 2.562.124.165 1.745 2.664 4.227 3.732.59.255 1.05.408 1.41.521.593.189 1.133.162 1.56.098.476-.072 1.464-.598 1.67-.1.175.207.5.423.558.82.057.396.057.737.028.862-.029.124-.165.185-.412.062z"/>
                                                </svg>
                                            </div>
                                            <div className="text-left">
                                                <p className="font-bold text-violet-400">{t.whatsappCommunity}</p>
                                                <p className="text-xs text-white/40">{t.exclusiveAccess}</p>
                                            </div>
                                        </div>
                                        <ArrowRight className="w-5 h-5 text-violet-500 group-hover:translate-x-1 transition-transform" />
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
