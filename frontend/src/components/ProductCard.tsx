import { motion } from "framer-motion";
import { ShoppingCart, Star, AlertCircle } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { Link } from "react-router-dom";
import type { Product } from "@/hooks/useProducts";
import { getStockStatus } from "@/hooks/useProducts";

interface Props {
  product: Product;
  index?: number;
}

const ProductCard = ({ product, index = 0 }: Props) => {
  const { addToCart } = useCart();

  const stockStatus = getStockStatus(product.stock_quantity ?? 0);
  const isOutOfStock = stockStatus === "out";
  const isLowStock = stockStatus === "low";

  // Build cart-compatible item from Supabase product
  const cartItem = {
    id: product.id,
    name: product.name,
    description: product.description ?? "",
    price: product.price,
    originalPrice: product.original_price ?? undefined,
    image: product.image_url ?? "",
    category: product.category,
    badge: product.badge ?? undefined,
    weight: product.weight ?? "",
    rating: product.rating ?? 4.5,
    reviews: product.reviews ?? 0,
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay: index * 0.1 }}
      className={`glass-card group hover-lift overflow-hidden relative ${isOutOfStock ? "opacity-80" : ""}`}
    >
      <Link to={`/products/${product.id}`} className="block relative overflow-hidden aspect-square">
        <img
          src={product.image_url ?? ""}
          alt={product.name}
          className={`w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 ${isOutOfStock ? "grayscale-[40%]" : ""}`}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Badges row */}
        <div className="absolute top-4 left-4 flex flex-col gap-1.5">
          {product.badge && (
            <span className="px-3 py-1 bg-accent text-accent-foreground text-xs font-bold rounded-full uppercase tracking-wider">
              {product.badge}
            </span>
          )}
          {isOutOfStock ? (
            <span className="px-3 py-1 bg-red-600 text-white text-xs font-bold rounded-full uppercase tracking-wider flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> OUT OF STOCK
            </span>
          ) : isLowStock ? (
            <span className="px-3 py-1 bg-orange-500 text-white text-xs font-bold rounded-full uppercase tracking-wider">
              Only {product.stock_quantity} left!
            </span>
          ) : (
            <span className="px-3 py-1 bg-emerald-600 text-white text-xs font-bold rounded-full uppercase tracking-wider">
              In Stock
            </span>
          )}
        </div>
      </Link>

      <div className="p-5">
        <div className="flex items-center gap-1 mb-2">
          {[...Array(5)].map((_, i) => (
            <Star
              key={i}
              className={`w-3.5 h-3.5 ${i < Math.floor(product.rating ?? 0) ? "text-accent fill-accent" : "text-muted-foreground"}`}
            />
          ))}
          <span className="text-xs text-muted-foreground ml-1">({product.reviews ?? 0})</span>
        </div>
        <h3 className="font-display text-lg font-semibold text-foreground mb-1 line-clamp-1">{product.name}</h3>
        <p className="text-muted-foreground text-sm mb-3 line-clamp-2">{product.description}</p>

        {/* Low-stock warning near price */}
        {isLowStock && (
          <p className="text-xs font-semibold text-orange-400 mb-2 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            Only {product.stock_quantity} items left in stock!
          </p>
        )}

        <div className="flex items-end justify-between">
          <div>
            <span className="text-2xl font-bold text-accent">₹{product.price}</span>
            {product.original_price && (
              <span className="text-sm text-muted-foreground line-through ml-2">₹{product.original_price}</span>
            )}
          </div>
          {isOutOfStock ? (
            <span className="w-10 h-10 rounded-full bg-red-900/40 flex items-center justify-center cursor-not-allowed">
              <ShoppingCart className="w-4 h-4 text-red-400" />
            </span>
          ) : (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={(e) => {
                e.preventDefault();
                addToCart(cartItem);
              }}
              className="w-10 h-10 rounded-full bg-accent text-accent-foreground flex items-center justify-center hover:shadow-[0_0_20px_hsl(43_85%_55%/0.4)] transition-shadow"
            >
              <ShoppingCart className="w-4 h-4" />
            </motion.button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default ProductCard;
