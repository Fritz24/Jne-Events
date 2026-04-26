import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Images } from "lucide-react";
import { useLang } from "@/lib/LanguageContext";

const photos = [
  {
    url: "/picture1.JPG",
    caption: "Premium Movie Night",
  },
  {
    url: "/picture2.jpg",
    caption: "Live Performances",
  },
  {
    url: "/picture3.jpg",
    caption: "Exclusive Gatherings",
  },
];

export default function GallerySection() {
  const [lightbox, setLightbox] = useState(null);
  const { t } = useLang();

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="mb-10">
        <p className="text-sm font-medium text-violet-400 mb-2 tracking-wide uppercase">{t.memories}</p>
        <h2 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2">
          <Images className="w-6 h-6 text-violet-400" />
          {t.pastNightouts}
        </h2>
        <p className="text-white/40 mt-2">{t.gallerySubtitle}</p>
      </div>

      {/* Masonry-style grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {photos.map((photo, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: i * 0.07 }}
            className={`relative overflow-hidden rounded-xl cursor-pointer group ${i === 0 ? "col-span-2 md:col-span-1 row-span-2" : ""
              }`}
            style={{ aspectRatio: i === 0 ? "3/4" : "4/3" }}
            onClick={() => setLightbox(photo)}
          >
            <img
              src={photo.url}
              alt={photo.caption}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-300 flex items-end p-3">
              <p className="text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                {photo.caption}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightbox && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
            onClick={() => setLightbox(null)}
          >
            <button
              className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
              onClick={() => setLightbox(null)}
            >
              <X className="w-5 h-5" />
            </button>
            <motion.img
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              src={lightbox.url}
              alt={lightbox.caption}
              className="max-w-full max-h-[85vh] object-contain rounded-xl"
              onClick={(e) => e.stopPropagation()}
            />
            <p className="absolute bottom-6 text-white/60 text-sm">{lightbox.caption}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}