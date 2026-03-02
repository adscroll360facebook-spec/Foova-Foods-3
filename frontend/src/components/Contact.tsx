import { motion } from "framer-motion";
import { Phone, Mail, MapPin, MessageCircle } from "lucide-react";

const contactItems = [
  { icon: Phone, label: "Call Us", value: "+91 89511 82561", href: "tel:+918951182561" },
  { icon: MessageCircle, label: "WhatsApp", value: "Chat with us", href: "https://wa.me/918951182561" },
  { icon: Phone, label: "Alternative", value: "+91 91871 48561", href: "tel:+919187148561" },
  { icon: MapPin, label: "Location", value: "Sulya, Dakshina Kannada", href: "#" },
];

const Contact = () => {
  return (
    <section className="section-padding">
      <div className="container mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <p className="text-accent font-medium tracking-[0.3em] uppercase text-sm mb-4">Get In Touch</p>
          <h2 className="font-display text-4xl md:text-5xl font-bold">
            Contact <span className="gold-text">Us</span>
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {contactItems.map((item, i) => (
            <motion.a
              key={item.label}
              href={item.href}
              target={item.href.startsWith("http") ? "_blank" : undefined}
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="glass-card p-6 text-center hover-lift group cursor-pointer"
            >
              <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-4 group-hover:bg-accent/20 transition-colors">
                <item.icon className="w-6 h-6 text-accent" />
              </div>
              <p className="font-semibold mb-1">{item.label}</p>
              <p className="text-muted-foreground text-sm">{item.value}</p>
            </motion.a>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Contact;
