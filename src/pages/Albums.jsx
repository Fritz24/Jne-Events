import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { formatLocalizedDate } from "@/lib/localize";
import { X, Image as ImageIcon, ChevronLeft, Download } from "lucide-react";
import { useLang } from "@/lib/LanguageContext";

export default function Albums() {
  const { t, lang } = useLang();
  const [selectedAlbum, setSelectedAlbum] = useState(null);
  const [fullscreenImage, setFullscreenImage] = useState(null);

  const { data: albums = [], isLoading } = useQuery({
    queryKey: ["public_albums"],
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

  // Handle escape key to close modals
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (fullscreenImage) setFullscreenImage(null);
        else if (selectedAlbum) setSelectedAlbum(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [fullscreenImage, selectedAlbum]);

  if (isLoading) {
    return (
      <div className="min-h-screen pt-32 pb-20 px-6 sm:px-12 max-w-7xl mx-auto flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-white animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-32 pb-20 px-6 sm:px-12 max-w-7xl mx-auto selection:bg-white/20">
      
      {/* Header */}
      {!selectedAlbum && (
        <div className="mb-16 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-white leading-tight">
            {t.memories}
          </h1>
          <p className="text-lg text-white/50 font-medium max-w-xl">
            {t.albumsSubtitle}
          </p>
        </div>
      )}

      {/* Album Grid View */}
      {!selectedAlbum && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 animate-in fade-in duration-1000 delay-150 fill-mode-both">
          {albums.map((album) => (
            <div 
              key={album.id}
              onClick={() => setSelectedAlbum(album)}
              className="group cursor-pointer flex flex-col gap-4"
            >
              <div className="relative aspect-[4/3] rounded-[2rem] overflow-hidden bg-white/5 border border-white/5 transition-all duration-500 group-hover:scale-[1.02] group-hover:shadow-2xl shadow-black/50">
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
                {/* Glossy overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity"></div>
              </div>
              <div className="px-2">
                <h3 className="text-xl font-bold text-white tracking-tight">{album.title}</h3>
                <p className="text-sm text-white/40 mt-1 font-medium">
                  {album.date ? formatLocalizedDate(album.date, "d MMMM yyyy", lang) : t.unknownDate} • {album.images?.length || 0} {t.photos}
                </p>
              </div>
            </div>
          ))}
          {albums.length === 0 && (
            <div className="col-span-full py-20 text-center text-white/30 text-lg">
              {t.noAlbumsYet}
            </div>
          )}
        </div>
      )}

      {/* Inside an Album View */}
      {selectedAlbum && (
        <div className="animate-in fade-in slide-in-from-right-8 duration-500">
          <div className="flex items-center justify-between mb-12">
            <button 
              onClick={() => setSelectedAlbum(null)}
              className="flex items-center gap-2 text-white/50 hover:text-white transition-colors font-medium px-4 py-2 -ml-4 rounded-full hover:bg-white/5"
            >
              <ChevronLeft className="w-5 h-5" />
              {t.backToAlbums}
            </button>
          </div>

          <div className="mb-12 max-w-3xl">
            <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-white mb-4">{selectedAlbum.title}</h2>
            <p className="text-lg text-white/40 font-medium">
              {selectedAlbum.date ? formatLocalizedDate(selectedAlbum.date, "d MMMM yyyy", lang) : ""}
            </p>
          </div>

          {/* Masonry-like Grid for Images */}
          <div className="columns-1 sm:columns-2 lg:columns-3 gap-6 space-y-6">
            {selectedAlbum.images?.map((imgUrl, idx) => (
              <div 
                key={idx} 
                onClick={() => setFullscreenImage(imgUrl)}
                className="break-inside-avoid relative rounded-2xl overflow-hidden group cursor-zoom-in bg-white/5 border border-white/5"
              >
                <img 
                  src={imgUrl} 
                  alt={`Memory ${idx + 1}`} 
                  className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300"></div>
              </div>
            ))}
            {(!selectedAlbum.images || selectedAlbum.images.length === 0) && (
              <div className="py-20 text-white/30">{t.noPhotosInAlbum}</div>
            )}
          </div>
        </div>
      )}

      {/* Fullscreen Image Lightbox */}
      {fullscreenImage && (
        <div 
          className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center animate-in fade-in duration-300 cursor-zoom-out"
          onClick={() => setFullscreenImage(null)}
        >
          <div className="absolute top-6 right-6 sm:top-10 sm:right-10 flex items-center gap-4 z-50">
            <a 
              href={fullscreenImage}
              download
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors cursor-pointer"
              title={t.downloadImage}
            >
              <Download className="w-5 h-5" />
            </a>
            <button 
              className="w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors cursor-pointer"
              onClick={(e) => { e.stopPropagation(); setFullscreenImage(null); }}
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <img 
            src={fullscreenImage} 
            alt="Fullscreen memory" 
            className="max-w-full max-h-screen object-contain p-4 sm:p-12 select-none animate-in zoom-in-95 duration-300"
          />
        </div>
      )}
    </div>
  );
}
