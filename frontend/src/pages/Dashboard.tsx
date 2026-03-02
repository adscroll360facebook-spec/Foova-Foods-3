import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { User, Package, MapPin, LogOut, Plus, Trash2, Pencil, ExternalLink, Check, X, Home, Briefcase } from "lucide-react";
import { toast } from "sonner";

const orderStatuses = ["pending", "confirmed", "packed", "dispatched", "out_for_delivery", "delivered"];
const statusLabels: Record<string, string> = {
  pending: "Pending", confirmed: "Confirmed", packed: "Packed", dispatched: "Dispatched",
  out_for_delivery: "Out for Delivery", delivered: "Delivered", cancelled: "Cancelled",
};

const emptyAddressForm = {
  full_name: "", phone: "", pincode: "", city: "", state: "", locality: "", address: "", landmark: "", alternate_phone: "", address_type: "home", is_default: false,
};

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [tab, setTab] = useState<"profile" | "orders" | "addresses">("profile");
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ full_name: "", phone: "", address: "" });
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [addressForm, setAddressForm] = useState({ ...emptyAddressForm });
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    if (!user) { navigate("/login"); return; }
    let mounted = true;

    const load = async () => {
      try {
        const res = await fetch(`/api/user/data/${user.id}`);
        const data = await res.json();
        if (!mounted) return;

        if (data.error) {
          console.error("Dashboard load error:", data.error);
          return;
        }

        if (data.profile) {
          setProfile(data.profile);
          setForm({
            full_name: data.profile.full_name || "",
            phone: data.profile.phone || "",
            address: data.profile.address || ""
          });
        }
        if (data.orders) setOrders(data.orders);
        if (data.addresses) setAddresses(data.addresses);
      } catch (err) {
        console.error("Dashboard load exception:", err);
      }
    };
    load();

    return () => { mounted = false; };
  }, [user, navigate]);

  const saveProfile = async () => {
    if (!user) return;
    try {
      const res = await fetch("/api/user/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, user_id: user.id })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setProfile({ ...profile!, ...form });
      setEditing(false);
      toast.success("Profile updated");
    } catch (err: any) {
      toast.error(err.message || "Failed to update profile");
    }
  };

  const loadAddresses = async () => {
    if (!user) return;
    const res = await fetch(`/api/user/addresses/${user.id}`);
    const data = await res.json();
    if (Array.isArray(data)) setAddresses(data);
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
      setShowAddressForm(false);
      setEditingAddressId(null);
      setAddressForm({ ...emptyAddressForm });
      loadAddresses();
    } catch (err: any) {
      toast.error(err.message || "Failed to save address");
    }
  };

  const editAddress = (a: any) => {
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
      setAddresses((prev) => prev.filter((a) => a.id !== id));
      toast.success("Address deleted");
    } catch (err) {
      toast.error("Failed to delete address");
    }
  };

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await signOut();
    } catch (err) {
      // Even if signOut throws, we still clear local session
      console.error("Logout error:", err);
    } finally {
      // Force a full page reload to /login to guarantee
      // all in-memory state and Supabase session tokens are cleared
      window.location.href = "/";
    }
  };

  const tabs = [
    { key: "profile" as const, label: "Profile", icon: User },
    { key: "orders" as const, label: "Orders", icon: Package },
    { key: "addresses" as const, label: "Addresses", icon: MapPin },
  ];

  return (
    <main className="pt-28 pb-20 px-4">
      <div className="container mx-auto max-w-4xl">
        <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="font-display text-4xl font-bold mb-8">
          My <span className="gold-text">Account</span>
        </motion.h1>

        <div className="flex gap-3 mb-8 flex-wrap">
          {tabs.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)} className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all ${tab === t.key ? "bg-accent text-accent-foreground" : "bg-secondary text-foreground/70"}`}>
              <t.icon className="w-4 h-4" />{t.label}
            </button>
          ))}
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium bg-destructive/10 text-destructive ml-auto disabled:opacity-60 transition-opacity"
          >
            {loggingOut ? (
              <>
                <div className="w-4 h-4 border-2 border-destructive border-t-transparent rounded-full animate-spin" />
                Logging out...
              </>
            ) : (
              <>
                <LogOut className="w-4 h-4" />Logout
              </>
            )}
          </button>
        </div>

        {/* Profile Tab */}
        {tab === "profile" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-8">
            <h2 className="font-display text-2xl font-semibold mb-6">Profile Information</h2>
            {editing ? (
              <div className="space-y-4">
                {(["full_name", "phone", "address"] as const).map((field) => (
                  <div key={field}>
                    <label className="text-sm font-medium text-foreground/80 block mb-1 capitalize">{field.replace("_", " ")}</label>
                    <input value={form[field]} onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-secondary border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50" />
                  </div>
                ))}
                <div className="flex gap-3">
                  <button onClick={saveProfile} className="px-6 py-2.5 bg-accent text-accent-foreground rounded-full font-medium">Save</button>
                  <button onClick={() => setEditing(false)} className="px-6 py-2.5 bg-secondary text-foreground rounded-full font-medium">Cancel</button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div><span className="text-muted-foreground text-sm">Email</span><p className="font-medium">{user?.email}</p></div>
                <div><span className="text-muted-foreground text-sm">Name</span><p className="font-medium">{profile?.full_name || "Not set"}</p></div>
                <div><span className="text-muted-foreground text-sm">Phone</span><p className="font-medium">{profile?.phone || "Not set"}</p></div>
                <div><span className="text-muted-foreground text-sm">Address</span><p className="font-medium">{profile?.address || "Not set"}</p></div>
                <button onClick={() => setEditing(true)} className="px-6 py-2.5 bg-accent text-accent-foreground rounded-full font-medium">Edit Profile</button>
              </div>
            )}
          </motion.div>
        )}

        {/* Orders Tab */}
        {tab === "orders" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {orders.length === 0 ? (
              <div className="glass-card p-8 text-center">
                <Package className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No orders yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => {
                  const currentIdx = orderStatuses.indexOf(order.status);
                  return (
                    <div key={order.id} className="glass-card p-6">
                      <div className="flex justify-between items-start flex-wrap gap-2 mb-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Order #{order.id.slice(0, 8)}</p>
                          <p className="font-bold text-accent text-lg">₹{order.total}</p>
                          {order.coupon_code && <p className="text-xs text-primary">Coupon: {order.coupon_code} (-₹{order.discount_amount})</p>}
                          <p className="text-xs text-muted-foreground mt-1">Payment: {order.payment_method === "razorpay" ? "Online (Razorpay)" : "Cash on Delivery"}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${order.status === "delivered" ? "bg-primary/20 text-primary" : order.status === "cancelled" ? "bg-destructive/20 text-destructive" : "bg-accent/20 text-accent"}`}>
                          {statusLabels[order.status] || order.status}
                        </span>
                      </div>
                      {order.status !== "cancelled" && (
                        <div className="flex items-center gap-1 mb-4 overflow-x-auto pb-2">
                          {orderStatuses.map((s, i) => (
                            <div key={s} className="flex items-center gap-1 flex-shrink-0">
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${i <= currentIdx ? "bg-accent text-accent-foreground" : "bg-secondary text-muted-foreground"}`}>
                                {i <= currentIdx ? <Check className="w-3 h-3" /> : i + 1}
                              </div>
                              <span className={`text-xs whitespace-nowrap ${i <= currentIdx ? "text-accent font-medium" : "text-muted-foreground"}`}>
                                {statusLabels[s]}
                              </span>
                              {i < orderStatuses.length - 1 && <div className={`w-4 h-0.5 ${i < currentIdx ? "bg-accent" : "bg-border"}`} />}
                            </div>
                          ))}
                        </div>
                      )}
                      {order.tracking_number && (
                        <div className="bg-secondary/50 rounded-lg p-3 mb-3">
                          <p className="text-xs text-muted-foreground">Tracking: <span className="font-mono">{order.tracking_number}</span></p>
                          {order.tracking_link && (
                            <a href={order.tracking_link} target="_blank" rel="noopener noreferrer" className="text-accent text-xs flex items-center gap-1 mt-1">
                              Track Package <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      )}
                      <p className="text-muted-foreground text-sm">{new Date(order.created_at).toLocaleDateString()}</p>
                      {order.shipping_address && <p className="text-muted-foreground text-xs mt-1">📍 {order.shipping_address}</p>}
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {/* Addresses Tab */}
        {tab === "addresses" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-display text-2xl font-semibold">My Addresses</h2>
              {!showAddressForm && (
                <button onClick={() => { setEditingAddressId(null); setAddressForm({ ...emptyAddressForm }); setShowAddressForm(true); }}
                  className="flex items-center gap-2 px-5 py-2.5 bg-accent text-accent-foreground rounded-full font-medium text-sm">
                  <Plus className="w-4 h-4" /> Add Address
                </button>
              )}
            </div>

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

            {addresses.length === 0 && !showAddressForm ? (
              <div className="glass-card p-8 text-center">
                <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground mb-4">No addresses added yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {addresses.map((a) => (
                  <div key={a.id} className="glass-card p-5">
                    <div className="flex items-start justify-between">
                      <div>
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
                        <button onClick={() => editAddress(a)} className="p-2 hover:bg-secondary rounded-lg">
                          <Pencil className="w-4 h-4 text-muted-foreground" />
                        </button>
                        <button onClick={() => deleteAddress(a.id)} className="p-2 hover:bg-destructive/10 rounded-lg">
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </div>
    </main>
  );
};

export default Dashboard;
