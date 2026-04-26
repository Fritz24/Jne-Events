import SEO from "../components/common/SEO";
import { useLang } from "@/lib/LanguageContext";
import { Shield, Lock, Eye, FileText } from "lucide-react";

export default function Privacy() {
    const { t } = useLang();

    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
            <SEO
                title="Privacy Policy"
                description="Privacy Policy and Data Protection for JNE Events. Learn how we handle your information securely."
            />

            <div className="text-center mb-16">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-violet-500/10 mb-6">
                    <Shield className="w-8 h-8 text-violet-400" />
                </div>
                <h1 className="text-4xl font-bold text-white mb-4">Privacy Policy</h1>
                <p className="text-white/40">Last Updated: April 25, 2026</p>
            </div>

            <div className="prose prose-invert max-w-none space-y-12">
                <section>
                    <div className="flex items-center gap-3 mb-4">
                        <Eye className="w-5 h-5 text-violet-400" />
                        <h2 className="text-2xl font-semibold text-white m-0">Information We Collect</h2>
                    </div>
                    <p className="text-white/60 leading-relaxed">
                        At JNE Events, we value your privacy. To provide our ticketing and event discovery services in Cameroon, we collect:
                    </p>
                    <ul className="list-disc pl-6 text-white/50 space-y-2">
                        <li><strong>Personal Details:</strong> Name, phone number (for WhatsApp ticket delivery), and email address.</li>
                        <li><strong>Transaction Data:</strong> Booking IDs and ticket purchase records.</li>
                        <li><strong>Usage Data:</strong> Location information to show you events in Douala, Yaoundé, and other cities.</li>
                    </ul>
                </section>

                <section>
                    <div className="flex items-center gap-3 mb-4">
                        <Lock className="w-5 h-5 text-violet-400" />
                        <h2 className="text-2xl font-semibold text-white m-0">How We Use Your Data</h2>
                    </div>
                    <p className="text-white/60 leading-relaxed">
                        Your data is used solely for the following purposes:
                    </p>
                    <ul className="list-disc pl-6 text-white/50 space-y-2">
                        <li>Generating and delivering e-tickets via WhatsApp.</li>
                        <li>Verifying ticket validity at event venue entrances.</li>
                        <li>Sending updates regarding changes to event schedules or venues.</li>
                        <li>Improving local search relevance for activities in your city.</li>
                    </ul>
                </section>

                <section>
                    <div className="flex items-center gap-3 mb-4">
                        <FileText className="w-5 h-5 text-violet-400" />
                        <h2 className="text-2xl font-semibold text-white m-0">Data Security & Third Parties</h2>
                    </div>
                    <p className="text-white/60 leading-relaxed">
                        We do not sell, trade, or rent your personal identification information to others. We may share generic aggregated demographic information not linked to any personal identification information with our business partners and trusted affiliates for the purposes outlined above.
                    </p>
                    <div className="bg-white/5 border border-white/10 rounded-xl p-6 mt-6">
                        <p className="text-sm text-violet-300 font-medium italic m-0">
                            Note: When you use the WhatsApp booking feature, your interaction is subject to WhatsApp's own privacy policy and end-to-end encryption.
                        </p>
                    </div>
                </section>

                <section className="pt-10 border-t border-white/5">
                    <h2 className="text-xl font-semibold text-white mb-4">Contact Us</h2>
                    <p className="text-white/50 text-sm">
                        If you have any questions about this Privacy Policy, please contact us via our official WhatsApp channel or email.
                    </p>
                </section>
            </div>
        </div>
    );
}
