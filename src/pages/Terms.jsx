import SEO from "../components/common/SEO";
import { useLang } from "@/lib/LanguageContext";
import { Gavel, AlertTriangle, CreditCard, UserCheck } from "lucide-react";

export default function Terms() {
    const { t } = useLang();

    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
            <SEO
                title={t.termsTitle}
                description={t.termsTicketingIntro}
            />

            <div className="text-center mb-16">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-500/10 mb-6">
                    <Gavel className="w-8 h-8 text-amber-400" />
                </div>
                <h1 className="text-4xl font-bold text-white mb-4">{t.termsTitle}</h1>
                <p className="text-white/40">{t.lastUpdated}</p>
            </div>

            <div className="prose prose-invert max-w-none space-y-12">
                <section>
                    <div className="flex items-center gap-3 mb-4">
                        <CreditCard className="w-5 h-5 text-amber-400" />
                        <h2 className="text-2xl font-semibold text-white m-0">{t.termsTicketingTitle}</h2>
                    </div>
                    <p className="text-white/60 leading-relaxed">
                        {t.termsTicketingIntro}
                    </p>
                    <ul className="list-disc pl-6 text-white/50 space-y-2">
                        <li>{t.termsTicketing1}</li>
                        <li>{t.termsTicketing2}</li>
                        <li>{t.termsTicketing3}</li>
                    </ul>
                </section>

                <section>
                    <div className="flex items-center gap-3 mb-4">
                        <UserCheck className="w-5 h-5 text-amber-400" />
                        <h2 className="text-2xl font-semibold text-white m-0">{t.termsAttendanceTitle}</h2>
                    </div>
                    <p className="text-white/60 leading-relaxed">
                        {t.termsAttendanceIntro}
                    </p>
                    <ul className="list-disc pl-6 text-white/50 space-y-2">
                        <li>{t.termsAttendance1}</li>
                        <li>{t.termsAttendance2}</li>
                        <li>{t.termsAttendance3}</li>
                    </ul>
                </section>

                <section>
                    <div className="flex items-center gap-3 mb-4">
                        <AlertTriangle className="w-5 h-5 text-amber-400" />
                        <h2 className="text-2xl font-semibold text-white m-0">{t.termsLiabilityTitle}</h2>
                    </div>
                    <p className="text-white/60 leading-relaxed">
                        {t.termsLiabilityIntro}
                    </p>
                    <ul className="list-disc pl-6 text-white/50 space-y-2">
                        <li>{t.termsLiability1}</li>
                        <li>{t.termsLiability2}</li>
                        <li>{t.termsLiability3}</li>
                    </ul>
                </section>

                <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-8 mt-12 text-center">
                    <h3 className="text-lg font-bold text-white mb-2 uppercase tracking-widest">{t.legalJurisdiction}</h3>
                    <p className="text-white/50 text-sm m-0">
                        {t.termsJurisdiction}
                    </p>
                </div>
            </div>
        </div>
    );
}
