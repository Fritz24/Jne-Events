import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import HeroSection from "../components/home/HeroSection";
import ThisWeekendSection from "../components/home/ThisWeekendSection";
import FeaturedEvents from "../components/home/FeaturedEvents";
import UpcomingPreview from "../components/home/UpcomingPreview";
import GallerySection from "../components/home/GallerySection";
import RentalsPromoSection from "../components/home/RentalsPromoSection";
import NewsletterSection from "../components/home/NewsletterSection";
import SEO from "../components/common/SEO";

import { isEventThisWeekend } from "@/utils/dateUtils";

export default function Home() {
  const { data: events = [], isLoading } = useQuery({
    queryKey: ["events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('jne_events')
        .select('*')
        .order('date', { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const now = new Date();
  const upcomingEvents = events
    .filter((e) => (e.status === "upcoming" || !e.status) && new Date(e.date) >= now)
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  // 1. Events happening this weekend (Friday - Sunday)
  const weekendEvents = upcomingEvents.filter((e) => isEventThisWeekend(e.date));

  // 2. Events marked as featured (excluding any already shown in this weekend)
  const weekendIds = new Set(weekendEvents.map((e) => e.id));
  const nonWeekendUpcoming = upcomingEvents.filter((e) => !weekendIds.has(e.id));

  const explicitlyFeatured = nonWeekendUpcoming.filter((e) => e.featured);
  const featuredEvents = explicitlyFeatured.length > 0
    ? explicitlyFeatured.slice(0, 3)
    : nonWeekendUpcoming.slice(0, 3);

  // 3. Other upcoming events (not in this weekend, and not in featured)
  const featuredIds = new Set(featuredEvents.map((e) => e.id));
  const nextUpEvents = nonWeekendUpcoming.filter((e) => !featuredIds.has(e.id)).slice(0, 5);

  return (
    <div>
      <SEO
        description="Experience the best night outs with JNE Events. From premium movie nights to live music, exclusive gatherings, and equipment rentals, find your next experience here."
        keywords={["social events", "nightlife", "movie tickets", "equipment rental", "sound system rental", "projector rental", "event staff"]}
      />
      <HeroSection />
      <ThisWeekendSection events={weekendEvents} />
      <FeaturedEvents events={featuredEvents} isLoading={isLoading} />
      <UpcomingPreview events={nextUpEvents} />
      <RentalsPromoSection />
      <GallerySection />
      <NewsletterSection />
    </div>
  );
}