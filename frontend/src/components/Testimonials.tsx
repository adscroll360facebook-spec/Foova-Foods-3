import { motion, AnimatePresence } from "framer-motion";
import { Star, ChevronLeft, ChevronRight, Quote } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { safeFetch } from "@/lib/utils";

interface Testimonial {
  id: string;
  customer_name: string;
  text: string;
  rating: number;
  customer_image_url: string | null;
}

const Testimonials = () => {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    safeFetch("/api/testimonials")
      .then(data => {
        if (Array.isArray(data) && data.length > 0) setTestimonials(data);
      })
      .catch(err => console.error("Testimonials fetch error:", err))
      .finally(() => setLoading(false));
  }, []);

  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setIndex(i => (i + 1) % testimonials.length);
    }, 5000);
  };

  useEffect(() => {
    if (testimonials.length > 0) startTimer();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [testimonials.length]);

  const next = () => {
    setIndex(i => (i + 1) % testimonials.length);
    startTimer();
  };
  const prev = () => {
    setIndex(i => (i - 1 + testimonials.length) % testimonials.length);
    startTimer();
  };

  // If no testimonials from admin, hide section completely
  if (loading || testimonials.length === 0) return null;

  return (
    <section className="section-padding overflow-hidden bg-secondary/20">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <p className="text-accent font-medium tracking-[0.3em] uppercase text-sm mb-4">Testimonials</p>
          <h2 className="font-display text-4xl md:text-5xl font-bold mb-3">
            What Our <span className="gold-text">Customers Say</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-md mx-auto">
            Hear from those who have experienced the premium quality of FOOVA FOODS.
          </p>
        </motion.div>

        {/* Testimonial Cards + Navigation Layout */}
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
          {/* Navigation Controls (left on desktop) */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="lg:w-1/4 flex flex-col items-center lg:items-start gap-6"
          >
            {/* Dot indicators */}
            <div className="flex gap-2 flex-wrap justify-center lg:justify-start">
              {testimonials.map((_, i) => (
                <button
                  key={i}
                  onClick={() => { setIndex(i); startTimer(); }}
                  className={`transition-all duration-300 rounded-full ${i === index
                      ? "w-8 h-3 bg-accent"
                      : "w-3 h-3 bg-border hover:bg-accent/50"
                    }`}
                />
              ))}
            </div>

            {/* Prev / Next arrows */}
            <div className="flex gap-3">
              <button
                onClick={prev}
                className="p-3 rounded-full border border-border hover:bg-accent hover:text-accent-foreground hover:border-accent transition-all duration-300 group"
              >
                <ChevronLeft className="w-5 h-5 group-hover:scale-110 transition-transform" />
              </button>
              <button
                onClick={next}
                className="p-3 rounded-full border border-border hover:bg-accent hover:text-accent-foreground hover:border-accent transition-all duration-300 group"
              >
                <ChevronRight className="w-5 h-5 group-hover:scale-110 transition-transform" />
              </button>
            </div>

            <p className="text-muted-foreground text-sm">
              <span className="text-accent font-semibold">{index + 1}</span> / {testimonials.length}
            </p>
          </motion.div>

          {/* Testimonial Slide (right, larger) */}
          <div className="lg:w-3/4 relative min-h-[320px] w-full">
            <AnimatePresence mode="wait">
              <motion.div
                key={index}
                initial={{ opacity: 0, x: 80 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -80 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="w-full"
              >
                <div className="glass-card p-8 md:p-12 relative overflow-hidden">
                  <Quote className="absolute -right-4 -top-4 w-32 h-32 text-accent/5" />

                  {/* Stars */}
                  <div className="flex gap-1 mb-6">
                    {[...Array(5)].map((_, j) => (
                      <Star
                        key={j}
                        className={`w-5 h-5 transition-all ${j < testimonials[index].rating
                            ? "text-accent fill-accent"
                            : "text-border"
                          }`}
                      />
                    ))}
                  </div>

                  {/* Review Text */}
                  <p className="text-xl md:text-2xl font-light italic text-foreground/90 leading-relaxed mb-8">
                    "{testimonials[index].text}"
                  </p>

                  {/* Author */}
                  <div className="flex items-center gap-4">
                    {testimonials[index].customer_image_url ? (
                      <img
                        src={testimonials[index].customer_image_url!}
                        alt={testimonials[index].customer_name}
                        className="w-14 h-14 rounded-full object-cover border-2 border-accent/30 shadow-[0_0_12px_hsl(43_85%_55%/0.2)]"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-accent/30 to-accent/10 flex items-center justify-center border-2 border-accent/30 shadow-[0_0_12px_hsl(43_85%_55%/0.2)]">
                        <span className="text-accent font-bold text-xl">
                          {testimonials[index].customer_name[0]}
                        </span>
                      </div>
                    )}
                    <div>
                      <p className="font-bold text-lg leading-tight">{testimonials[index].customer_name}</p>
                      <p className="text-accent text-sm font-medium tracking-widest uppercase">Verified Purchase</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
