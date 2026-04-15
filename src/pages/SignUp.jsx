import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { Mail, Lock, Music, ArrowRight, Loader2, User, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";

export default function SignUp() {
    const { signUp, user } = useAuth();
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [fullName, setFullName] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    if (user) {
        navigate(user.role === 'admin' ? "/admin" : "/home");
    }

    const handleSignUp = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        try {
            await signUp(email, password, { full_name: fullName });
            // New users are customers by default
            navigate("/home");
        } catch (err) {
            setError(err.message || "Failed to create account. Please try again.");
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center pt-8 sm:pt-20 pb-12 px-6">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-sm"
            >
                <div className="text-center space-y-2 mb-6">
                    <h1 className="text-3xl font-bold text-white tracking-tight">Create account</h1>
                    <p className="text-white/40">Join JnE Events to get notified and book easily</p>
                </div>

                <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-8 backdrop-blur-xl shadow-2xl">
                    <form onSubmit={handleSignUp} className="space-y-5">
                        {error && (
                            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex gap-3 animate-in fade-in zoom-in duration-300">
                                <AlertCircle className="w-5 h-5 shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-white/40 uppercase tracking-widest ml-1">Full Name</label>
                            <div className="relative group">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-amber-400 transition-colors" />
                                <input
                                    type="text"
                                    required
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    className="w-full bg-white/[0.05] border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 text-white placeholder:text-white/10 focus:outline-none focus:border-amber-500/50 transition-all focus:ring-4 focus:ring-amber-500/10"
                                    placeholder="John Doe"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-white/40 uppercase tracking-widest ml-1">Email</label>
                            <div className="relative group">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-amber-400 transition-colors" />
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-white/[0.05] border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 text-white placeholder:text-white/10 focus:outline-none focus:border-amber-500/50 transition-all focus:ring-4 focus:ring-amber-500/10"
                                    placeholder="name@example.com"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-white/40 uppercase tracking-widest ml-1">Password</label>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-amber-400 transition-colors" />
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-white/[0.05] border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 text-white placeholder:text-white/10 focus:outline-none focus:border-amber-500/50 transition-all focus:ring-4 focus:ring-amber-500/10"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-500 hover:to-rose-500 text-white font-semibold rounded-2xl transition-all relative overflow-hidden group active:scale-95 disabled:opacity-50 disabled:active:scale-100 mt-2"
                        >
                            <div className="relative z-10 flex items-center justify-center gap-2">
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Get Started <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></>}
                            </div>
                        </button>
                    </form>

                    <div className="mt-8 pt-8 border-t border-white/5 text-center">
                        <p className="text-white/40 text-sm">
                            Already have an account?{" "}
                            <Link to="/login" className="text-amber-400 font-semibold hover:text-amber-300">Log in</Link>
                        </p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
