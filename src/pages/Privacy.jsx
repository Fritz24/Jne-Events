import SEO from "../components/common/SEO";
import { useLang } from "@/lib/LanguageContext";
import { Shield, Lock, Eye, FileText } from "lucide-react";

export default function Privacy() {
    const { t } = useLang();

    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
            <SEO
                title={t.privacyTitle}
                description={t.privacyCollectIntro}
            />

            <div className="text-center mb-16">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-violet-500/10 mb-6">
                    <Shield className="w-8 h-8 text-violet-400" />
                </div>
                <h1 className="text-4xl font-bold text-white mb-4">{t.privacyTitle}</h1>
                <p className="text-white/40">{t.lastUpdated}</p>
            </div>

            <div className="prose prose-invert max-w-none space-y-12">
                <section>
                    <div className="flex items-center gap-3 mb-4">
                        <Eye className="w-5 h-5 text-violet-400" />
                        <h2 className="text-2xl font-semibold text-white m-0">{t.privacyCollectTitle}</h2>
                    </div>
                    <p className="text-white/60 leading-relaxed">
                        {t.privacyCollectIntro}
                    </p>
                    <ul className="list-disc pl-6 text-white/50 space-y-2">
                        <li>{t.privacyCollect1}</li>
                        <li>{t.privacyCollect2}</li>
                        <li>{t.privacyCollect3}</li>
                    </ul>
                </section>

                <section>
                    <div className="flex items-center gap-3 mb-4">
                        <Lock className="w-5 h-5 text-violet-400" />
                        <h2 className="text-2xl font-semibold text-white m-0">{t.privacyUseTitle}</h2>
                    </div>
                    <p className="text-white/60 leading-relaxed">
                        {t.privacyUseIntro}
                    </p>
                    <ul className="list-disc pl-6 text-white/50 space-y-2">
                        <li>{t.privacyUse1}</li>
                        <li>{t.privacyUse2}</li>
                        <li>{t.privacyUse3}</li>
                        <li>{t.privacyUse4}</li>
                    </ul>
                </section>

                <section>
                    <div className="flex items-center gap-3 mb-4">
                        <FileText className="w-5 h-5 text-violet-400" />
                        <h2 className="text-2xl font-semibold text-white m-0">{t.privacySecurityTitle}</h2>
                    </div>
                    <p className="text-white/60 leading-relaxed">
                        {t.privacySecurityText}
                    </p>
                    <div className="bg-white/5 border border-white/10 rounded-xl p-6 mt-6">
                        <p className="text-sm text-violet-300 font-medium italic m-0">
                            {t.privacyWhatsappNote}
                        </p>
                    </div>
                </section>

                <section className="pt-10 border-t border-white/5">
                    <h2 className="text-xl font-semibold text-white mb-4">{t.contactUs}</h2>
                    <p className="text-white/50 text-sm">
                        {t.privacyContact}
                    </p>
                </section>
            </div>
        </div>
    );
}
