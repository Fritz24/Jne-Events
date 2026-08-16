import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import HeroSection from "../components/home/HeroSection";
import FeaturedEvents from "../components/home/FeaturedEvents";
import UpcomingPreview from "../components/home/UpcomingPreview";
import GallerySection from "../components/home/GallerySection";
import RentalsPromoSection from "../components/home/RentalsPromoSection";
import NewsletterSection from "../components/home/NewsletterSection";
import SEO from "../components/common/SEO";

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
    .filter((e) => (e.status === "upcoming" || !e.status) && new Date(e.date) >= now && !e.is_recurring)
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  const featuredEvents = upcomingEvents.filter((e) => e.featured).slice(0, 3);
  const nextUpEvents = upcomingEvents.filter((e) => !e.featured).slice(0, 5);

  // If no featured, show first 3 upcoming
  const displayFeatured = featuredEvents.length > 0 ? featuredEvents : upcomingEvents.slice(0, 3);

  return (
    <div>
      <SEO
        description="Experience the best night outs with JNE Events. From premium movie nights to live music, exclusive gatherings, and equipment rentals, find your next experience here."
        keywords={["social events", "nightlife", "movie tickets", "equipment rental", "sound system rental", "projector rental", "event staff"]}
      />
      <HeroSection />
      <FeaturedEvents events={displayFeatured} isLoading={isLoading} />
      <UpcomingPreview events={nextUpEvents} />
      <RentalsPromoSection />
      <GallerySection />
      <NewsletterSection />
    </div>
  );
}