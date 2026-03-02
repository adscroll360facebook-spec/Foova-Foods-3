import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  Package, ShoppingCart, Users, Plus, Pencil, Trash2, X, LayoutDashboard,
  Tag, Image, BarChart3, Eye, EyeOff, ToggleLeft, ToggleRight, Upload,
  Check, Truck, Clock, PackageCheck, MapPin, Phone, CreditCard, ChevronDown, ChevronUp,
  AlertTriangle, RefreshCw, History, Settings, Lock, Mail, Send, KeyRound, ShieldCheck,
  MessageSquare, Layout, ShoppingBag
} from "lucide-react";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useSiteSettings, SITE_KEYS } from "@/hooks/useSiteSettings";

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  original_price: number | null;
  category: string;
  badge: string | null;
  weight: string | null;
  image_url: string | null;
  in_stock: boolean;
  stock_quantity: number;
  created_at: string;
  updated_at: string;
}

interface Order {
  id: string;
  user_id: string;
  total: number;
  status: string;
  created_at: string;
  shipping_address: string;
  full_name?: string;
  email?: string;
  alternate_phone?: string;
  phone: string;
  coupon_code: string | null;
  discount_amount: number;
  tracking_number?: string;
  tracking_link?: string;
  items?: any[];
  payment_method?: string;
  payment_status?: string;
  transaction_id?: string;
  status_timeline?: { status: string; time: string }[];
}

interface Coupon {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
  min_order_amount: number | null;
  max_uses: number | null;
  used_count?: number;
  expires_at: string | null;
  is_active: boolean;
}

interface Testimonial {
  id: string;
  customer_name: string;
  text: string;
  rating: number;
  customer_image_url: string | null;
  is_visible: boolean;
  created_at: string;
}

interface Category {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

const statusLabels: Record<string, string> = {
  pending: "Pending", confirmed: "Confirmed", packed: "Packed", dispatched: "Dispatched",
  out_for_delivery: "Out for Delivery", delivered: "Delivered", cancelled: "Cancelled",
};
const statusIcons: Record<string, any> = {
  pending: Clock, confirmed: Check, packed: PackageCheck, dispatched: Truck,
  out_for_delivery: MapPin, delivered: Check, cancelled: X,
};
const orderStatusFlow = ["pending", "confirmed", "packed", "dispatched", "out_for_delivery", "delivered"];

const ADMIN_EMAIL = "foovafoods@gmail.com";

const AdminDashboard = () => {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { isProductFeatured, toggleFeaturedProduct, getFeaturedIds, loading: siteLoading, settings, getBool, reload, toggleBool } = useSiteSettings();
  const [tab, setTab] = useState<string>("overview");
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [banners, setBanners] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState({
    name: "", description: "", price: 0, original_price: 0, category: "General",
    badge: "", weight: "", image_url: "", in_stock: true, stock_quantity: 0, tags: [] as string[], cod_available: true,
  });
  const [tagInput, setTagInput] = useState("");

  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryForm, setCategoryForm] = useState({ name: "" });

  const [showCouponModal, setShowCouponModal] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [couponForm, setCouponForm] = useState({
    code: "", discount_type: "percentage", discount_value: 0, min_order_amount: 0, max_uses: 0, expires_at: "", is_active: true,
  });

  const [showTestimonialModal, setShowTestimonialModal] = useState(false);
  const [editingTestimonial, setEditingTestimonial] = useState<Testimonial | null>(null);
  const [testimonialForm, setTestimonialForm] = useState({
    customer_name: "", text: "", rating: 5, customer_image_url: "", is_visible: true,
  });

  const [bannerUploading, setBannerUploading] = useState(false);
  const [orderFilter, setOrderFilter] = useState("all");
  const [analyticsRange, setAnalyticsRange] = useState("7d");

  const [dataLoading, setDataLoading] = useState(false);
  const loadDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Only redirect AFTER auth has fully resolved — prevents flash-redirect on refresh
    if (authLoading) return;

