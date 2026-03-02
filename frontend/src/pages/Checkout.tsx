import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { useNavigate } from "react-router-dom";
import { MapPin, Package, CreditCard, Plus, Check, Home, Briefcase, X, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Address {
  id: string;
  full_name: string;
  phone: string;
  pincode: string;
  city: string;
  state: string;
  locality: string | null;
  address: string;
  landmark: string | null;
  alternate_phone: string | null;
  address_type: string;
  is_default: boolean;
}

const steps = [
  { key: "address", label: "Delivery Address", icon: MapPin },
  { key: "summary", label: "Order Summary", icon: Package },
  { key: "payment", label: "Payment", icon: CreditCard },
];

const emptyAddressForm = {
  full_name: "", phone: "", pincode: "", city: "", state: "", locality: "", address: "", landmark: "", alternate_phone: "", address_type: "home", is_default: false,
};

const Checkout = () => {
  const { user } = useAuth();
  const { items, totalPrice, clearCart, couponDiscount, appliedCoupon } = useCart();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [placing, setPlacing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"razorpay" | "cod">("razorpay");
  const [codAvailableForAll, setCodAvailableForAll] = useState(true);
  const [addressForm, setAddressForm] = useState({ ...emptyAddressForm });

  useEffect(() => {
    if (!user) { navigate("/login"); return; }
    if (items.length === 0) { navigate("/cart"); return; }
    loadAddresses();
    checkCodAvailability();
  }, [user, items.length, navigate]);

  const checkCodAvailability = async () => {
    try {
      // Check if all items support COD
      const res = await fetch("/api/products");
      const allProducts = await res.json();
      if (Array.isArray(allProducts)) {
        const cartIds = items.map(i => i.product.id);
        const cartProducts = allProducts.filter(p => cartIds.includes(p.id));
        const allCod = cartProducts.every(p => p.cod_available !== false);
        setCodAvailableForAll(allCod);
        if (!allCod) setPaymentMethod("razorpay");
      }
    } catch (err) { console.error("checkCodAvailability error:", err); }
  };

  const loadAddresses = async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/user/addresses/${user.id}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setAddresses(data);
        const def = data.find((a) => a.is_default);
        if (def) setSelectedAddress(def.id);
        else if (data.length > 0) setSelectedAddress(data[0].id);
      }
    } catch (err) { console.error("loadAddresses error:", err); }
  };

  const saveAddress = async () => {
    if (!user) return;
    if (!addressForm.full_name || !addressForm.phone || !addressForm.pincode || !addressForm.city || !addressForm.state || !addressForm.address) {
      toast.error("Please fill all required fields"); return;
    }
    const payload = { ...addressForm, user_id: user.id, id: editingAddressId };
    try {
      const res = await fetch("/api/user/addresses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      toast.success(editingAddressId ? "Address updated" : "Address saved");
      if (data.id) setSelectedAddress(data.id);

      setShowAddressForm(false);
      setEditingAddressId(null);
      setAddressForm({ ...emptyAddressForm });
      loadAddresses();
    } catch (err: any) {
      toast.error(err.message || "Failed to save address");
    }
  };

  const editAddress = (a: Address) => {
    setEditingAddressId(a.id);
    setAddressForm({
      full_name: a.full_name, phone: a.phone, pincode: a.pincode, city: a.city, state: a.state,
      locality: a.locality || "", address: a.address, landmark: a.landmark || "",
      alternate_phone: a.alternate_phone || "", address_type: a.address_type, is_default: a.is_default,
    });
    setShowAddressForm(true);
  };

  const deleteAddress = async (id: string) => {
    try {
      await fetch(`/api/user/addresses/${id}`, { method: "DELETE" });
      if (selectedAddress === id) setSelectedAddress(null);
      toast.success("Address deleted");
      loadAddresses();
    } catch (err) {
      toast.error("Failed to delete address");
    }
  };

  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if ((window as any).Razorpay) { resolve(true); return; }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const placeOrder = async () => {
    if (!user || !selectedAddress) return;
    const addr = addresses.find((a) => a.id === selectedAddress);
    const finalTotal = totalPrice - couponDiscount;
    const mappedItems = items.map((i) => ({ id: i.product.id, name: i.product.name, price: i.product.price, quantity: i.quantity, image: i.product.image }));
    const orderData = {
      user_id: user.id,
      email: user.email,
      items: mappedItems,
      total: finalTotal,
      full_name: addr?.full_name || "",
      phone: addr?.phone || "",
      alternate_phone: addr?.alternate_phone || "",
      shipping_address: addr ? `${addr.full_name}, ${addr.address}, ${addr.locality || ""}, ${addr.city}, ${addr.state} - ${addr.pincode}` : "",
      full_address: addr ? {
        address: addr.address,
        locality: addr.locality,
        city: addr.city,
        state: addr.state,
        pincode: addr.pincode,
        landmark: addr.landmark
      } : null,
      coupon_code: appliedCoupon || null,
      discount_amount: couponDiscount,
    };

    try {
      if (paymentMethod === "cod") {
        setPlacing(true);
        const res = await fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...orderData, payment_method: "cod" })
        });
        const data = await res.json();
        if (data.error) { setPlacing(false); toast.error(data.error); return; }

        setPlacing(false);
        clearCart();
        toast.success("Order placed successfully!");
        navigate("/order-success");
        return;
      }

      // Razorpay payment
      setPlacing(true);
      
      // Final stock check before payment
      try {
        const stockRes = await fetch("/api/products");
        const latestProducts = await stockRes.json();
        if (Array.isArray(latestProducts)) {
          for (const item of items) {
            const p = latestProducts.find(lp => lp.id === item.product.id);
            if (p && p.stock_quantity < item.quantity) {
              toast.error(`Sorry, ${p.name} just went out of stock or has insufficient quantity.`);
              setPlacing(false);
              return;
            }
          }
        }
      } catch (err) {
        console.error("Stock check error:", err);
      }

      const loaded = await loadRazorpayScript();
      if (!loaded) { toast.error("Failed to load payment gateway. Check your internet connection."); setPlacing(false); return; }

      let rpOrder: { order_id?: string; key_id?: string; error?: string } | null = null;
      try {
        const rpRes = await fetch("/api/razorpay/create-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount: finalTotal, receipt: `order_${Date.now()}` }),
        });
        rpOrder = await rpRes.json();
      } catch {
        toast.error("Network error creating payment. Please try again.");
        setPlacing(false);
        return;
      }

      if (!rpOrder?.order_id) {
        toast.error(rpOrder?.error || "Failed to create payment order. Please try again.");
        setPlacing(false);
        return;
      }

      const options = {
        key: rpOrder.key_id,
        amount: Math.round(finalTotal * 100),
        currency: "INR",
        name: "FOOVA FOODS",
        description: "Order Payment",
        order_id: rpOrder.order_id,
        handler: async (response: any) => {
          try {
            const verifyRes = await fetch("/api/razorpay/verify-payment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                orderData: {
                  ...orderData,
                  payment_method: "razorpay"
                }
              }),
            });
            const verifyData = await verifyRes.json();

            if (!verifyData?.success) {
              toast.error("Payment verification failed. Contact support if money was deducted.");
              setPlacing(false);
              return;
            }

            clearCart();
            toast.success("Payment successful! Order placed.");
            navigate("/order-success");
          } catch (verifyErr: any) {
            console.error("Payment verify error:", verifyErr);
            toast.error("Payment error. Please contact support.");
            setPlacing(false);
          }
        },
        modal: { ondismiss: () => setPlacing(false) },
        prefill: { name: addr?.full_name, contact: addr?.phone, email: user.email },
        theme: { color: "#D4A843" },
      };
      const rzp = new (window as any).Razorpay(options);
      rzp.open();
      setPlacing(false);
    } catch (err: any) {
      console.error("placeOrder error:", err);
      toast.error("Something went wrong placing your order. Please try again.");
      setPlacing(false);
    }
  };

  const selectedAddr = addresses.find((a) => a.id === selectedAddress);
  const finalTotal = totalPrice - couponDiscount;

  return (
    <main className="pt-28 pb-20 px-4">
      <div className="container mx-auto max-w-4xl">
        <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="font-display text-4xl font-bold mb-8">
          <span className="gold-text">Checkout</span>
        </motion.h1>

        {/* Steps */}
        <div className="flex items-center gap-2 mb-10">
          {steps.map((s, i) => (
            <div key={s.key} className="flex items-center gap-2 flex-1">
              <button onClick={() => { if (i < step) setStep(i); }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-all w-full justify-center ${i === step ? "bg-accent text-accent-foreground" : i < step ? "bg-primary/20 text-primary" : "bg-secondary text-muted-foreground"}`}>
                {i < step ? <Check className="w-4 h-4" /> : <s.icon className="w-4 h-4" />}
                <span className="hidden sm:inline">{s.label}</span>
                <span className="sm:hidden">Step {i + 1}</span>
              </button>
              {i < steps.length - 1 && <div className={`w-8 h-0.5 ${i < step ? "bg-primary" : "bg-border"}`} />}
            </div>
          ))}
        </div>

        {/* Step 1: Address */}
        {step === 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <h2 className="font-display text-2xl font-semibold mb-6">Select Delivery Address</h2>
            {addresses.length === 0 && !showAddressForm && (
              <div className="glass-card p-8 text-center">
                <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground mb-4">No addresses found</p>
                <button onClick={() => { setEditingAddressId(null); setAddressForm({ ...emptyAddressForm }); setShowAddressForm(true); }} className="px-6 py-2.5 bg-accent text-accent-foreground rounded-full font-medium">
                  Add New Address
                </button>
              </div>
            )}
            <div className="space-y-3 mb-4">
              {addresses.map((a) => (
                <div key={a.id} onClick={() => setSelectedAddress(a.id)}
                  className={`glass-card p-5 cursor-pointer transition-all ${selectedAddress === a.id ? "ring-2 ring-accent" : "hover:border-accent/30"}`}>
                  <div className="flex items-start gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 ${selectedAddress === a.id ? "border-accent" : "border-border"}`}>
                      {selectedAddress === a.id && <div className="w-2.5 h-2.5 rounded-full bg-accent" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold">{a.full_name}</span>
                        <span className="px-2 py-0.5 bg-secondary text-xs rounded-full uppercase">{a.address_type}</span>
                        {a.is_default && <span className="px-2 py-0.5 bg-accent/20 text-accent text-xs rounded-full">Default</span>}
                      </div>
                      <p className="text-sm text-muted-foreground">{a.address}{a.locality ? `, ${a.locality}` : ""}</p>
                      <p className="text-sm text-muted-foreground">{a.city}, {a.state} - {a.pincode}</p>
                      <p className="text-sm text-muted-foreground mt-1">📞 {a.phone}</p>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={(e) => { e.stopPropagation(); editAddress(a); }} className="p-2 hover:bg-secondary rounded-lg"><Pencil className="w-4 h-4 text-muted-foreground" /></button>
                      <button onClick={(e) => { e.stopPropagation(); deleteAddress(a.id); }} className="p-2 hover:bg-destructive/10 rounded-lg"><Trash2 className="w-4 h-4 text-destructive" /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {addresses.length > 0 && !showAddressForm && (
              <button onClick={() => { setEditingAddressId(null); setAddressForm({ ...emptyAddressForm }); setShowAddressForm(true); }} className="flex items-center gap-2 text-accent text-sm font-medium mb-6">
                <Plus className="w-4 h-4" /> Add New Address
              </button>
            )}

            {/* Address Form */}
            {showAddressForm && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6 mb-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-display text-lg font-semibold">{editingAddressId ? "Edit" : "Add New"} Address</h3>
                  <button onClick={() => { setShowAddressForm(false); setEditingAddressId(null); }}><X className="w-5 h-5 text-muted-foreground" /></button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { label: "Full Name", key: "full_name", required: true },
                    { label: "Phone Number", key: "phone", required: true },
                    { label: "Pincode", key: "pincode", required: true, autoFill: true },
                    { label: "City", key: "city", required: true, readOnly: true },
                    { label: "State", key: "state", required: true, readOnly: true },
                    { label: "Locality", key: "locality" },
                  ].map((f) => (
                    <div key={f.key}>
                      <label className="text-sm font-medium block mb-1">{f.label}{f.required && <span className="text-destructive">*</span>}</label>
                      <input value={(addressForm as any)[f.key]}
                        readOnly={(f as any).readOnly}
                        onChange={(e) => {
                          const val = e.target.value;
                          setAddressForm({ ...addressForm, [f.key]: val });
                          if ((f as any).autoFill && val.length === 6) {
                            fetch(`https://api.postalpincode.in/pincode/${val}`)
                              .then(r => r.json())
                              .then(data => {
                                if (data?.[0]?.Status === "Success" && data[0].PostOffice?.length) {
                                  const po = data[0].PostOffice[0];
                                  setAddressForm(prev => ({ ...prev, pincode: val, city: po.District || "", state: po.State || "" }));
                                }
                              }).catch(() => { });
                          }
                        }}
                        className={`w-full px-4 py-2.5 rounded-xl bg-secondary border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 ${(f as any).readOnly ? "opacity-70" : ""}`} />
                    </div>
                  ))}
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium block mb-1">Address<span className="text-destructive">*</span></label>
                    <textarea value={addressForm.address} onChange={(e) => setAddressForm({ ...addressForm, address: e.target.value })} rows={2}
                      className="w-full px-4 py-2.5 rounded-xl bg-secondary border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50" />
                  </div>
                  <div>
                    <label className="text-sm font-medium block mb-1">Landmark (Optional)</label>
                    <input value={addressForm.landmark} onChange={(e) => setAddressForm({ ...addressForm, landmark: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-secondary border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50" />
                  </div>
                  <div>
                    <label className="text-sm font-medium block mb-1">Alternate Phone (Optional)</label>
                    <input value={addressForm.alternate_phone} onChange={(e) => setAddressForm({ ...addressForm, alternate_phone: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-secondary border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50" />
                  </div>
                </div>
                <div className="mt-4">
                  <label className="text-sm font-medium block mb-2">Address Type</label>
                  <div className="flex gap-3">
                    {[{ value: "home", icon: Home, label: "Home" }, { value: "work", icon: Briefcase, label: "Work" }].map((t) => (
                      <button key={t.value} onClick={() => setAddressForm({ ...addressForm, address_type: t.value })}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${addressForm.address_type === t.value ? "bg-accent text-accent-foreground" : "bg-secondary text-foreground/70"}`}>
                        <t.icon className="w-4 h-4" />{t.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-4">
                  <input type="checkbox" checked={addressForm.is_default} onChange={(e) => setAddressForm({ ...addressForm, is_default: e.target.checked })} className="rounded" />
                  <label className="text-sm">Make this default address</label>
                </div>
                <div className="flex gap-3 mt-6">
                  <button onClick={saveAddress} className="px-6 py-2.5 bg-accent text-accent-foreground rounded-full font-medium">{editingAddressId ? "Update" : "Save"} Address</button>
                  <button onClick={() => { setShowAddressForm(false); setEditingAddressId(null); }} className="px-6 py-2.5 bg-secondary text-foreground rounded-full font-medium">Cancel</button>
                </div>
              </motion.div>
            )}

            <button onClick={() => { if (selectedAddress) setStep(1); else toast.error("Please select an address"); }}
              disabled={!selectedAddress}
              className="w-full py-3 bg-accent text-accent-foreground font-semibold rounded-full disabled:opacity-50 mt-4">
              Continue to Order Summary
            </button>
          </motion.div>
        )}

        {/* Step 2: Summary */}
        {step === 1 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <h2 className="font-display text-2xl font-semibold mb-6">Order Summary</h2>
            {selectedAddr && (
              <div className="glass-card p-4 mb-6">
                <p className="text-sm text-muted-foreground mb-1">Delivering to:</p>
                <p className="font-semibold">{selectedAddr.full_name}</p>
                <p className="text-sm text-muted-foreground">{selectedAddr.address}, {selectedAddr.city}, {selectedAddr.state} - {selectedAddr.pincode}</p>
              </div>
            )}
            <div className="space-y-3 mb-6">
              {items.map((item) => (
                <div key={item.product.id} className="glass-card p-4 flex items-center gap-4">
                  <img src={item.product.image} alt={item.product.name} className="w-16 h-16 rounded-lg object-cover" />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{item.product.name}</h3>
                    <p className="text-muted-foreground text-sm">Qty: {item.quantity}</p>
                  </div>
                  <p className="font-bold text-accent">₹{item.product.price * item.quantity}</p>
                </div>
              ))}
            </div>
            <div className="glass-card p-6 mb-6">
              <h3 className="font-semibold mb-4">Price Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Price ({items.reduce((s, i) => s + i.quantity, 0)} items)</span><span>₹{totalPrice}</span></div>
                {couponDiscount > 0 && <div className="flex justify-between text-primary"><span>Coupon Discount</span><span>-₹{couponDiscount}</span></div>}
                <div className="flex justify-between"><span className="text-muted-foreground">Delivery Charges</span><span className="text-primary">FREE</span></div>
                <div className="border-t border-border pt-2 flex justify-between font-bold text-lg">
                  <span>Total Amount</span><span className="text-accent">₹{finalTotal}</span>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep(0)} className="flex-1 py-3 bg-secondary text-foreground rounded-full font-medium">Back</button>
              <button onClick={() => setStep(2)} className="flex-1 py-3 bg-accent text-accent-foreground rounded-full font-semibold">Proceed to Payment</button>
            </div>
          </motion.div>
        )}

        {/* Step 3: Payment */}
        {step === 2 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <h2 className="font-display text-2xl font-semibold mb-6">Payment Method</h2>

            {/* Razorpay Option */}
            <div onClick={() => setPaymentMethod("razorpay")}
              className={`glass-card p-6 mb-3 cursor-pointer transition-all ${paymentMethod === "razorpay" ? "ring-2 ring-accent" : ""}`}>
              <div className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${paymentMethod === "razorpay" ? "border-accent" : "border-border"}`}>
                  {paymentMethod === "razorpay" && <div className="w-2.5 h-2.5 rounded-full bg-accent" />}
                </div>
                <div>
                  <span className="font-medium">Pay Online (Razorpay)</span>
                  <p className="text-muted-foreground text-sm">UPI, Cards, Net Banking, Wallets</p>
                </div>
              </div>
            </div>

            {/* COD Option */}
            {codAvailableForAll ? (
              <div onClick={() => setPaymentMethod("cod")}
                className={`glass-card p-6 mb-6 cursor-pointer transition-all ${paymentMethod === "cod" ? "ring-2 ring-accent" : ""}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${paymentMethod === "cod" ? "border-accent" : "border-border"}`}>
                    {paymentMethod === "cod" && <div className="w-2.5 h-2.5 rounded-full bg-accent" />}
                  </div>
                  <div>
                    <span className="font-medium">Cash on Delivery</span>
                    <p className="text-muted-foreground text-sm">Pay when your order is delivered</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="glass-card p-6 mb-6 opacity-50">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full border-2 border-border" />
                  <div>
                    <span className="font-medium">Cash on Delivery</span>
                    <p className="text-muted-foreground text-sm">COD not available for some items in your cart</p>
                  </div>
                </div>
              </div>
            )}

            <div className="glass-card p-6 mb-6">
              <div className="flex justify-between items-center">
                <span className="text-lg text-muted-foreground">Total</span>
                <span className="text-3xl font-bold gold-text">₹{finalTotal}</span>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="flex-1 py-3 bg-secondary text-foreground rounded-full font-medium">Back</button>
              <button onClick={placeOrder} disabled={placing}
                className="flex-1 py-4 bg-accent text-accent-foreground font-semibold rounded-full text-lg animate-glow-pulse hover:shadow-[0_0_40px_hsl(43_85%_55%/0.5)] transition-shadow disabled:opacity-50">
                {placing ? "Processing..." : paymentMethod === "razorpay" ? "Pay Now" : "Place Order"}
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </main>
  );
};

export default Checkout;
