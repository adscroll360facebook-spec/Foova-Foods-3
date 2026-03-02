import { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { safeFetch } from "@/lib/utils";

interface Banner {
  id: string;
  image_url: string;
  title: string | null;
  link: string | null;
}

const OfferBanners = () => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [current, setCurrent] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    safeFetch("/api/banners")
      .then(data => { if (Array.isArray(data)) setBanners(data); })
      .catch(err => console.error("Banners fetch error:", err));
  }, []);

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (banners.length <= 1) return;
    timerRef.current = setInterval(() => {
      setCurrent((prev) => (prev + 1) % banners.length);
    }, 6000);
  }, [banners.length]);

  useEffect(() => {
    startTimer();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [startTimer]);

  if (banners.length === 0) return null;

  const banner = banners[current];

  return (
    <section className="py-8 px-4">
      <div className="container mx-auto relative overflow-hidden rounded-2xl" style={{ minHeight: 200 }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={banner.id}
            initial={{ opacity: 0, x: 80 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -80 }}
            transition={{ duration: 0.5 }}
          >
            {banner.link ? (
              <a href={banner.link} target="_blank" rel="noopener noreferrer">
                <img src={banner.image_url} alt={banner.title || "Offer"} className="w-full rounded-2xl object-cover max-h-[200px]" />
              </a>
            ) : (
              <img src={banner.image_url} alt={banner.title || "Offer"} className="w-full rounded-2xl object-cover max-h-[200px]" />
            )}
          </motion.div>
        </AnimatePresence>
        {banners.length > 1 && (
          <div className="flex justify-center gap-2 mt-3">
            {banners.map((_, i) => (
              <button key={i} onClick={() => { setCurrent(i); startTimer(); }}
                className={`w-2 h-2 rounded-full transition-all ${i === current ? "bg-accent w-6" : "bg-muted-foreground/40"}`} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default OfferBanners;
