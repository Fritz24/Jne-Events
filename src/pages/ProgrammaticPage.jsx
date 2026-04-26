import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import EventCard from "../components/events/EventCard";
import SEO from "../components/common/SEO";
import { Loader2, MapPin, Tag, Info, ChevronRight } from "lucide-react";
import { useLang } from "@/lib/LanguageContext";

export default function ProgrammaticPage({ type = "city" }) {
    const { value, slug } = useParams();
    const { t } = useLang();

    // Normalize value (handle slugs like 'activities-to-do-in-yaounde')
    const displayValue = slug
        ? slug.split('-').pop().charAt(0).toUpperCase() + slug.split('-').pop().slice(1)
        : value;

    const { data: events = [], isLoading } = useQuery({
        queryKey: ["events", type, value || slug],
        queryFn: async () => {
            let query = supabase.from('jne_events').select('*');

            if (type === "city") {
                query = query.ilike('city', `%${value}%`);
            } else if (type === "category") {
                query = query.eq('type', value);
            } else if (type === "discover") {
                const cityMatch = slug.toLowerCase().match(/in-([a-z]+)/);
                if (cityMatch) {
                    query = query.ilike('city', `%${cityMatch[1]}%`);
                }
            }

            const { data, error } = await query.order('date', { ascending: true });
            if (error) throw error;
            return data || [];
        },
    });

    const pageTitle = type === "city"
        ? `Events in ${displayValue}`
        : type === "category"
            ? `${displayValue === 'movie_night' ? 'Movie Nights' : 'Music Events'}`
            : `Activities to do in ${displayValue}`;

    const description = type === "discover"
        ? `Looking for the best things to do in ${displayValue}? Check out the latest movie nights, live performances, and exclusive gatherings organized by JNE Events in ${displayValue}, Cameroon.`
        : `Browse all upcoming ${pageTitle}. Book your tickets online for premium experiences and night outs in Cameroon.`;

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <SEO
                title={pageTitle}
                description={description}
                keywords={[displayValue, "Cameroon events", "tickets", "nightlife", "things to do"]}
            />

            <nav className="flex items-center gap-2 text-xs font-medium text-white/30 mb-8 overflow-x-auto whitespace-nowrap pb-2">
                <Link to="/home" className="hover:text-white transition-colors uppercase tracking-widest">Home</Link>
                <ChevronRight className="w-3 h-3 shrink-0" />
                <Link to="/events" className="hover:text-white transition-colors uppercase tracking-widest">Events</Link>
                <ChevronRight className="w-3 h-3 shrink-0" />
                <span className="text-violet-400 uppercase tracking-widest">{pageTitle}</span>
            </nav>

            <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <div className="flex items-center gap-2 text-violet-400 mb-2 font-medium">
                        {type === "city" ? <MapPin className="w-4 h-4" /> : type === "category" ? <Tag className="w-4 h-4" /> : <Info className="w-4 h-4" />}
                        <span className="uppercase tracking-widest text-xs">Explore Local</span>
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">{pageTitle}</h1>
                    <p className="text-white/40 max-w-2xl">{description}</p>
                </div>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {events.map((event, i) => (
                        <EventCard key={event.id} event={event} index={i} />
                    ))}
                    {events.length === 0 && (
                        <div className="col-span-full text-center py-20 border border-dashed border-white/10 rounded-3xl">
                            <p className="text-white/30 text-lg">No events found for this selection yet.</p>
                            <p className="text-white/20 text-sm mt-1">Check back soon for new updates!</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
