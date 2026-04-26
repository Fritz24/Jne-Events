import SEO from "../components/common/SEO";
import { useLang } from "@/lib/LanguageContext";
import { Gavel, AlertTriangle, CreditCard, UserCheck } from "lucide-react";

export default function Terms() {
    const { t } = useLang();

    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
            <SEO
                title="Terms of Service"
                description="Terms and Conditions for JNE Events. Ticketing, event attendance, and user responsibility."
            />

            <div className="text-center mb-16">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-500/10 mb-6">
                    <Gavel className="w-8 h-8 text-amber-400" />
                </div>
                <h1 className="text-4xl font-bold text-white mb-4">Terms of Service</h1>
                <p className="text-white/40">Last Updated: April 25, 2026</p>
            </div>

            <div className="prose prose-invert max-w-none space-y-12">
                <section>
                    <div className="flex items-center gap-3 mb-4">
                        <CreditCard className="w-5 h-5 text-amber-400" />
                        <h2 className="text-2xl font-semibold text-white m-0">1. Ticketing & Payments</h2>
                    </div>
                    <p className="text-white/60 leading-relaxed">
                        By booking a ticket on JNE Events, you agree to the following:
                    </p>
                    <ul className="list-disc pl-6 text-white/50 space-y-2">
                        <li><strong>Non-Refundability:</strong> All ticket sales are final. Refunds are only issued if the event is cancelled and not rescheduled.</li>
                        <li><strong>Ticket Integrity:</strong> Tickets are unique to the booking ID. Any attempt to duplicate or forge tickets will result in immediate voiding without refund.</li>
                        <li><strong>Reservation Fees:</strong> Small platform fees may apply and are clearly displayed at the time of booking.</li>
                    </ul>
                </section>

                <section>
                    <div className="flex items-center gap-3 mb-4">
                        <UserCheck className="w-5 h-5 text-amber-400" />
                        <h2 className="text-2xl font-semibold text-white m-0">2. Event Attendance</h2>
                    </div>
                    <p className="text-white/60 leading-relaxed">
                        Attendance is subject to the rules and regulations of the specific event venue:
                    </p>
                    <ul className="list-disc pl-6 text-white/50 space-y-2">
                        <li><strong>Identification:</strong> You may be required to show a valid ID at the entrance to verify your age or identity.</li>
                        <li><strong>Right of Refusal:</strong> Venue owners and event organizers reserve the right to refuse entry for inappropriate behavior or failure to comply with safety protocols.</li>
                        <li><strong>Arrival:</strong> We recommend arriving at least 30 minutes before the scheduled start time.</li>
                    </ul>
                </section>

                <section>
                    <div className="flex items-center gap-3 mb-4">
                        <AlertTriangle className="w-5 h-5 text-amber-400" />
                        <h2 className="text-2xl font-semibold text-white m-0">3. Liability Disclaimer</h2>
                    </div>
                    <p className="text-white/60 leading-relaxed">
                        JNE Events acts as a ticketing and promotion platform. We are not responsible for:
                    </p>
                    <ul className="list-disc pl-6 text-white/50 space-y-2">
                        <li>Any loss, injury, or damage occurring during the event at the venue.</li>
                        <li>Changes made to the performance or movie schedule by the venue organizers.</li>
                        <li>Items lost or stolen during an event.</li>
                    </ul>
                </section>

                <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-8 mt-12 text-center">
                    <h3 className="text-lg font-bold text-white mb-2 uppercase tracking-widest">Legal Jurisdiction</h3>
                    <p className="text-white/50 text-sm m-0">
                        These terms are governed by the laws of the Republic of Cameroon. Any disputes shall be subject to the exclusive jurisdiction of the courts in Yaoundé or Douala.
                    </p>
                </div>
            </div>
        </div>
    );
}
