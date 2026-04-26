import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import HeroSection from "../components/home/HeroSection";
import FeaturedEvents from "../components/home/FeaturedEvents";
import UpcomingPreview from "../components/home/UpcomingPreview";
import GallerySection from "../components/home/GallerySection";
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
  const upcomingEvents = events.filter(
    (e) => e.status === "upcoming" && new Date(e.date) >= now
  );
  const featuredEvents = upcomingEvents.filter((e) => e.featured).slice(0, 3);
  const nextUpEvents = upcomingEvents.filter((e) => !e.featured).slice(0, 5);

  // If no featured, show first 3 upcoming
  const displayFeatured = featuredEvents.length > 0 ? featuredEvents : upcomingEvents.slice(0, 3);

  return (
    <div>
      <SEO
        title="Exclusive Nightouts & Community Events"
        description="Experience the best night outs with JNE Events. From premium movie nights to live music and exclusive gatherings, find your next unforgettable experience here."
        keywords={["social events", "nightlife", "movie tickets", "live entertainment", "weekend plans", "cinema experience", "outdoor cinema", "community gatherings"]}
      />
      <HeroSection />
      <FeaturedEvents events={displayFeatured} isLoading={isLoading} />
      <UpcomingPreview events={nextUpEvents} />
      <GallerySection />
      <NewsletterSection />
    </div>
  );
}