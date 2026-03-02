import { motion } from "framer-motion";
import { Leaf, Award, Truck } from "lucide-react";

const features = [
  { icon: Leaf, title: "100% Natural", desc: "No preservatives. No additives. Just pure, premium quality." },
  { icon: Award, title: "Premium Quality", desc: "Sourced from the finest farms across the Middle East and India." },
  { icon: Truck, title: "Fresh Delivery", desc: "Delivered fresh to your doorstep across Karnataka." },
];

const About = () => {
  return (
    <section className="section-padding relative overflow-hidden">
      <div className="absolute top-1/2 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      <div className="container mx-auto">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <p className="text-accent font-medium tracking-[0.3em] uppercase text-sm mb-4">Our Story</p>
            <h2 className="font-display text-4xl md:text-5xl font-bold mb-6">
              Crafted With <span className="gold-text">Love & Tradition</span>
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-6">
              At FOOVA FOODS LLP, we believe every iftar deserves the finest. Based in Karnataka, India, we curate premium dates, dry fruits, and Ramadan kits that bring families together over the blessings of the holy month.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Every product is handpicked, quality-tested, and packaged with care — ensuring freshness, purity, and the rich taste of tradition in every bite.
            </p>
          </motion.div>

          <div className="grid gap-6">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, x: 40 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.15 }}
                className="glass-card p-6 flex items-start gap-5 hover-lift"
              >
                <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
                  <feature.icon className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-semibold mb-1">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm">{feature.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;
