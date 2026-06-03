import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Link } from "react-router-dom";
import { Images, ArrowRight, Image as ImageIcon } from "lucide-react";
import { useLang } from "@/lib/LanguageContext";

export default function GallerySection() {
  const { t } = useLang();

  const { data: albums = [] } = useQuery({
    queryKey: ["public_albums_preview"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('jne_settings')
        .select('value')
        .eq('key', 'albums')
        .maybeSingle();

      if (error) throw error;
      const value = data?.value;
      return Array.isArray(value) ? value : [];
    }
  });

  // Only show the section if there are actually albums to preview
  if (albums.length === 0) return null;

  // Take up to 3 albums for the preview
  const previewAlbums = albums.slice(0, 3);

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 border-t border-white/5">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-12">
        <div>
          <p className="text-sm font-semibold text-violet-400 mb-2 tracking-wider uppercase">{t.memories}</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight flex items-center gap-3">
            <Images className="w-8 h-8 text-violet-400" />
            {t.pastNightouts}
          </h2>
          <p className="text-white/40 mt-3 max-w-lg">{t.gallerySubtitle}</p>
        </div>
        <Link 
          to="/albums"
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium transition-all group shrink-0"
        >
          {t.exploreAllMemories}
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {previewAlbums.map((album) => (
          <Link
            key={album.id}
            to="/albums"
            className="group block"
          >
            <div className="relative aspect-[4/3] rounded-[1.5rem] overflow-hidden bg-white/5 border border-white/5 transition-all duration-500 group-hover:scale-[1.02] group-hover:shadow-2xl shadow-black/50">
              {album.coverImage ? (
                <img 
                  src={album.coverImage} 
                  alt={album.title} 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center opacity-20">
                  <ImageIcon className="w-12 h-12 text-white" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80 group-hover:opacity-90 transition-opacity"></div>
              
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <h3 className="text-xl font-bold text-white tracking-tight">{album.title}</h3>
                <p className="text-sm text-white/50 mt-1 font-medium">{album.images?.length || 0} {t.photos}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}