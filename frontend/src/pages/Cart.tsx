import { useState } from "react";
import { motion } from "framer-motion";
import { Minus, Plus, Trash2, ShoppingCart, Tag, X } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { Link } from "react-router-dom";

const Cart = () => {
  const { items, updateQuantity, removeFromCart, totalPrice, totalItems, appliedCoupon, couponDiscount, applyCoupon, removeCoupon } = useCart();
  const [couponCode, setCouponCode] = useState("");
  const [applyingCoupon, setApplyingCoupon] = useState(false);

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setApplyingCoupon(true);
    await applyCoupon(couponCode.trim());
    setApplyingCoupon(false);
  };

  if (items.length === 0) {
    return (
      <main className="pt-28 pb-20 px-4 min-h-screen flex items-center justify-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
          <ShoppingCart className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="font-display text-3xl font-bold mb-3">Your Cart is Empty</h1>
          <p className="text-muted-foreground mb-6">Explore our premium collection and add items</p>
          <Link to="/products">
            <button className="px-8 py-3 bg-accent text-accent-foreground rounded-full font-semibold">Browse Products</button>
          </Link>
        </motion.div>
      </main>
    );
  }

  const finalTotal = totalPrice - couponDiscount;

  return (
    <main className="pt-28 pb-20 px-4">
      <div className="container mx-auto max-w-4xl">
        <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="font-display text-4xl font-bold mb-2">
          Shopping <span className="gold-text">Cart</span>
        </motion.h1>
        <p className="text-muted-foreground mb-8">Review your items and proceed to checkout</p>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Items */}
          <div className="lg:col-span-2 space-y-4">
            {items.map((item, i) => (
              <motion.div key={item.product.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                className="glass-card p-4 md:p-6 flex items-center gap-4 md:gap-6">
                <img src={item.product.image} alt={item.product.name} className="w-20 h-20 md:w-24 md:h-24 object-cover rounded-xl" />
                <div className="flex-1 min-w-0">
                  <h3 className="font-display font-semibold text-lg truncate">{item.product.name}</h3>
                  <p className="text-muted-foreground text-sm mb-2">{item.product.description?.slice(0, 60)}...</p>
                  <p className="text-accent font-bold text-lg">₹{item.product.price}</p>
                </div>
                <div className="flex flex-col items-center gap-3">
                  <div className="flex items-center gap-2">
                    <button onClick={() => updateQuantity(item.product.id, item.quantity - 1)} className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center hover:bg-accent/20 transition-colors">
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-8 text-center font-semibold">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.product.id, item.quantity + 1)} className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center hover:bg-accent/20 transition-colors">
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                  <p className="font-bold hidden sm:block">₹{item.product.price * item.quantity}</p>
                  <button onClick={() => removeFromCart(item.product.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Order Summary */}
          <div className="space-y-4">
            {/* Coupon */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-6">
              <div className="flex items-center gap-2 mb-3">
                <Tag className="w-4 h-4 text-accent" />
                <h3 className="font-semibold text-sm">Do you have a voucher or gift card?</h3>
              </div>
              {appliedCoupon ? (
                <div className="flex items-center justify-between bg-primary/10 rounded-lg px-4 py-2">
                  <span className="text-primary font-medium text-sm">{appliedCoupon} applied (-₹{couponDiscount})</span>
                  <button onClick={removeCoupon}><X className="w-4 h-4 text-primary" /></button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input value={couponCode} onChange={(e) => setCouponCode(e.target.value.toUpperCase())} placeholder="Enter code"
                    className="flex-1 px-4 py-2.5 rounded-xl bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent/50" />
                  <button onClick={handleApplyCoupon} disabled={applyingCoupon}
                    className="px-4 py-2.5 bg-accent text-accent-foreground rounded-xl text-sm font-medium disabled:opacity-50">
                    Apply
                  </button>
                </div>
              )}
            </motion.div>

            {/* Summary */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-6">
              <h3 className="font-semibold mb-4">Order Summary</h3>
              <div className="space-y-2 text-sm mb-4">
                <div className="flex justify-between"><span className="text-muted-foreground">Original Price</span><span>₹{totalPrice}</span></div>
                {couponDiscount > 0 && <div className="flex justify-between text-primary"><span>Discount</span><span>-₹{couponDiscount}</span></div>}
                <div className="flex justify-between"><span className="text-muted-foreground">Delivery</span><span className="text-primary">FREE</span></div>
              </div>
              <div className="border-t border-border pt-3 flex justify-between items-center mb-6">
                <span className="font-semibold">Total</span>
                <span className="text-2xl font-bold gold-text">₹{finalTotal}</span>
              </div>
              <Link to="/checkout">
                <button className="w-full py-3 bg-accent text-accent-foreground font-semibold rounded-full text-lg animate-glow-pulse hover:shadow-[0_0_40px_hsl(43_85%_55%/0.5)] transition-shadow">
                  Proceed to Checkout
                </button>
              </Link>
              <Link to="/products" className="block text-center text-accent text-sm font-medium mt-4 hover:underline">
                Continue Shopping
              </Link>
            </motion.div>
          </div>
        </div>
      </div>
    </main>
  );
};

export default Cart;
