import { motion } from "framer-motion";
import { Gift, Clock, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

const offers = [
  {
    icon: Gift,
    title: "Early Bird Offer",
    desc: "Order before Ramadan & get 25% off on all Iftar Kits",
    cta: "Shop Kits",
    highlight: "25% OFF",
  },
  {
    icon: Clock,
    title: "Subscribe & Save",
    desc: "Get weekly Iftar deliveries throughout Ramadan at special prices",
    cta: "Learn More",
    highlight: "WEEKLY",
  },
  {
    icon: Sparkles,
    title: "Gift a Kit",
    desc: "Send premium Iftar Kits to loved ones with personalized messages",
    cta: "Send Gift",
    highlight: "NEW",
  },
];

const Offers = () => {
  return (
    <section className="section-padding relative">
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none" />
      <div className="container mx-auto relative">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <p className="text-accent font-medium tracking-[0.3em] uppercase text-sm mb-4">Limited Time</p>
          <h2 className="font-display text-4xl md:text-5xl font-bold">
            Ramadan <span className="gold-text">Specials</span>
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {offers.map((offer, i) => (
            <motion.div
              key={offer.title}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.15 }}
              className="glass-card p-8 text-center hover-lift group"
            >
              <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-5 group-hover:bg-accent/20 transition-colors">
                <offer.icon className="w-8 h-8 text-accent" />
              </div>
              <span className="inline-block px-3 py-1 bg-accent/10 text-accent text-xs font-bold rounded-full mb-4 tracking-wider">
                {offer.highlight}
              </span>
              <h3 className="font-display text-xl font-semibold mb-3">{offer.title}</h3>
              <p className="text-muted-foreground text-sm mb-6">{offer.desc}</p>
              <Link to="/products">
                <span className="text-accent font-medium text-sm hover:underline">{offer.cta} →</span>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Offers;
