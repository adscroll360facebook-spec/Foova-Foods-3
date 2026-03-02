import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import ProductCard from "@/components/ProductCard";
import { useProducts } from "@/hooks/useProducts";
import { safeFetch } from "@/lib/utils";

const Products = () => {
  const { products, loading } = useProducts();
  const [activeCategory, setActiveCategory] = useState("All");
  const [categories, setCategories] = useState(["All"]);

  useEffect(() => {
    safeFetch("/api/categories")
      .then(data => {
        if (Array.isArray(data)) {
          setCategories(["All", ...data.map((c: any) => c.name)]);
        }
      })
      .catch(err => console.error("Failed to fetch categories:", err));
  }, []);

  const filtered =
    activeCategory === "All"
      ? products
      : products.filter((p) => {
        const pc = (p.category || "").trim().toLowerCase();
        const ac = activeCategory.trim().toLowerCase();
        return pc === ac;
      });


  return (
    <main className="pt-28 pb-20 px-4">
      <div className="container mx-auto">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
          <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">
            Our <span className="gold-text">Products</span>
          </h1>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Explore our premium collection of dates, dry fruits, and curated Iftar kits
          </p>
        </motion.div>

        {/* Category Filter */}
        <div className="flex flex-wrap justify-center gap-3 mb-12">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${activeCategory === cat
                ? "bg-accent text-accent-foreground"
                : "bg-secondary text-foreground/70 hover:text-foreground"
                }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="glass-card animate-pulse rounded-2xl overflow-hidden">
                <div className="aspect-square bg-secondary/60" />
                <div className="p-5 space-y-3">
                  <div className="h-4 bg-secondary/60 rounded w-3/4" />
                  <div className="h-3 bg-secondary/60 rounded w-full" />
                  <div className="h-3 bg-secondary/60 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filtered.map((product, i) => (
              <ProductCard key={product.id} product={product} index={i} />
            ))}
            {filtered.length === 0 && (
              <div className="col-span-full text-center py-16 text-muted-foreground">
                No products found in this category.
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
};

export default Products;
