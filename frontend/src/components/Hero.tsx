import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import heroImage from "@/assets/hero-iftar.jpg";
import { useSiteSettings, SITE_KEYS } from "@/hooks/useSiteSettings";

const Hero = () => {
  const { settings } = useSiteSettings();

  const title = settings[SITE_KEYS.HERO_TITLE] || "Premium Iftar";
  const subtitle = settings[SITE_KEYS.HERO_SUBTITLE] || "Delivered Fresh";
  const description = settings[SITE_KEYS.HERO_DESCRIPTION] || "Curated boxes of the finest dates, dry fruits & nuts — handpicked for your blessed evenings.";
  const topText = settings[SITE_KEYS.HERO_SUBTITLE] || "Ramadan Special Collection";
  const bg = settings[SITE_KEYS.HERO_BG_IMAGE] || heroImage;

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <motion.img
          src={bg}
          alt="Premium Hero"
          key={bg}
          className="w-full h-full object-cover"
          initial={{ scale: 1.2, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-background/30" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/80 via-transparent to-background/40" />
      </div>

      {/* Floating particles at top */}
      <div className="absolute top-0 left-0 w-full h-1/2 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 bg-accent/20 rounded-full blur-sm"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -40, 0],
              opacity: [0.2, 0.5, 0.2],
              scale: [1, 1.5, 1],
            }}
            transition={{
              duration: 3 + Math.random() * 4,
              repeat: Infinity,
              delay: Math.random() * 5,
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.5 }}
        >
          <motion.p
            className="text-accent font-medium tracking-[0.3em] uppercase text-sm mb-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            {topText}
          </motion.p>
          <h1 className="font-display text-5xl md:text-7xl lg:text-8xl font-bold mb-6 text-shadow-lg leading-tight">
            {title}
            <br />
            <span className="gold-text">{subtitle}</span>
          </h1>
          <p className="text-foreground/70 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            {description}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/products">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
                className="px-10 py-4 bg-accent text-accent-foreground font-semibold rounded-full text-lg animate-glow-pulse hover:shadow-[0_0_40px_hsl(43_85%_55%/0.5)] transition-shadow"
              >
                Order Now
              </motion.button>
            </Link>
            <Link to="/products">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
                className="px-10 py-4 border border-foreground/20 text-foreground font-semibold rounded-full text-lg hover:border-accent/50 hover:text-accent transition-all"
              >
                View Products
              </motion.button>
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Hero;