    if (!user) {
      console.log("AdminDashboard: No user, redirecting to login");
      navigate("/login");
    } else if (!isAdmin && user.email !== ADMIN_EMAIL) {
      console.log("AdminDashboard: User is not admin and email does not match primary admin, redirecting to home");
      navigate("/");
    } else {
      console.log("AdminDashboard: Access granted for", user.email);
    }
  }, [user, isAdmin, authLoading, navigate]);


  useEffect(() => { loadData(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Custom API helper
  const apiCall = async (endpoint: string, method = "GET", body?: any) => {
    try {
      const token = localStorage.getItem("foova_token");
      const headers: any = { "Content-Type": "application/json" };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const options: any = { method, headers };
      if (body) options.body = JSON.stringify(body);

      const res = await fetch(endpoint, options);
      return await res.json();
    } catch (err) {
      console.error(`API Error (${endpoint}):`, err);
      return { error: "Failed to connect to backend" };
    }
  };

  const loadData = useCallback(async () => {
    if (loadDebounceRef.current) clearTimeout(loadDebounceRef.current);
    loadDebounceRef.current = setTimeout(async () => {
      setDataLoading(true);
      try {
        console.log("Fetching admin data from MongoDB backend...");
        const data = await apiCall("/api/admin/data");

        if (data.error) {
          toast.error("Backend Error: " + data.error);
          return;
        }

        if (data.products) setProducts(data.products);
        if (data.orders) setOrders(data.orders);
        if (data.coupons) setCoupons(data.coupons);
        if (data.testimonials) setTestimonials(data.testimonials);
        if (data.banners) setBanners(data.banners);
        if (data.profiles) setProfiles(data.profiles);
        if (data.categories) setCategories(data.categories);
      } catch (err) {
        console.error("AdminDashboard loadData error:", err);
        toast.error("Failed to load MongoDB data. Please refresh.");
      } finally {
        setDataLoading(false);
      }
    }, 200);
  }, []);

  // Category CRUD
  const handleSaveCategory = async () => {
    const payload = {
      id: editingCategory?.id || crypto.randomUUID(),
      name: categoryForm.name,
    };
    const result = await apiCall("/api/admin/categories", "POST", payload);
    if (result.error) { toast.error(result.error); return; }
    toast.success(editingCategory ? "Category updated" : "Category added");
    setShowCategoryModal(false); setEditingCategory(null); setCategoryForm({ name: "" }); loadData();
  };

  const deleteCategory = async (id: string) => {
    const result = await apiCall(`/api/admin/categories/${id}`, "DELETE");
    if (result.error) { toast.error(result.error); return; }
    toast.success("Category deleted"); loadData();
  };

  // Product CRUD
  const handleSaveProduct = async () => {
    const payload = {
      id: editingProduct?.id || crypto.randomUUID(),
      name: productForm.name, description: productForm.description, price: productForm.price,
      original_price: productForm.original_price || null, category: productForm.category,
      badge: productForm.badge || null, weight: productForm.weight || null,
      image_url: productForm.image_url || null, in_stock: productForm.stock_quantity > 0,
      stock_quantity: productForm.stock_quantity, tags: productForm.tags, cod_available: productForm.cod_available,
    };

    const result = await apiCall("/api/admin/products", "POST", payload);
    if (result.error) { toast.error(result.error); return; }

    toast.success(editingProduct ? "Product updated" : "Product added");
    setShowProductModal(false); setEditingProduct(null); resetProductForm(); loadData();
  };

  const deleteProduct = async (id: string) => {
    const result = await apiCall(`/api/admin/products/${id}`, "DELETE");
    if (result.error) { toast.error(result.error); return; }
    toast.success("Deleted"); loadData();
  };

  const openEditProduct = (p: Product) => {
    setEditingProduct(p);
    setProductForm({
      name: p.name, description: p.description || "", price: p.price,
      original_price: p.original_price || 0, category: p.category,
      badge: p.badge || "", weight: p.weight || "", image_url: p.image_url || "",
      in_stock: p.in_stock ?? true, stock_quantity: p.stock_quantity,
      tags: (p as any).tags || [], cod_available: (p as any).cod_available ?? true,
    });
    setShowProductModal(true);
  };

  const resetProductForm = () => setProductForm({
    name: "", description: "", price: 0, original_price: 0, category: "General",
    badge: "", weight: "", image_url: "", in_stock: true, stock_quantity: 0, tags: [], cod_available: true,
  });

  const toggleCodForProduct = async (p: Product) => {
    const current = (p as any).cod_available ?? true;
    try {
      await apiCall("/api/admin/products", "POST", { ...p, cod_available: !current });
      toast.success(`COD ${!current ? "enabled" : "disabled"} for ${p.name}`);
      loadData();
    } catch (err) { toast.error("Update failed"); }
  };

  const addTag = () => {
    if (tagInput.trim() && productForm.tags.length < 5) {
      setProductForm({ ...productForm, tags: [...productForm.tags, tagInput.trim()] });
      setTagInput("");
    }
  };

  // Order CRUD
  const updateOrderStatus = async (orderId: string, status: string) => {
    const result = await apiCall("/api/admin/orders/status", "POST", { orderId, status });
    if (result.error) { toast.error(result.error); return; }
    toast.success(`Status → ${statusLabels[status]}`); loadData();
  };

  const advanceOrderStatus = async (order: Order) => {
    const currentIdx = orderStatusFlow.indexOf(order.status);
    if (currentIdx < orderStatusFlow.length - 1) {
      const next = orderStatusFlow[currentIdx + 1];
      await updateOrderStatus(order.id, next);
    }
  };

  const updateTracking = async (orderId: string, tracking_number: string, tracking_link: string) => {
    try {
      await apiCall("/api/admin/orders/tracking", "POST", { orderId, tracking_number, tracking_link });
      toast.success("Tracking updated");
      loadData();
    } catch (err) { toast.error("Update failed"); }
  };

  // Coupon CRUD
  const handleSaveCoupon = async () => {
    const payload = {
      id: editingCoupon?.id || crypto.randomUUID(),
      code: couponForm.code.toUpperCase(), discount_type: couponForm.discount_type,
      discount_value: couponForm.discount_value,
      min_order_amount: couponForm.min_order_amount || null,
      max_uses: couponForm.max_uses || null,
      expires_at: couponForm.expires_at || null, is_active: couponForm.is_active,
    };

    const result = await apiCall("/api/admin/coupons", "POST", payload);
    if (result.error) { toast.error(result.error); return; }

    toast.success(editingCoupon ? "Coupon updated" : "Coupon created");
    setShowCouponModal(false); setEditingCoupon(null); loadData();
  };

  const deleteCoupon = async (id: string) => {
    const result = await apiCall(`/api/admin/coupons/${id}`, "DELETE");
    if (result.error) { toast.error(result.error); return; }
    toast.success("Deleted"); loadData();
  };

  // Site Settings CRUD
  const handleUpdateSetting = async (key: string, value: string) => {
    const result = await apiCall("/api/admin/settings", "POST", { key, value });
    if (!result.error) {
      toast.success("Setting updated");
      reload(); // From useSiteSettings
    } else toast.error(result.error);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, settingKey?: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.url) {
        if (settingKey) {
          handleUpdateSetting(settingKey, data.url);
        } else {
          setProductForm({ ...productForm, image_url: data.url });
        }
        toast.success("Upload successful");
      }
    } catch (err) {
      toast.error("Upload failed");
    }
  };

  const toggleCoupon = async (c: Coupon) => {
    const result = await apiCall("/api/admin/coupons", "POST", { ...c, id: c.id, is_active: !c.is_active });
    if (result.error) { toast.error(result.error); return; }
    loadData();
  };

  // Testimonial CRUD
  const handleSaveTestimonial = async () => {
    const payload = {
      id: editingTestimonial?.id || crypto.randomUUID(),
      customer_name: testimonialForm.customer_name, text: testimonialForm.text,
      rating: testimonialForm.rating, customer_image_url: testimonialForm.customer_image_url || null,
      is_visible: testimonialForm.is_visible,
    };

    const result = await apiCall("/api/admin/testimonials", "POST", payload);
    if (result.error) { toast.error(result.error); return; }

    toast.success(editingTestimonial ? "Updated" : "Added");
    setShowTestimonialModal(false); setEditingTestimonial(null); loadData();
  };

  const deleteTestimonial = async (id: string) => {
    const result = await apiCall(`/api/admin/testimonials/${id}`, "DELETE");
    if (result.error) { toast.error(result.error); return; }
    toast.success("Deleted"); loadData();
  };

  const uploadImage = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    return data.url;
  };

  // Banner
  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBannerUploading(true);
    try {
      const publicUrl = await uploadImage(file);
      const res = await apiCall("/api/admin/banners", "POST", { image_url: publicUrl, is_active: true, sort_order: banners.length });
      if (res.error) { toast.error(res.error); return; }
      toast.success("Banner uploaded");
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setBannerUploading(false);
    }
  };

  const toggleBanner = async (b: any) => {
    const result = await apiCall("/api/admin/banners", "POST", { ...b, id: b.id, is_active: !b.is_active });
    if (result.error) { toast.error(result.error); return; }
    loadData();
  };

  const deleteBanner = async (id: string) => {
    const result = await apiCall(`/api/admin/banners/${id}`, "DELETE");
    if (result.error) { toast.error(result.error); return; }
    toast.success("Deleted"); loadData();
  };

  // Analytics
  const getAnalyticsData = () => {
    const now = new Date();
    let days = 7;
    if (analyticsRange === "30d") days = 30;
    else if (analyticsRange === "6m") days = 180;
    else if (analyticsRange === "1y") days = 365;
    else if (analyticsRange === "all") days = 9999;

    const rangeOrders = orders.filter((o) => {
      const d = new Date(o.created_at);
      return (now.getTime() - d.getTime()) / 86400000 <= days;
    });

    const grouped: Record<string, { revenue: number; sales: number }> = {};
    rangeOrders.forEach((o) => {
      const d = new Date(o.created_at).toLocaleDateString();
      if (!grouped[d]) grouped[d] = { revenue: 0, sales: 0 };
      grouped[d].revenue += Number(o.total);
      grouped[d].sales += 1;
    });

    return Object.entries(grouped).map(([date, data]) => ({ date, ...data })).slice(-30);
  };

  const filteredOrders = orderFilter === "all" ? orders : orders.filter((o) => o.status === orderFilter);

  if (authLoading || (user && !isAdmin && user.email !== ADMIN_EMAIL && !authLoading)) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <div className="animate-spin w-10 h-10 border-2 border-accent border-t-transparent rounded-full" />
      <p className="text-muted-foreground text-sm">Verifying admin access...</p>
    </div>
  );

  const totalRevenue = orders.filter((o) => o.status !== "cancelled").reduce((s, o) => s + Number(o.total), 0);
  const stats = [
    { label: "Total Users", value: profiles.length, icon: Users, color: "text-accent" },
    { label: "Products", value: products.length, icon: Package, color: "text-primary" },
    { label: "Total Sales", value: orders.filter((o) => o.status === "delivered").length, icon: ShoppingCart, color: "text-emerald-light" },
    { label: "Revenue", value: `₹${totalRevenue.toLocaleString()}`, icon: BarChart3, color: "text-gold-muted" },
  ];

  const tabs = [
    { key: "overview", label: "Overview", icon: LayoutDashboard },
    { key: "products", label: "Products", icon: Package },
    { key: "categories", label: "Categories", icon: Tag },
    { key: "inventory", label: "Inventory", icon: AlertTriangle },
    { key: "orders", label: `Orders (${orders.length})`, icon: ShoppingCart },
    { key: "coupons", label: "Coupons", icon: Tag },
    { key: "banners", label: "Banners", icon: Image },
    { key: "testimonials", label: "Testimonials", icon: MessageSquare },
    { key: "site-settings", label: "Site Settings", icon: Settings },
    { key: "analytics", label: "Analytics", icon: BarChart3 },
  ];

  return (
    <main className="pt-28 pb-20 px-4">
      <div className="container mx-auto max-w-6xl">
        <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="font-display text-4xl font-bold mb-8">
          Admin <span className="gold-text">Dashboard</span>
        </motion.h1>

        <div className="flex gap-2 mb-8 flex-wrap">
          {tabs.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)} className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs sm:text-sm font-medium transition-all ${tab === t.key ? "bg-accent text-accent-foreground" : "bg-secondary text-foreground/70 hover:text-foreground"}`}>
              <t.icon className="w-4 h-4" /><span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>

        {/* OVERVIEW */}
        {tab === "overview" && (
          <div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {stats.map((s, i) => (
                <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="glass-card p-6">
                  <s.icon className={`w-8 h-8 ${s.color} mb-3`} />
                  <p className="text-2xl font-bold">{s.value}</p>
                  <p className="text-muted-foreground text-sm">{s.label}</p>
                </motion.div>
              ))}
            </div>

            {/* Stock Alert Widgets */}
            {(() => {
              const outOfStock = products.filter((p) => p.stock_quantity === 0);
              const lowStock = products.filter((p) => p.stock_quantity > 0 && p.stock_quantity <= 10);
              return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                  {/* Out of Stock Alert */}
                  <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}
                    className="glass-card p-5 border border-red-800/40 bg-red-950/10">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-red-600/20 flex items-center justify-center">
                        <AlertTriangle className="w-5 h-5 text-red-400" />
                      </div>
                      <div>
                        <p className="font-bold text-red-400">Out of Stock Alert</p>
                        <p className="text-xs text-muted-foreground">{outOfStock.length} product{outOfStock.length !== 1 ? "s" : ""} out of stock</p>
                      </div>
                    </div>
                    {outOfStock.length === 0 ? (
                      <p className="text-sm text-emerald-400">✓ All products are in stock</p>
                    ) : (
                      <div className="space-y-1.5">
                        {outOfStock.slice(0, 4).map((p) => (
                          <div key={p.id} className="flex items-center justify-between text-sm bg-red-950/20 px-3 py-2 rounded-lg">
                            <span className="truncate font-medium">{p.name}</span>
                            <span className="text-red-400 font-bold ml-2 flex-shrink-0">0 units</span>
                          </div>
                        ))}
                        {outOfStock.length > 4 && <p className="text-xs text-muted-foreground">+{outOfStock.length - 4} more...</p>}
                        <button onClick={() => setTab("inventory")} className="mt-2 text-xs text-accent hover:underline">View all →</button>
                      </div>
                    )}
                  </motion.div>

                  {/* Low Stock Alert */}
                  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }}
                    className="glass-card p-5 border border-orange-800/40 bg-orange-950/10">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center">
                        <Package className="w-5 h-5 text-orange-400" />
                      </div>
                      <div>
                        <p className="font-bold text-orange-400">Low Stock Alert</p>
                        <p className="text-xs text-muted-foreground">{lowStock.length} product{lowStock.length !== 1 ? "s" : ""} running low (≤10)</p>
                      </div>
                    </div>
                    {lowStock.length === 0 ? (
                      <p className="text-sm text-emerald-400">✓ No stock warnings</p>
                    ) : (
                      <div className="space-y-1.5">
                        {lowStock.sort((a, b) => a.stock_quantity - b.stock_quantity).slice(0, 4).map((p) => (
                          <div key={p.id} className="flex items-center justify-between text-sm bg-orange-950/20 px-3 py-2 rounded-lg">
                            <span className="truncate font-medium">{p.name}</span>
                            <span className="text-orange-400 font-bold ml-2 flex-shrink-0">{p.stock_quantity} left</span>
                          </div>
                        ))}
                        {lowStock.length > 4 && <p className="text-xs text-muted-foreground">+{lowStock.length - 4} more...</p>}
                        <button onClick={() => setTab("inventory")} className="mt-2 text-xs text-accent hover:underline">View all →</button>
                      </div>
                    )}
                  </motion.div>
                </div>
              );
            })()}

            {/* Recent orders */}
            <h3 className="font-display text-xl font-semibold mb-4">Recent Orders</h3>
            <div className="space-y-2">
              {orders.slice(0, 5).map((o) => (
                <div key={o.id} className="glass-card p-4 flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <p className="font-semibold text-sm">#{o.id.slice(0, 8)}</p>
                    <p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString()}</p>
                  </div>
                  <p className="text-accent font-bold">₹{o.total}</p>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${o.status === "delivered" ? "bg-primary/20 text-primary" : o.status === "cancelled" ? "bg-destructive/20 text-destructive" : "bg-accent/20 text-accent"}`}>
                    {statusLabels[o.status]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PRODUCTS */}
        {tab === "products" && (
          <div>
            <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <h2 className="font-display text-2xl font-semibold">Products</h2>
                {!siteLoading && (
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${getFeaturedIds().length >= 3
                    ? "bg-primary/20 text-primary"
                    : "bg-accent/20 text-accent"
                    }`}>
                    ⭐ {getFeaturedIds().length}/3 Featured
                  </span>
                )}
              </div>
              <button onClick={() => { resetProductForm(); setEditingProduct(null); setShowProductModal(true); }} className="flex items-center gap-2 px-5 py-2.5 bg-accent text-accent-foreground rounded-full font-medium text-sm">
                <Plus className="w-4 h-4" />Create Product
              </button>
            </div>
            <div className="hidden md:grid grid-cols-8 gap-4 px-4 mb-2 text-xs font-medium text-muted-foreground uppercase">
              <span className="col-span-2">Product</span><span>Price</span><span>Category</span><span>Stock</span><span>COD</span><span>Feature</span><span>Actions</span>
            </div>
            <div className="space-y-2">
              {products.map((p) => {
                const qty = p.stock_quantity ?? 0;
                const isOut = qty === 0;
                const isLow = qty > 0 && qty <= 10;
                const isFeatured = isProductFeatured(p.id);
                const atMax = getFeaturedIds().length >= 3;
                return (
                  <div key={p.id} className={`glass-card p-4 grid grid-cols-1 md:grid-cols-8 gap-4 items-center transition-all ${isFeatured ? "border border-primary/40 shadow-[0_0_12px_hsl(var(--primary)/0.15)]" : ""
                    }`}>
                    <div className="col-span-2 flex items-center gap-3">
                      {p.image_url && <img src={p.image_url} alt={p.name} className="w-12 h-12 rounded-lg object-cover" />}
                      <span className="font-medium truncate">{p.name}</span>
                    </div>
                    <span className="text-accent font-bold">₹{p.price}</span>
                    <span className="text-sm text-muted-foreground">{p.category}</span>
                    <span className={`text-sm font-bold px-2 py-1 rounded-lg w-fit ${isOut ? "bg-red-950/30 text-red-400" : isLow ? "bg-orange-950/30 text-orange-400" : "bg-emerald-950/30 text-emerald-400"
                      }`}>
                      {isOut ? "Out" : isLow ? `${qty} ⚠️` : "In Stock"}
                    </span>
                    <button onClick={() => toggleCodForProduct(p)} className="p-1" title="Toggle COD">
                      {(p as any).cod_available !== false ? <ToggleRight className="w-5 h-5 text-primary" /> : <ToggleLeft className="w-5 h-5 text-muted-foreground" />}
                    </button>
                    {/* ⭐ Homepage Feature Toggle */}
                    <button
                      title={isFeatured ? "Remove from homepage" : atMax ? "Max 3 featured" : "Add to homepage featured"}
                      disabled={siteLoading || (!isFeatured && atMax)}
                      onClick={async () => {
                        const result = await toggleFeaturedProduct(p.id);
                        if (result.success) {
                          toast.success(result.message);
                        } else {
                          toast.error(result.message);
                        }
                      }}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-200 ${isFeatured
                        ? "bg-primary text-primary-foreground shadow-[0_0_14px_hsl(var(--primary)/0.5)]"
                        : atMax
                          ? "bg-secondary text-muted-foreground opacity-40 cursor-not-allowed"
                          : "bg-secondary text-muted-foreground hover:bg-primary/20 hover:text-primary"
                        }`}
                    >
                      <span>{isFeatured ? "⭐" : "☆"}</span>
                      {isFeatured ? "ON" : "OFF"}
                    </button>
                    <div className="flex gap-2">
                      <button onClick={() => openEditProduct(p)} className="p-2 hover:bg-secondary rounded-lg"><Pencil className="w-4 h-4 text-muted-foreground" /></button>
                      <button onClick={() => deleteProduct(p.id)} className="p-2 hover:bg-destructive/10 rounded-lg"><Trash2 className="w-4 h-4 text-destructive" /></button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* CATEGORIES */}
        {tab === "categories" && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-display text-2xl font-semibold">Categories</h2>
              <button onClick={() => { setEditingCategory(null); setCategoryForm({ name: "" }); setShowCategoryModal(true); }}
                className="flex items-center gap-2 px-5 py-2.5 bg-accent text-accent-foreground rounded-full font-medium text-sm">
                <Plus className="w-4 h-4" />Add Category
              </button>
            </div>
            <div className="space-y-2">
              {categories.map((c) => (
                <div key={c.id} className="glass-card p-4 flex items-center justify-between">
                  <span className="font-medium">{c.name}</span>
                  <div className="flex gap-2">
                    <button onClick={() => { setEditingCategory(c); setCategoryForm({ name: c.name }); setShowCategoryModal(true); }}
                      className="p-2 hover:bg-secondary rounded-lg"><Pencil className="w-4 h-4 text-muted-foreground" /></button>
                    <button onClick={() => deleteCategory(c.id)} className="p-2 hover:bg-destructive/10 rounded-lg"><Trash2 className="w-4 h-4 text-destructive" /></button>
                  </div>
                </div>
              ))}
              {categories.length === 0 && <div className="glass-card p-8 text-center text-muted-foreground">No categories yet</div>}
            </div>
          </div>
        )}

        {/* INVENTORY MANAGEMENT */}
        {tab === "inventory" && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-display text-2xl font-semibold">Inventory <span className="gold-text">Management</span></h2>
              <button onClick={loadData} disabled={dataLoading} className="flex items-center gap-2 px-4 py-2 bg-secondary text-foreground rounded-full text-sm font-medium disabled:opacity-60">
                <RefreshCw className={`w-4 h-4 ${dataLoading ? "animate-spin" : ""}`} /> {dataLoading ? "Loading..." : "Refresh"}
              </button>
            </div>

            {/* Stock Summary Stats */}
            {(() => {
              const outP = products.filter((p) => p.stock_quantity === 0);
              const lowP = products.filter((p) => p.stock_quantity > 0 && p.stock_quantity <= 10);
              const inP = products.filter((p) => p.stock_quantity > 10);
              return (
                <div className="grid grid-cols-3 gap-4 mb-8">
                  <div className="glass-card p-5 border border-red-800/30">
                    <AlertTriangle className="w-8 h-8 text-red-400 mb-2" />
                    <p className="text-2xl font-bold text-red-400">{outP.length}</p>
                    <p className="text-sm text-muted-foreground">Out of Stock</p>
                  </div>
                  <div className="glass-card p-5 border border-orange-800/30">
                    <Package className="w-8 h-8 text-orange-400 mb-2" />
                    <p className="text-2xl font-bold text-orange-400">{lowP.length}</p>
                    <p className="text-sm text-muted-foreground">Low Stock (≤10)</p>
                  </div>
                  <div className="glass-card p-5 border border-emerald-800/30">
                    <PackageCheck className="w-8 h-8 text-emerald-400 mb-2" />
                    <p className="text-2xl font-bold text-emerald-400">{inP.length}</p>
                    <p className="text-sm text-muted-foreground">In Stock</p>
                  </div>
                </div>
              );
            })()}

            {/* Low Stock Products */}
            {products.filter((p) => p.stock_quantity <= 10).length > 0 && (
              <div className="mb-6">
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-orange-400" />
                  Low Stock Products
                  <span className="text-xs text-muted-foreground font-normal">(Sorted by lowest stock first)</span>
                </h3>
                <div className="space-y-2">
                  {products
                    .filter((p) => p.stock_quantity <= 10)
                    .sort((a, b) => a.stock_quantity - b.stock_quantity)
                    .map((p) => (
                      <InventoryRow key={p.id} product={p} onRestock={async (id, qty) => {
                        const result = await apiCall("/api/admin/products", "POST", { ...p, id, stock_quantity: qty, in_stock: qty > 0 });
                        if (!result.error) { toast.success(`Restocked ${p.name} to ${qty} units`); loadData(); }
                        else toast.error(result.error);
                      }} />
                    ))}
                </div>
              </div>
            )}

            {/* All Products Stock */}
            <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
              <History className="w-5 h-5 text-accent" /> All Products Stock Status
            </h3>
            <div className="space-y-2">
              {products
                .sort((a, b) => a.stock_quantity - b.stock_quantity)
                .map((p) => (
                  <InventoryRow key={p.id} product={p} onRestock={async (id, qty) => {
                    const result = await apiCall("/api/admin/products", "POST", { ...p, id, stock_quantity: qty, in_stock: qty > 0 });
                    if (!result.error) { toast.success(`Updated stock for ${p.name}`); loadData(); }
                    else toast.error(result.error);
                  }} />
                ))}
              {products.length === 0 && <div className="glass-card p-8 text-center text-muted-foreground">No products found</div>}
            </div>
          </div>
        )}

        {/* ORDERS - Advanced Management */}
        {tab === "orders" && (
          <div>
            <h2 className="font-display text-2xl font-semibold mb-4">Orders Management</h2>
            {/* Status filter tabs with counts */}
            <div className="flex gap-2 mb-6 flex-wrap">
              {["all", ...orderStatusFlow, "cancelled"].map((s) => {
                const count = s === "all" ? orders.length : orders.filter((o) => o.status === s).length;
                return (
                  <button key={s} onClick={() => setOrderFilter(s)}
                    className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${orderFilter === s ? "bg-accent text-accent-foreground" : "bg-secondary text-foreground/70"}`}>
                    {s === "all" ? "All" : statusLabels[s]} ({count})
                  </button>
                );
              })}
            </div>

            {/* Order Stats */}
            <div className="grid grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
              {orderStatusFlow.map((s) => {
                const count = orders.filter(o => o.status === s).length;
                const Icon = statusIcons[s] || Clock;
                return (
                  <div key={s} className="glass-card p-3 text-center">
                    <Icon className="w-5 h-5 mx-auto mb-1 text-accent" />
                    <p className="text-lg font-bold">{count}</p>
                    <p className="text-xs text-muted-foreground">{statusLabels[s]}</p>
                  </div>
                );
              })}
            </div>

            {filteredOrders.length === 0 ? (
              <div className="glass-card p-8 text-center text-muted-foreground">No orders</div>
            ) : (
              <div className="space-y-3">
                {filteredOrders.map((o) => (
                  <AdvancedOrderRow key={o.id} order={o} onStatusChange={updateOrderStatus} onAdvance={advanceOrderStatus} onTrackingUpdate={updateTracking} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* COUPONS */}
        {tab === "coupons" && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-display text-2xl font-semibold">Coupons</h2>
              <button onClick={() => { setEditingCoupon(null); setCouponForm({ code: "", discount_type: "percentage", discount_value: 0, min_order_amount: 0, max_uses: 0, expires_at: "", is_active: true }); setShowCouponModal(true); }}
                className="flex items-center gap-2 px-5 py-2.5 bg-accent text-accent-foreground rounded-full font-medium text-sm">
                <Plus className="w-4 h-4" />Create Coupon
              </button>
            </div>
            <div className="space-y-2">
              {coupons.map((c) => (
                <div key={c.id} className="glass-card p-4 flex items-center gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <p className="font-mono font-bold text-accent">{c.code}</p>
                    <p className="text-sm text-muted-foreground">{c.discount_type === "percentage" ? `${c.discount_value}% off` : `₹${c.discount_value} off`}
                      {c.min_order_amount ? ` (min ₹${c.min_order_amount})` : ""}</p>
                    {c.expires_at && <p className="text-xs text-muted-foreground">Expires: {new Date(c.expires_at).toLocaleDateString()}</p>}
                  </div>
                  <span className="text-xs text-muted-foreground">Used: {c.used_count}{c.max_uses ? `/${c.max_uses}` : ""}</span>
                  <button onClick={() => toggleCoupon(c)} className="p-2">
                    {c.is_active ? <ToggleRight className="w-5 h-5 text-primary" /> : <ToggleLeft className="w-5 h-5 text-muted-foreground" />}
                  </button>
                  <button onClick={() => { setEditingCoupon(c); setCouponForm({ code: c.code, discount_type: c.discount_type, discount_value: Number(c.discount_value), min_order_amount: Number(c.min_order_amount || 0), max_uses: c.max_uses || 0, expires_at: c.expires_at || "", is_active: c.is_active }); setShowCouponModal(true); }}
                    className="p-2 hover:bg-secondary rounded-lg"><Pencil className="w-4 h-4 text-muted-foreground" /></button>
                  <button onClick={() => deleteCoupon(c.id)} className="p-2 hover:bg-destructive/10 rounded-lg"><Trash2 className="w-4 h-4 text-destructive" /></button>
                </div>
              ))}
              {coupons.length === 0 && <div className="glass-card p-8 text-center text-muted-foreground">No coupons yet</div>}
            </div>
          </div>
        )}

        {/* BANNERS */}
        {tab === "site-settings" && (
          <div className="space-y-8">
            <h2 className="font-display text-2xl font-semibold mb-6">Site <span className="gold-text">Settings</span></h2>

            {/* Hero Section */}
            <div className="glass-card p-6">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Layout className="w-5 h-5" /> Hero Section</h3>
              <div className="space-y-4">
                <Field label="Hero Title" value={settings[SITE_KEYS.HERO_TITLE] || ""} onChange={(v) => handleUpdateSetting(SITE_KEYS.HERO_TITLE, v)} />
                <Field label="Hero Subtitle" value={settings[SITE_KEYS.HERO_SUBTITLE] || ""} onChange={(v) => handleUpdateSetting(SITE_KEYS.HERO_SUBTITLE, v)} />
                <Field label="Hero Description" value={settings[SITE_KEYS.HERO_DESCRIPTION] || ""} onChange={(v) => handleUpdateSetting(SITE_KEYS.HERO_DESCRIPTION, v)} textarea />
                <div>
                  <label className="text-sm font-medium block mb-2">Hero Background Image</label>
                  <div className="flex gap-4 items-end">
                    {settings[SITE_KEYS.HERO_BG_IMAGE] && <img src={settings[SITE_KEYS.HERO_BG_IMAGE]} className="w-32 h-20 object-cover rounded-lg" />}
                    <label className="flex items-center gap-2 px-4 py-2 bg-secondary rounded-xl cursor-pointer hover:bg-secondary/80">
                      <Upload className="w-4 h-4" /> Upload New
                      <input type="file" className="hidden" onChange={(e) => handleFileUpload(e, SITE_KEYS.HERO_BG_IMAGE)} />
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Coupon Banner */}
            <div className="glass-card p-6">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Tag className="w-5 h-5" /> Coupon Banner</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-3 mb-4">
                  <input type="checkbox" checked={getBool(SITE_KEYS.COUPON_BANNER_VISIBLE as any)} onChange={(e) => handleUpdateSetting(SITE_KEYS.COUPON_BANNER_VISIBLE, e.target.checked.toString())} className="rounded" />
                  <label className="text-sm font-medium">Show Coupon Banner on Homepage</label>
                </div>
                <Field label="Banner Text" value={settings[SITE_KEYS.COUPON_BANNER_TEXT] || ""} onChange={(v) => handleUpdateSetting(SITE_KEYS.COUPON_BANNER_TEXT, v)} />
                <Field label="Expiry Date" type="date" value={settings[SITE_KEYS.COUPON_BANNER_EXPIRY] || ""} onChange={(v) => handleUpdateSetting(SITE_KEYS.COUPON_BANNER_EXPIRY, v)} />
              </div>
            </div>

            {/* Offer System */}
            <div className="glass-card p-6">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Mail className="w-5 h-5" /> Send Mass Offer Email</h3>
              <div className="space-y-4">
                <input placeholder="Offer Title (Email Subject)" className="w-full px-4 py-2.5 rounded-xl bg-secondary border border-border" id="offer-title" />
                <textarea placeholder="Offer Message (HTML supported)" className="w-full px-4 py-2.5 rounded-xl bg-secondary border border-border" rows={4} id="offer-message" />
                <button onClick={async () => {
                  const title = (document.getElementById("offer-title") as HTMLInputElement).value;
                  const message = (document.getElementById("offer-message") as HTMLTextAreaElement).value;
                  if (!title || !message) return toast.error("Fill both fields");
                  const res = await apiCall("/api/admin/offers", "POST", { title, message });
                  if (!res.error) toast.success("Emails sent to all users!");
                  else toast.error(res.error);
                }} className="px-6 py-2 bg-accent text-accent-foreground rounded-full font-bold">Send to All Users</button>
              </div>
            </div>
          </div>
        )}

        {/* TESTIMONIALS */}
        {tab === "testimonials" && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-display text-2xl font-semibold">Testimonials</h2>
              <button onClick={() => { setEditingTestimonial(null); setTestimonialForm({ customer_name: "", text: "", rating: 5, customer_image_url: "", is_visible: true }); setShowTestimonialModal(true); }}
                className="flex items-center gap-2 px-5 py-2.5 bg-accent text-accent-foreground rounded-full font-medium text-sm">
                <Plus className="w-4 h-4" />Add Testimonial
              </button>
            </div>
            <div className="space-y-2">
              {testimonials.map((t) => (
                <div key={t.id} className="glass-card p-4 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{t.customer_name}</p>
                    <p className="text-muted-foreground text-sm truncate">{t.text}</p>
                    <span className="text-xs text-accent">{"⭐".repeat(t.rating)}</span>
                  </div>
                  <button onClick={() => {
                    apiCall("/api/admin/testimonials", "POST", { ...t, is_visible: !t.is_visible }).then(() => loadData());
                  }} className={`p-2 rounded-lg transition-colors ${t.is_visible ? "bg-primary/20 text-primary hover:bg-primary/30" : "bg-muted text-muted-foreground hover:bg-muted/40"}`}>
                    {t.is_visible ? <Eye className="w-4 h-4 text-primary" /> : <EyeOff className="w-4 h-4 text-muted-foreground" />}
                  </button>
                  <button onClick={() => { setEditingTestimonial(t); setTestimonialForm({ customer_name: t.customer_name, text: t.text, rating: t.rating, customer_image_url: t.customer_image_url || "", is_visible: t.is_visible }); setShowTestimonialModal(true); }}
                    className="p-2 hover:bg-secondary rounded-lg"><Pencil className="w-4 h-4 text-muted-foreground" /></button>
                  <button onClick={() => deleteTestimonial(t.id)} className="p-2 hover:bg-destructive/10 rounded-lg"><Trash2 className="w-4 h-4 text-destructive" /></button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ANALYTICS */}
        {tab === "analytics" && (
          <div>
            <h2 className="font-display text-2xl font-semibold mb-6">Analytics</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {stats.map((s) => (
                <div key={s.label} className="glass-card p-5">
                  <s.icon className={`w-6 h-6 ${s.color} mb-2`} />
                  <p className="text-xl font-bold">{s.value}</p>
                  <p className="text-muted-foreground text-xs">{s.label}</p>
                </div>
              ))}
            </div>
            <div className="glass-card p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-semibold">Sales Overview</h3>
                <div className="flex gap-2">
                  {[{ k: "7d", l: "7D" }, { k: "30d", l: "1M" }, { k: "6m", l: "6M" }, { k: "1y", l: "1Y" }, { k: "all", l: "All" }].map((r) => (
                    <button key={r.k} onClick={() => setAnalyticsRange(r.k)}
                      className={`px-3 py-1 rounded-full text-xs ${analyticsRange === r.k ? "bg-accent text-accent-foreground" : "bg-secondary text-muted-foreground"}`}>
                      {r.l}
                    </button>
                  ))}
                </div>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={getAnalyticsData()}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", color: "hsl(var(--foreground))" }} />
                  <Legend />
                  <Bar dataKey="revenue" fill="hsl(var(--accent))" name="Revenue (₹)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="sales" fill="hsl(var(--primary))" name="Sales" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* SETTINGS */}
        {tab === "settings" && (
          <AdminSettings user={user} />
        )}

        {/* PRODUCT MODAL */}
        {showProductModal && (
          <Modal onClose={() => setShowProductModal(false)} title={`${editingProduct ? "Edit" : "Create"} Product`}>
            <div className="space-y-4">
              <Field label="Product Name" value={productForm.name} onChange={(v) => setProductForm({ ...productForm, name: v })} />
              <Field label="Description" value={productForm.description} onChange={(v) => setProductForm({ ...productForm, description: v })} textarea />
              <div className="grid grid-cols-2 gap-4">
                <Field label="Price (INR)" value={productForm.price} onChange={(v) => setProductForm({ ...productForm, price: Number(v) })} type="number" />
                <Field label="Original Price" value={productForm.original_price} onChange={(v) => setProductForm({ ...productForm, original_price: Number(v) })} type="number" />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Category</label>
                <select value={productForm.category} onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-secondary border border-border text-foreground">
                  {categories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
                  {categories.length === 0 && <option value="General">General</option>}
                </select>
              </div>
              <Field label="Stock Quantity" value={productForm.stock_quantity} onChange={(v) => setProductForm({ ...productForm, stock_quantity: Number(v) })} type="number" />
              <div className="flex items-center gap-3">
                <input type="checkbox" checked={productForm.cod_available} onChange={(e) => setProductForm({ ...productForm, cod_available: e.target.checked })} className="rounded" />
                <label className="text-sm font-medium">Cash on Delivery Available</label>
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Tags (max 5)</label>
                <div className="flex gap-2 mb-2 flex-wrap">
                  {productForm.tags.map((t, i) => (
                    <span key={i} className="px-2 py-1 bg-accent/10 text-accent text-xs rounded-full flex items-center gap-1">
                      {t} <button onClick={() => setProductForm({ ...productForm, tags: productForm.tags.filter((_, j) => j !== i) })}><X className="w-3 h-3" /></button>
                    </span>
                  ))}
                </div>
                {productForm.tags.length < 5 && (
                  <div className="flex gap-2">
                    <input value={tagInput} onChange={(e) => setTagInput(e.target.value)} placeholder="Add tag" onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                      className="flex-1 px-4 py-2 rounded-xl bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent/50" />
                    <button onClick={addTag} className="px-4 py-2 bg-secondary rounded-xl text-sm">Add</button>
                  </div>
                )}
              </div>
              <Field label="Badge" value={productForm.badge} onChange={(v) => setProductForm({ ...productForm, badge: v })} />
              <Field label="Weight" value={productForm.weight} onChange={(v) => setProductForm({ ...productForm, weight: v })} />
              {/* ── Product Image Upload ── */}
              <div>
                <label className="text-sm font-medium block mb-2">Product Image</label>
                {/* Preview */}
                {productForm.image_url && (
                  <div className="relative mb-3 rounded-xl overflow-hidden border border-border bg-secondary/50">
                    <img src={productForm.image_url} alt="Preview" className="w-full h-40 object-contain" onError={(e) => { (e.target as HTMLImageElement).src = ""; }} />
                    <button type="button" onClick={() => setProductForm({ ...productForm, image_url: "" })}
                      className="absolute top-2 right-2 w-7 h-7 rounded-full bg-destructive/80 text-white flex items-center justify-center hover:bg-destructive">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
                {/* Upload Area */}
                {!productForm.image_url && (
                  <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-accent/50 hover:bg-accent/5 transition-all group">
                    <Upload className="w-8 h-8 text-muted-foreground group-hover:text-accent mb-2 transition-colors" />
                    <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground">Click to upload or drag image</span>
                    <span className="text-xs text-muted-foreground mt-1">PNG, JPG, WEBP — Max 5 MB</span>
                    <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (file.size > 5 * 1024 * 1024) { toast.error("Image must be under 5 MB"); return; }

                      toast.loading("Uploading image...", { id: "img-upload" });
                      try {
                        const publicUrl = await uploadImage(file);
                        setProductForm({ ...productForm, image_url: publicUrl });
                        toast.success("Image uploaded!", { id: "img-upload" });
                      } catch (err: any) {
                        toast.error(`Upload failed: ${err.message}`, { id: "img-upload" });
                      }
                    }} />
                  </label>
                )}
                {/* OR: paste URL */}
                <div className="flex items-center gap-3 mt-3">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-xs text-muted-foreground uppercase">or paste URL</span>
                  <div className="flex-1 h-px bg-border" />
                </div>
                <input
                  value={productForm.image_url}
                  onChange={(e) => setProductForm({ ...productForm, image_url: e.target.value })}
                  placeholder="https://example.com/image.jpg"
                  className="w-full mt-2 px-4 py-2.5 rounded-xl bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
                />
              </div>
              <button onClick={handleSaveProduct} className="w-full py-3 bg-accent text-accent-foreground rounded-full font-semibold">
                {editingProduct ? "Update" : "Create"} Product
              </button>
            </div>
          </Modal>
        )}

        {/* CATEGORY MODAL */}
        {showCategoryModal && (
          <Modal onClose={() => setShowCategoryModal(false)} title={`${editingCategory ? "Edit" : "Create"} Category`}>
            <div className="space-y-4">
              <Field label="Category Name" value={categoryForm.name} onChange={(v) => setCategoryForm({ ...categoryForm, name: v })} />
              <button onClick={handleSaveCategory} className="w-full py-3 bg-accent text-accent-foreground rounded-full font-semibold">
                {editingCategory ? "Update" : "Create"} Category
              </button>
            </div>
          </Modal>
        )}

        {/* COUPON MODAL */}
        {showCouponModal && (
          <Modal onClose={() => setShowCouponModal(false)} title={`${editingCoupon ? "Edit" : "Create"} Coupon`}>
            <div className="space-y-4">
              <Field label="Coupon Code" value={couponForm.code} onChange={(v) => setCouponForm({ ...couponForm, code: v.toUpperCase() })} />
              <div>
                <label className="text-sm font-medium block mb-1">Discount Type</label>
                <select value={couponForm.discount_type} onChange={(e) => setCouponForm({ ...couponForm, discount_type: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-secondary border border-border text-foreground">
                  <option value="percentage">Percentage</option>
                  <option value="fixed">Fixed Amount</option>
                </select>
              </div>
              <Field label={couponForm.discount_type === "percentage" ? "Discount %" : "Discount Amount"} value={couponForm.discount_value} onChange={(v) => setCouponForm({ ...couponForm, discount_value: Number(v) })} type="number" />
              <Field label="Min Order Amount" value={couponForm.min_order_amount} onChange={(v) => setCouponForm({ ...couponForm, min_order_amount: Number(v) })} type="number" />
              <Field label="Max Uses (0 = unlimited)" value={couponForm.max_uses} onChange={(v) => setCouponForm({ ...couponForm, max_uses: Number(v) })} type="number" />
              <div>
                <label className="text-sm font-medium block mb-1">Expiration Date</label>
                <input type="date" value={couponForm.expires_at?.split("T")[0] || ""} onChange={(e) => setCouponForm({ ...couponForm, expires_at: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-secondary border border-border text-foreground" />
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" checked={couponForm.is_active} onChange={(e) => setCouponForm({ ...couponForm, is_active: e.target.checked })} className="rounded" />
                <label className="text-sm">Active</label>
              </div>
              <button onClick={handleSaveCoupon} className="w-full py-3 bg-accent text-accent-foreground rounded-full font-semibold">
                {editingCoupon ? "Update" : "Create"} Coupon
              </button>
            </div>
          </Modal>
        )}

        {/* TESTIMONIAL MODAL */}
        {showTestimonialModal && (
          <Modal onClose={() => setShowTestimonialModal(false)} title={`${editingTestimonial ? "Edit" : "Add"} Testimonial`}>
            <div className="space-y-4">
              <Field label="Customer Name" value={testimonialForm.customer_name} onChange={(v) => setTestimonialForm({ ...testimonialForm, customer_name: v })} />
              <Field label="Review Text" value={testimonialForm.text} onChange={(v) => setTestimonialForm({ ...testimonialForm, text: v })} textarea />
              <Field label="Rating (1-5)" value={testimonialForm.rating} onChange={(v) => setTestimonialForm({ ...testimonialForm, rating: Math.min(5, Math.max(1, Number(v))) })} type="number" />
              <Field label="Image URL (Optional)" value={testimonialForm.customer_image_url} onChange={(v) => setTestimonialForm({ ...testimonialForm, customer_image_url: v })} />
              <div className="flex items-center gap-3">
                <input type="checkbox" checked={testimonialForm.is_visible} onChange={(e) => setTestimonialForm({ ...testimonialForm, is_visible: e.target.checked })} className="rounded" />
                <label className="text-sm">Visible on homepage</label>
              </div>
              <button onClick={handleSaveTestimonial} className="w-full py-3 bg-accent text-accent-foreground rounded-full font-semibold">
                {editingTestimonial ? "Update" : "Add"} Testimonial
              </button>
            </div>
          </Modal>
        )}
      </div>
    </main>
  );
};

// Reusable components
const Modal = ({ onClose, title, children }: { onClose: () => void; title: string; children: React.ReactNode }) => (
  <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-card p-8 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
      <div className="flex justify-between items-center mb-6">
        <h3 className="font-display text-xl font-semibold">{title}</h3>
        <button onClick={onClose}><X className="w-5 h-5" /></button>
      </div>
      {children}
    </motion.div>
  </div>
);

const Field = ({ label, value, onChange, type = "text", textarea }: { label: string; value: any; onChange: (v: string) => void; type?: string; textarea?: boolean }) => (
  <div>
    <label className="text-sm font-medium block mb-1">{label}</label>
    {textarea ? (
      <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={3}
        className="w-full px-4 py-2.5 rounded-xl bg-secondary border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50" />
    ) : (
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-2.5 rounded-xl bg-secondary border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50" />
    )}
  </div>
);

// Advanced Order Row with step-by-step management
const AdvancedOrderRow = ({ order, onStatusChange, onAdvance, onTrackingUpdate }: { order: Order; onStatusChange: (id: string, s: string) => void; onAdvance: (order: Order) => void; onTrackingUpdate: (id: string, tn: string, tl: string) => void }) => {
  const [expanded, setExpanded] = useState(false);
  const [showTracking, setShowTracking] = useState(false);
  const [tn, setTn] = useState(order.tracking_number || "");
  const [tl, setTl] = useState(order.tracking_link || "");
  const items = Array.isArray(order.items) ? order.items as any[] : [];
  const currentIdx = orderStatusFlow.indexOf(order.status);
  const canAdvance = order.status !== "cancelled" && order.status !== "delivered";

  return (
    <div className="glass-card p-5">
      {/* Header */}
      <div className="flex justify-between items-start gap-3 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <p className="font-semibold">#{order.id.slice(0, 8)}</p>
            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${order.status === "delivered" ? "bg-primary/20 text-primary" : order.status === "cancelled" ? "bg-destructive/20 text-destructive" : "bg-accent/20 text-accent"}`}>
              {statusLabels[order.status]}
            </span>
            <span className="text-accent font-bold">₹{order.total}</span>
            <span className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleDateString()}</span>
            <span className="text-xs px-2 py-0.5 bg-secondary rounded-full">{order.payment_method === "razorpay" ? "Online" : "COD"}</span>
          </div>
        </div>
        {expanded ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
      </div>

      {/* Expanded Details */}
      {expanded && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-4 space-y-4">
          {/* Order Progress */}
          {order.status !== "cancelled" && (
            <div className="bg-secondary/30 rounded-xl p-4">
              <p className="text-xs font-medium text-muted-foreground mb-3">ORDER PROGRESS</p>
              <div className="flex items-center gap-1 overflow-x-auto pb-2">
                {orderStatusFlow.map((s, i) => {
                  const Icon = statusIcons[s] || Clock;
                  return (
                    <div key={s} className="flex items-center gap-1 flex-shrink-0">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${i <= currentIdx ? "bg-accent text-accent-foreground" : "bg-secondary text-muted-foreground"}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className={`text-xs whitespace-nowrap ${i <= currentIdx ? "text-accent font-medium" : "text-muted-foreground"}`}>
                        {statusLabels[s]}
                      </span>
                      {i < orderStatusFlow.length - 1 && <div className={`w-6 h-0.5 ${i < currentIdx ? "bg-accent" : "bg-border"}`} />}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Items */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">ITEMS ({items.length})</p>
            <div className="space-y-2">
              {items.map((item: any, idx: number) => (
                <div key={idx} className="flex items-center gap-3 bg-secondary/30 rounded-lg p-2">
                  {item.image && <img src={item.image} alt={item.name} className="w-10 h-10 rounded object-cover" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground">Qty: {item.quantity} × ₹{item.price}</p>
                  </div>
                  <p className="text-sm font-bold text-accent">₹{item.price * item.quantity}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Customer & Delivery Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-secondary/30 rounded-lg p-3">
              <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1"><MapPin className="w-3 h-3" /> DELIVERY INFO</p>
              <p className="text-sm font-semibold mb-1">{order.full_name || "N/A"}</p>
              <p className="text-sm text-foreground/80">{order.shipping_address}</p>
              <div className="mt-2 space-y-1">
                {order.phone && <p className="text-sm font-medium flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-accent" /><span className="text-accent">{order.phone}</span></p>}
                {order.alternate_phone && <p className="text-sm flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-muted-foreground" /><span className="text-muted-foreground">Alt: {order.alternate_phone}</span></p>}
                {order.email && <p className="text-xs text-muted-foreground mt-1">✉️ {order.email}</p>}
              </div>
            </div>
            <div className="bg-secondary/30 rounded-lg p-3">
              <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1"><CreditCard className="w-3 h-3" /> PAYMENT & STATUS</p>
              <p className="text-sm">Method: {order.payment_method === "razorpay" ? "Online (Razorpay)" : "Cash on Delivery"}</p>
              <p className="text-sm capitalize">Payment: <span className={order.payment_status === "paid" ? "text-primary font-bold" : "text-accent"}>{order.payment_status || "Pending"}</span></p>
              {order.transaction_id && <p className="text-xs text-muted-foreground mt-1">TXN: {order.transaction_id}</p>}
              {order.coupon_code && <p className="text-xs text-primary mt-1">Coupon: {order.coupon_code} (-₹{order.discount_amount})</p>}
            </div>
          </div>

          {/* Status Timeline */}
          {order.status_timeline && order.status_timeline.length > 0 && (
            <div className="bg-secondary/30 rounded-lg p-3">
              <p className="text-xs font-medium text-muted-foreground mb-2">STATUS HISTORY</p>
              <div className="space-y-1">
                {order.status_timeline.map((st: any, i: number) => (
                  <div key={i} className="flex justify-between text-xs">
                    <span className="capitalize">{statusLabels[st.status] || st.status}</span>
                    <span className="text-muted-foreground">{new Date(st.time).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {/* Tracking */}
          {order.tracking_number && (
            <div className="bg-secondary/30 rounded-lg p-3">
              <p className="text-xs font-medium text-muted-foreground mb-1">TRACKING</p>
              <p className="text-sm font-mono">{order.tracking_number}</p>
              {order.tracking_link && <a href={order.tracking_link} target="_blank" rel="noopener noreferrer" className="text-accent text-xs hover:underline">Track →</a>}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
            {/* Quick advance button */}
            {canAdvance && (
              <button onClick={() => onAdvance(order)} className="px-4 py-2 bg-accent text-accent-foreground rounded-full text-sm font-medium flex items-center gap-2">
                <Check className="w-4 h-4" />
                Move to: {statusLabels[orderStatusFlow[currentIdx + 1]]}
              </button>
            )}

            {/* Status dropdown */}
            <select value={order.status} onChange={(e) => onStatusChange(order.id, e.target.value)}
              className="px-3 py-2 rounded-lg bg-secondary border border-border text-foreground text-sm">
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="packed">Packed</option>
              <option value="dispatched">Dispatched</option>
              <option value="out_for_delivery">Out for Delivery</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>

            {/* Tracking button */}
            <button onClick={() => setShowTracking(!showTracking)} className="px-4 py-2 bg-secondary text-foreground rounded-full text-sm font-medium">
              {showTracking ? "Hide" : "Add"} Tracking
            </button>
          </div>

          {showTracking && (
            <div className="flex gap-2 flex-wrap">
              <input value={tn} onChange={(e) => setTn(e.target.value)} placeholder="Tracking #" className="flex-1 px-3 py-2 rounded-lg bg-secondary border border-border text-sm text-foreground min-w-[120px]" />
              <input value={tl} onChange={(e) => setTl(e.target.value)} placeholder="Tracking Link" className="flex-1 px-3 py-2 rounded-lg bg-secondary border border-border text-sm text-foreground min-w-[120px]" />
              <button onClick={() => onTrackingUpdate(order.id, tn, tl)} className="px-4 py-2 bg-accent text-accent-foreground rounded-lg text-sm font-medium">Save</button>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
};

// Inventory Row – inline restock control
const InventoryRow = ({
  product,
  onRestock,
}: {
  product: Product;
  onRestock: (id: string, qty: number) => Promise<void>;
}) => {
  const qty = product.stock_quantity ?? 0;
  const isOut = qty === 0;
  const isLow = qty > 0 && qty <= 10;
  const [restockQty, setRestockQty] = useState(qty);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    await onRestock(product.id, restockQty);
    setSaving(false);
  };

  return (
    <div className={`glass-card p-4 flex items-center gap-4 flex-wrap ${isOut ? "border border-red-800/30" : isLow ? "border border-orange-800/30" : ""}`}>
      {product.image_url && (
        <img src={product.image_url} alt={product.name} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <p className="font-semibold truncate">{product.name}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Last Updated: {new Date(product.updated_at).toLocaleString()}
        </p>
      </div>
      <span className={`text-sm font-bold px-3 py-1 rounded-full flex-shrink-0 ${isOut ? "bg-red-950/40 text-red-400" : isLow ? "bg-orange-950/40 text-orange-400" : "bg-emerald-950/40 text-emerald-400"}`}>
        {isOut ? "OUT OF STOCK" : isLow ? `Low: ${qty} left` : `In Stock: ${qty}`}
      </span>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={0}
          value={restockQty}
          onChange={(e) => setRestockQty(Math.max(0, Number(e.target.value)))}
          className="w-20 px-3 py-1.5 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
        />
        <button
          onClick={save}
          disabled={saving || restockQty === qty}
          className="px-4 py-1.5 bg-accent text-accent-foreground rounded-full text-xs font-semibold disabled:opacity-50"
        >
          {saving ? "Saving..." : "Update"}
        </button>
      </div>
    </div>
  );
};

// ─── Admin Settings Panel ────────────────────────────────────────────────────
const AdminSettings = ({ user }: { user: any }) => {
  // ── Site-wide section toggles ──────────────────────────────────────────────
  const { getBool, toggleBool, loading: settingsLoading } = useSiteSettings();
  const featuredVisible = getBool(SITE_KEYS.FEATURED_VISIBLE);
  const [togglingFeatured, setTogglingFeatured] = useState(false);

  const handleToggleFeatured = async () => {
    setTogglingFeatured(true);
    await toggleBool(SITE_KEYS.FEATURED_VISIBLE, featuredVisible);
    setTogglingFeatured(false);
    toast.success(featuredVisible ? "Featured Products hidden on homepage" : "Featured Products shown on homepage");
  };

  // Change Password

  const [pwForm, setPwForm] = useState({ current: "", newPw: "", confirm: "" });
  const [pwLoading, setPwLoading] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  // Change Email
  const [emailForm, setEmailForm] = useState({ newEmail: "", confirmEmail: "" });
  const [emailLoading, setEmailLoading] = useState(false);

  // Reset link
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const handleChangePassword = async () => {
    if (!pwForm.current || !pwForm.newPw || !pwForm.confirm) {
      toast.error("Please fill all fields"); return;
    }
    if (pwForm.newPw.length < 8) {
      toast.error("New password must be at least 8 characters"); return;
    }
    if (pwForm.newPw !== pwForm.confirm) {
      toast.error("Passwords do not match"); return;
    }
    setPwLoading(true);
    try {
      const token = localStorage.getItem("foova_token");
      const storedUser = localStorage.getItem("foova_user");
      const userId = storedUser ? JSON.parse(storedUser).id : null;
      if (!userId) { toast.error("Not logged in"); return; }
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ userId, currentPassword: pwForm.current, newPassword: pwForm.newPw })
      });
      const data = await res.json();
      if (data.error) { toast.error(data.error); }
      else {
        toast.success("Password changed successfully!");
        setPwForm({ current: "", newPw: "", confirm: "" });
      }
    } catch (err) { toast.error("Failed to change password"); }
    finally { setPwLoading(false); }
  };

  const handleSendResetLink = async () => {
    setResetLoading(true);
    try {
      const adminEmail = user?.email || ADMIN_EMAIL;
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: adminEmail })
      });
      const data = await res.json();
      if (data.error) toast.error(data.error);
      else { setResetSent(true); toast.success(`Reset link sent to ${adminEmail}`); }
    } catch (err) { toast.error("Failed to send reset link"); }
    finally { setResetLoading(false); }
  };

  const handleChangeEmail = async () => {
    toast.info("Email change functionality is being migrated.");
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 max-w-2xl mx-auto">
      <h2 className="font-display text-2xl font-bold">
        Admin <span className="gold-text">Settings</span>
      </h2>

      {/* Current Account Info */}
      <div className="glass-card p-6 border border-accent/20">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-accent" />
          </div>
          <div>
            <p className="font-semibold">Logged in as Admin</p>
            <p className="text-sm text-muted-foreground">{user?.email || ADMIN_EMAIL}</p>
          </div>
        </div>
      </div>

      {/* ── Homepage Sections Control ───────────────────────────────────── */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center">
            <LayoutDashboard className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">Homepage Sections</h3>
            <p className="text-xs text-muted-foreground">Show or hide sections on the main homepage</p>
          </div>
        </div>

        <div className="space-y-3">
          {/* Featured Products Toggle */}
          <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-xl">
            <div>
              <p className="font-medium text-sm">Featured Products Section</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                "Handpicked premium selections for your Ramadan celebrations"
              </p>
            </div>
            <button
              onClick={handleToggleFeatured}
              disabled={togglingFeatured || settingsLoading}
              className={`relative flex items-center gap-2 px-4 py-2 rounded-full font-medium text-sm transition-all duration-300 disabled:opacity-60 ${featuredVisible
                ? "bg-primary text-primary-foreground shadow-[0_0_20px_hsl(var(--primary)/0.4)]"
                : "bg-secondary text-muted-foreground border border-border"
                }`}
            >
              {togglingFeatured ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : featuredVisible ? (
                <ToggleRight className="w-5 h-5" />
              ) : (
                <ToggleLeft className="w-5 h-5" />
              )}
              {featuredVisible ? "ON" : "OFF"}
            </button>
          </div>
        </div>
      </div>

      {/* ── 1. Change Password ─────────────────────────────────────────── */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-9 h-9 rounded-full bg-accent/15 flex items-center justify-center">
            <Lock className="w-4 h-4 text-accent" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">Change Password</h3>
            <p className="text-xs text-muted-foreground">Update your admin account password</p>
          </div>
        </div>
        <div className="space-y-4">
          {/* Current Password */}
          <div>
            <label className="text-sm font-medium block mb-1">Current Password</label>
            <div className="relative">
              <input
                type={showCurrent ? "text" : "password"}
                value={pwForm.current}
                onChange={(e) => setPwForm({ ...pwForm, current: e.target.value })}
                placeholder="Enter your current password"
                className="w-full px-4 py-2.5 pr-12 rounded-xl bg-secondary border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          {/* New Password */}
          <div>
            <label className="text-sm font-medium block mb-1">New Password</label>
            <div className="relative">
              <input
                type={showNew ? "text" : "password"}
                value={pwForm.newPw}
                onChange={(e) => setPwForm({ ...pwForm, newPw: e.target.value })}
                placeholder="Min. 8 characters"
                className="w-full px-4 py-2.5 pr-12 rounded-xl bg-secondary border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {/* Strength indicator */}
            {pwForm.newPw && (
              <div className="mt-2 flex gap-1">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${pwForm.newPw.length >= i * 3
                    ? i <= 1 ? "bg-red-500" : i <= 2 ? "bg-orange-500" : i <= 3 ? "bg-yellow-500" : "bg-emerald-500"
                    : "bg-secondary"
                    }`} />
                ))}
                <span className="text-xs text-muted-foreground ml-1">
                  {pwForm.newPw.length < 4 ? "Weak" : pwForm.newPw.length < 8 ? "Fair" : pwForm.newPw.length < 12 ? "Good" : "Strong"}
                </span>
              </div>
            )}
          </div>
          {/* Confirm Password */}
          <div>
            <label className="text-sm font-medium block mb-1">Confirm New Password</label>
            <input
              type="password"
              value={pwForm.confirm}
              onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })}
              placeholder="Re-enter new password"
              className={`w-full px-4 py-2.5 rounded-xl bg-secondary border text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 ${pwForm.confirm && pwForm.newPw !== pwForm.confirm
                ? "border-red-500 focus:ring-red-500/50"
                : pwForm.confirm && pwForm.newPw === pwForm.confirm
                  ? "border-emerald-500 focus:ring-emerald-500/50"
                  : "border-border"
                }`}
            />
            {pwForm.confirm && pwForm.newPw !== pwForm.confirm && (
              <p className="text-xs text-red-400 mt-1">Passwords do not match</p>
            )}
          </div>
          <button
            onClick={handleChangePassword}
            disabled={pwLoading || !pwForm.current || !pwForm.newPw || !pwForm.confirm}
            className="w-full py-3 bg-accent text-accent-foreground font-semibold rounded-full flex items-center justify-center gap-2 disabled:opacity-50 transition-all hover:shadow-[0_0_20px_hsl(43_85%_55%/0.3)]"
          >
            <KeyRound className="w-4 h-4" />
            {pwLoading ? "Updating Password..." : "Update Password"}
          </button>
        </div>
      </div>

      {/* ── 2. Forgot / Reset Password by Email ───────────────────────── */}
      <div className="glass-card p-6 border border-orange-800/30 bg-orange-950/5">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-9 h-9 rounded-full bg-orange-500/15 flex items-center justify-center">
            <Send className="w-4 h-4 text-orange-400" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">Forgot Password?</h3>
            <p className="text-xs text-muted-foreground">
              Send a password reset link to <span className="text-accent font-medium">{ADMIN_EMAIL}</span>
            </p>
          </div>
        </div>

        <div className="bg-secondary/50 rounded-xl px-4 py-3 flex items-center gap-3 mb-4">
          <Mail className="w-4 h-4 text-accent flex-shrink-0" />
          <div>
            <p className="text-xs text-muted-foreground">Reset link will be sent to:</p>
            <p className="font-semibold text-sm">{ADMIN_EMAIL}</p>
          </div>
        </div>

        {resetSent ? (
          <div className="flex items-center gap-3 px-4 py-3 bg-emerald-950/30 border border-emerald-700/40 rounded-xl">
            <Check className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <div>
              <p className="text-emerald-400 font-semibold text-sm">Reset link sent!</p>
              <p className="text-xs text-muted-foreground">
                Check <span className="text-accent">{ADMIN_EMAIL}</span> for the password reset email.
              </p>
            </div>
          </div>
        ) : (
          <button
            onClick={handleSendResetLink}
            disabled={resetLoading}
            className="w-full py-3 bg-orange-500 text-white font-semibold rounded-full flex items-center justify-center gap-2 disabled:opacity-60 hover:bg-orange-400 transition-colors"
          >
            <Send className="w-4 h-4" />
            {resetLoading ? "Sending..." : `Send Reset Link to ${ADMIN_EMAIL}`}
          </button>
        )}
      </div>

      {/* ── 3. Change Admin Email ──────────────────────────────────────── */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center">
            <Mail className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">Change Admin Email</h3>
            <p className="text-xs text-muted-foreground">A confirmation will be sent to the new email address</p>
          </div>
        </div>
        <div className="space-y-4">
          <div className="bg-secondary/50 rounded-xl px-4 py-3 mb-2">
            <p className="text-xs text-muted-foreground">Current email:</p>
            <p className="font-semibold text-sm">{user?.email || "—"}</p>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">New Email Address</label>
            <input
              type="email"
              value={emailForm.newEmail}
              onChange={(e) => setEmailForm({ ...emailForm, newEmail: e.target.value })}
              placeholder="e.g. foovafoods@gmail.com"
              className="w-full px-4 py-2.5 rounded-xl bg-secondary border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
            />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Confirm New Email</label>
            <input
              type="email"
              value={emailForm.confirmEmail}
              onChange={(e) => setEmailForm({ ...emailForm, confirmEmail: e.target.value })}
              placeholder="Re-enter new email"
              className={`w-full px-4 py-2.5 rounded-xl bg-secondary border text-foreground focus:outline-none focus:ring-2 ${emailForm.confirmEmail && emailForm.newEmail !== emailForm.confirmEmail
                ? "border-red-500 focus:ring-red-500/50"
                : emailForm.confirmEmail && emailForm.newEmail === emailForm.confirmEmail
                  ? "border-emerald-500 focus:ring-emerald-500/50"
                  : "border-border focus:ring-accent/50"
                }`}
            />
            {emailForm.confirmEmail && emailForm.newEmail !== emailForm.confirmEmail && (
              <p className="text-xs text-red-400 mt-1">Email addresses do not match</p>
            )}
          </div>
          <div className="bg-accent/5 border border-accent/20 rounded-xl px-4 py-3 text-xs text-muted-foreground">
            ⚠️ After submitting, a confirmation link will be sent to the <strong>new email</strong>. Click it to complete the change.
          </div>
          <button
            onClick={handleChangeEmail}
            disabled={emailLoading || !emailForm.newEmail || !emailForm.confirmEmail}
            className="w-full py-3 bg-accent text-accent-foreground font-semibold rounded-full flex items-center justify-center gap-2 disabled:opacity-50 hover:shadow-[0_0_20px_hsl(43_85%_55%/0.3)] transition-all"
          >
            <Mail className="w-4 h-4" />
            {emailLoading ? "Updating Email..." : "Update Admin Email"}
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default AdminDashboard;

