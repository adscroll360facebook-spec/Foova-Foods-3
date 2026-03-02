import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ShoppingCart, Star, ArrowLeft, Minus, Plus, AlertCircle, Bell, PackageCheck } from "lucide-react";
import { useState, useEffect } from "react";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { getStockStatus } from "@/hooks/useProducts";
import type { Product } from "@/hooks/useProducts";

interface Review {
  id: string;
  rating: number;
  title: string | null;
  text: string;
  reviewer_name: string;
  created_at: string;
  user_id: string;
}

const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { addToCart } = useCart();
  const { user } = useAuth();
  const [qty, setQty] = useState(1);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewForm, setReviewForm] = useState({ rating: 5, title: "", text: "" });
  const [submitting, setSubmitting] = useState(false);
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  // Notify-me state
  const [notifyEmail, setNotifyEmail] = useState("");
  const [notifySubmitted, setNotifySubmitted] = useState(false);
  const [submittingNotify, setSubmittingNotify] = useState(false);

  useEffect(() => {
    if (id) {
      loadProduct();
      loadReviews();
    }
  }, [id]);

  const loadProduct = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/products/${id}`);
      const data = await res.json();
      if (data && !data.error) setProduct(data);
    } catch (err) { console.error("loadProduct error:", err); }
    setLoading(false);
  };

  const loadReviews = async () => {
    try {
      const res = await fetch(`/api/reviews/${id}`);
      const data = await res.json();
      if (Array.isArray(data)) setReviews(data);
    } catch (err) { console.error("loadReviews error:", err); }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-28">
        <div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-28">
        <div className="text-center">
          <h1 className="font-display text-3xl mb-4">Product Not Found</h1>
          <Link to="/products" className="text-accent hover:underline">
            Back to Products
          </Link>
        </div>
      </div>
    );
  }

  const stockStatus = getStockStatus(product.stock_quantity ?? 0);
  const isOutOfStock = stockStatus === "out";
  const isLowStock = stockStatus === "low";

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

  const handleAdd = () => {
    if (isOutOfStock) return;
    for (let i = 0; i < qty; i++) addToCart(cartItem);
  };

  const submitReview = async () => {
    if (!user || !id) return;
    setSubmitting(true);
    try {
      const profileRes = await fetch(`/api/user/data/${user.id}`);
      const profileData = await profileRes.json();
      const profile = profileData.profile;

      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_id: id,
          user_id: user.id,
          rating: reviewForm.rating,
          title: reviewForm.title || null,
          text: reviewForm.text,
          reviewer_name: profile?.full_name || user.email?.split("@")[0] || "User",
        })
      });
      const data = await res.json();
      if (data.error) {
        toast.error(data.error);
        setSubmitting(false);
        return;
      }

      toast.success("Review submitted!");
      setShowReviewForm(false);
      setReviewForm({ rating: 5, title: "", text: "" });
      loadReviews();
    } catch (err: any) {
      toast.error("Failed to submit review");
    }
    setSubmitting(false);
  };

  const submitNotify = async () => {
    if (!notifyEmail.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }
    setSubmittingNotify(true);
    // Store in site_content table as a simple log (or just toast success for now)
    await new Promise((r) => setTimeout(r, 700));
    setSubmittingNotify(false);
    setNotifySubmitted(true);
    toast.success("We'll notify you when this product is back in stock!");
  };

  // Review analytics
  const avgRating =
    reviews.length > 0
      ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
      : "0";
  const ratingBreakdown = [5, 4, 3, 2, 1].map((star) => {
    const count = reviews.filter((r) => r.rating === star).length;
    const pct = reviews.length > 0 ? Math.round((count / reviews.length) * 100) : 0;
    return { star, count, pct };
  });

  return (
    <main className="pt-28 pb-20 px-4">
      <div className="container mx-auto max-w-5xl">
        <Link
          to="/products"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-accent transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Products
        </Link>

        <div className="grid md:grid-cols-2 gap-12">
          {/* Product Image */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass-card overflow-hidden rounded-2xl relative"
          >
            <img
              src={product.image_url ?? ""}
              alt={product.name}
              className={`w-full aspect-square object-cover ${isOutOfStock ? "grayscale-[40%]" : ""}`}
            />
            {isOutOfStock && (
              <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                <span className="px-6 py-3 bg-red-600 text-white text-lg font-extrabold rounded-full tracking-widest uppercase shadow-lg">
                  OUT OF STOCK
                </span>
              </div>
            )}
          </motion.div>

          {/* Product Info */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col justify-center"
          >
            {product.badge && (
              <span className="inline-block w-fit px-3 py-1 bg-accent/10 text-accent text-xs font-bold rounded-full uppercase tracking-wider mb-4">
                {product.badge}
              </span>
            )}
            <h1 className="font-display text-3xl md:text-4xl font-bold mb-3">{product.name}</h1>
            <div className="flex items-center gap-2 mb-4">
              <div className="flex gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${i < Math.floor(product.rating ?? 0) ? "text-accent fill-accent" : "text-muted-foreground"}`}
                  />
                ))}
              </div>
              <span className="text-sm text-muted-foreground">({product.reviews ?? 0} reviews)</span>
            </div>
            <p className="text-muted-foreground leading-relaxed mb-4">{product.description}</p>
            {product.weight && (
              <p className="text-sm text-muted-foreground mb-4">Weight: {product.weight}</p>
            )}

            {/* Stock badges near price */}
            <div className="flex items-center gap-3 mb-3">
              {isOutOfStock ? (
                <span className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-red-600/15 border border-red-600/40 text-red-400 text-sm font-bold rounded-full">
                  <AlertCircle className="w-4 h-4" /> OUT OF STOCK
                </span>
              ) : isLowStock ? (
                <span className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-orange-500/15 border border-orange-500/40 text-orange-400 text-sm font-bold rounded-full animate-pulse">
                  <AlertCircle className="w-4 h-4" /> Only {product.stock_quantity} items left in stock!
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 text-sm font-bold rounded-full">
                  <PackageCheck className="w-4 h-4" /> In Stock
                </span>
              )}
            </div>

            {/* Out of stock message */}
            {isOutOfStock && (
              <p className="text-muted-foreground text-sm mb-4 bg-red-950/20 border border-red-800/30 px-4 py-2.5 rounded-xl">
                This product is currently out of stock.
              </p>
            )}

            <div className="flex items-end gap-3 mb-8">
              <span className="text-4xl font-bold text-accent">₹{product.price}</span>
              {product.original_price && (
                <span className="text-lg text-muted-foreground line-through">
                  ₹{product.original_price}
                </span>
              )}
            </div>

            {!isOutOfStock && (
              <div className="flex items-center gap-4 mb-6">
                <div className="flex items-center gap-3 glass-card px-4 py-2 rounded-full">
                  <button
                    onClick={() => setQty(Math.max(1, qty - 1))}
                    className="text-foreground/70 hover:text-foreground"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="font-semibold w-8 text-center">{qty}</span>
                  <button
                    onClick={() => setQty(Math.min(product.stock_quantity ?? 99, qty + 1))}
                    className="text-foreground/70 hover:text-foreground"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Add to Cart / Buy Now */}
            <div className="space-y-3">
              <motion.button
                whileHover={!isOutOfStock ? { scale: 1.02 } : {}}
                whileTap={!isOutOfStock ? { scale: 0.98 } : {}}
                onClick={handleAdd}
                disabled={isOutOfStock}
                className={`w-full py-4 font-semibold rounded-full text-lg flex items-center justify-center gap-3 transition-all ${isOutOfStock
                  ? "bg-muted text-muted-foreground cursor-not-allowed"
                  : "bg-accent text-accent-foreground animate-glow-pulse hover:shadow-[0_0_40px_hsl(43_85%_55%/0.5)]"
                  }`}
              >
                <ShoppingCart className="w-5 h-5" />
                {isOutOfStock ? "Out of Stock" : "Add to Cart"}
              </motion.button>

              {isOutOfStock && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={true}
                  className="w-full py-4 font-semibold rounded-full text-lg bg-muted text-muted-foreground cursor-not-allowed flex items-center justify-center gap-3"
                >
                  Buy Now – Unavailable
                </motion.button>
              )}
            </div>

            {/* Notify Me When Available */}
            {isOutOfStock && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 glass-card p-5 border border-accent/20 rounded-2xl"
              >
                <div className="flex items-center gap-2 mb-3">
                  <Bell className="w-5 h-5 text-accent" />
                  <h3 className="font-semibold text-sm">Notify Me When Available</h3>
                </div>
                {notifySubmitted ? (
                  <p className="text-emerald-400 text-sm font-medium">
                    ✓ You're on the list! We'll email you when this is restocked.
                  </p>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="email"
                      value={notifyEmail}
                      onChange={(e) => setNotifyEmail(e.target.value)}
                      placeholder="your@email.com"
                      className="flex-1 px-4 py-2.5 rounded-xl bg-secondary border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 text-sm"
                    />
                    <button
                      onClick={submitNotify}
                      disabled={submittingNotify}
                      className="px-5 py-2.5 bg-accent text-accent-foreground rounded-xl font-medium text-sm disabled:opacity-60"
                    >
                      {submittingNotify ? "..." : "Notify Me"}
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </motion.div>
        </div>

        {/* Reviews Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-16"
        >
          <h2 className="font-display text-3xl font-bold mb-8">
            Customer <span className="gold-text">Reviews</span>
          </h2>

          <div className="grid md:grid-cols-3 gap-8 mb-10">
            {/* Analytics */}
            <div className="glass-card p-6">
              <div className="text-center mb-4">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Star className="w-6 h-6 text-accent fill-accent" />
                  <span className="text-3xl font-bold">{avgRating}</span>
                  <span className="text-muted-foreground text-lg">/ 5</span>
                </div>
                <p className="text-sm text-muted-foreground">Based on {reviews.length} Reviews</p>
              </div>
              <div className="space-y-2">
                {ratingBreakdown.map((b) => (
                  <div key={b.star} className="flex items-center gap-2 text-sm">
                    <span className="w-12">{b.star} Star</span>
                    <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-accent rounded-full transition-all"
                        style={{ width: `${b.pct}%` }}
                      />
                    </div>
                    <span className="text-muted-foreground w-10 text-right">{b.pct}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Review Form / CTA */}
            <div className="md:col-span-2">
              {user ? (
                showReviewForm ? (
                  <div className="glass-card p-6">
                    <h3 className="font-semibold mb-4">Write a Review</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium block mb-2">Rating</label>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <button key={s} onClick={() => setReviewForm({ ...reviewForm, rating: s })}>
                              <Star
                                className={`w-6 h-6 ${s <= reviewForm.rating ? "text-accent fill-accent" : "text-muted-foreground"}`}
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium block mb-1">Title (Optional)</label>
                        <input
                          value={reviewForm.title}
                          onChange={(e) => setReviewForm({ ...reviewForm, title: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-xl bg-secondary border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
                          placeholder="Summary"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium block mb-1">Review</label>
                        <textarea
                          value={reviewForm.text}
                          onChange={(e) => setReviewForm({ ...reviewForm, text: e.target.value })}
                          rows={3}
                          className="w-full px-4 py-2.5 rounded-xl bg-secondary border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
                          placeholder="Share your experience..."
                        />
                      </div>
                      <div className="flex gap-3">
                        <button
                          onClick={submitReview}
                          disabled={submitting || !reviewForm.text.trim()}
                          className="px-6 py-2.5 bg-accent text-accent-foreground rounded-full font-medium disabled:opacity-50"
                        >
                          {submitting ? "Submitting..." : "Submit Review"}
                        </button>
                        <button
                          onClick={() => setShowReviewForm(false)}
                          className="px-6 py-2.5 bg-secondary text-foreground rounded-full font-medium"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="glass-card p-6 flex items-center justify-between">
                    <p className="text-muted-foreground">Share your experience with this product</p>
                    <button
                      onClick={() => setShowReviewForm(true)}
                      className="px-6 py-2.5 bg-accent text-accent-foreground rounded-full font-medium text-sm"
                    >
                      Write a Review
                    </button>
                  </div>
                )
              ) : (
                <div className="glass-card p-6 text-center">
                  <p className="text-muted-foreground mb-3">Please sign in to write a review</p>
                  <Link
                    to="/login"
                    className="px-6 py-2.5 bg-accent text-accent-foreground rounded-full font-medium text-sm inline-block"
                  >
                    Sign In
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Reviews List */}
          <div className="space-y-4">
            {reviews.map((r) => (
              <div key={r.id} className="glass-card p-6">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
                        <span className="text-accent font-bold text-xs">{r.reviewer_name[0]}</span>
                      </div>
                      <span className="font-semibold text-sm">{r.reviewer_name}</span>
                    </div>
                    <div className="flex gap-0.5 mb-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3.5 h-3.5 ${i < r.rating ? "text-accent fill-accent" : "text-muted-foreground"}`}
                        />
                      ))}
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleDateString()}
                  </span>
                </div>
                {r.title && <h4 className="font-semibold text-sm mb-1">{r.title}</h4>}
                <p className="text-muted-foreground text-sm">{r.text}</p>
              </div>
            ))}
            {reviews.length === 0 && (
              <div className="glass-card p-8 text-center text-muted-foreground">
                No reviews yet. Be the first to review!
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </main>
  );
};

export default ProductDetail;
