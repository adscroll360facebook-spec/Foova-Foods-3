import React, { createContext, useContext, useState, useCallback, useRef } from "react";
import { Product } from "@/data/products";
import { toast } from "sonner";
import { safeFetch } from "@/lib/utils";

export interface CartItem {
  product: Product;
  quantity: number;
}

interface CartContextType {
  items: CartItem[];
  addToCart: (product: Product) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
  appliedCoupon: string | null;
  couponDiscount: number;
  applyCoupon: (code: string) => Promise<boolean>;
  removeCoupon: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [couponDiscount, setCouponDiscount] = useState(0);
  // Prevent concurrent coupon fetches
  const couponFetchingRef = useRef(false);

  const addToCart = useCallback((product: Product) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
    toast.success(`${product.name} added to cart`);
  }, []);

  const removeFromCart = useCallback((productId: string) => {
    setItems((prev) => prev.filter((i) => i.product.id !== productId));
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((i) => i.product.id !== productId));
      return;
    }
    setItems((prev) =>
      prev.map((i) => (i.product.id === productId ? { ...i, quantity } : i))
    );
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    setAppliedCoupon(null);
    setCouponDiscount(0);
  }, []);

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const totalPrice = items.reduce((sum, i) => sum + i.product.price * i.quantity, 0);

  const applyCoupon = useCallback(
    async (code: string): Promise<boolean> => {
      if (couponFetchingRef.current) return false;
      couponFetchingRef.current = true;

      try {
        const data = await safeFetch(`/api/coupons/${code.toUpperCase()}`);

        if (data?.error) {
          console.error("Coupon fetch error:", data.error);
          toast.error("Error checking coupon. Please try again.");
          return false;
        }

        if (!data) {
          toast.error("Invalid or expired coupon code");
          return false;
        }

        if (data.expires_at && new Date(data.expires_at) < new Date()) {
          toast.error("Coupon has expired");
          return false;
        }

        if (data.max_uses && data.used_count >= data.max_uses) {
          toast.error("Coupon usage limit reached");
          return false;
        }

        if (data.min_order_amount && totalPrice < Number(data.min_order_amount)) {
          toast.error(`Minimum order amount is ₹${data.min_order_amount}`);
          return false;
        }

        let discount = 0;
        if (data.discount_type === "percentage") {
          discount = Math.round((totalPrice * Number(data.discount_value)) / 100);
        } else {
          discount = Number(data.discount_value);
        }
        discount = Math.min(discount, totalPrice);

        setAppliedCoupon(code.toUpperCase());
        setCouponDiscount(discount);
        toast.success(`Coupon applied! You save ₹${discount}`);
        return true;
      } catch (e: any) {
        console.error("Coupon exception:", e?.message);
        toast.error("Failed to apply coupon. Please try again.");
        return false;
      } finally {
        couponFetchingRef.current = false;
      }
    },
    [totalPrice]
  );

  const removeCoupon = useCallback(() => {
    setAppliedCoupon(null);
    setCouponDiscount(0);
    toast.success("Coupon removed");
  }, []);

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        totalItems,
        totalPrice,
        appliedCoupon,
        couponDiscount,
        applyCoupon,
        removeCoupon,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within CartProvider");
  return context;
};
