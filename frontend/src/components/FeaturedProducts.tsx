import { motion } from "framer-motion";
import { useProducts } from "@/hooks/useProducts";
import ProductCard from "./ProductCard";
import { Link } from "react-router-dom";
import { useSiteSettings, SITE_KEYS } from "@/hooks/useSiteSettings";

const FeaturedProducts = () => {
  const { products, loading: productsLoading } = useProducts();
  const { getBool, getFeaturedIds, loading: settingsLoading } = useSiteSettings();

  // While loading settings, render nothing (avoids flash)
  if (settingsLoading) return null;

  // Admin toggled the whole section OFF → hide entirely
  if (!getBool(SITE_KEYS.FEATURED_VISIBLE)) return null;

  // Get admin-chosen featured product IDs
  const featuredIds = getFeaturedIds();

  // If admin has selected specific products, show those (in chosen order)
  // Otherwise fall back to first 3 in-stock products
  const featured =
    featuredIds.length > 0
      ? featuredIds
        .map((id) => products.find((p) => p.id === id))
        .filter(Boolean)
        .slice(0, 3)
      : products
        .filter((p) => p.in_stock !== false && (p.stock_quantity ?? 0) > 0)
        .slice(0, 3);

  return (
    <section className="section-padding relative">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-20 bg-gradient-to-b from-transparent to-accent/30" />
      <div className="container mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <p className="text-accent font-medium tracking-[0.3em] uppercase text-sm mb-4">Our Collection</p>
          <h2 className="font-display text-4xl md:text-5xl font-bold mb-4">
            Featured <span className="gold-text">Products</span>
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Handpicked premium selections for your Ramadan celebrations
          </p>
        </motion.div>

        {productsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="glass-card animate-pulse rounded-2xl overflow-hidden">
                <div className="aspect-square bg-secondary/60" />
                <div className="p-5 space-y-3">
                  <div className="h-4 bg-secondary/60 rounded w-3/4" />
                  <div className="h-3 bg-secondary/60 rounded w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {(featured as any[]).map((product, i) => (
              <ProductCard key={product.id} product={product} index={i} />
            ))}
          </div>
        )}

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mt-12"
        >
          <Link to="/products">
            <motion.button
              whileHover={{ scale: 1.05 }}
              className="px-8 py-3 border border-accent/30 text-accent rounded-full hover:bg-accent/10 transition-all font-medium"
            >
              View All Products
            </motion.button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
};

export default FeaturedProducts;
