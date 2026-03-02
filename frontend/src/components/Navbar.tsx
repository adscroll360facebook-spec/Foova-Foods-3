import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingCart, Menu, X, User, Shield } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";


const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { totalItems } = useCart();
  const { user, isAdmin } = useAuth();
  const location = useLocation();

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

  useEffect(() => setMobileOpen(false), [location]);

  const links = [
    { to: "/", label: "Home" },
    { to: "/products", label: "Products" },
  ];

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled ? "glass-card py-3" : "py-5 bg-transparent"
      }`}
    >
      <div className="container mx-auto px-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <span className="font-display text-2xl font-bold gold-text">FOOVA</span>
          <span className="font-display text-2xl font-light text-foreground">FOODS</span>
        </Link>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-6">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`text-sm font-medium tracking-wide uppercase transition-colors duration-300 ${
                location.pathname === link.to ? "text-accent" : "text-foreground/70 hover:text-foreground"
              }`}
            >
              {link.label}
            </Link>
          ))}
          {isAdmin && (
            <Link to="/admin" className="text-sm font-medium tracking-wide uppercase text-accent/80 hover:text-accent transition-colors flex items-center gap-1">
              <Shield className="w-3.5 h-3.5" />Admin
            </Link>
          )}
          
          <Link to="/cart" className="relative">
            <ShoppingCart className="w-5 h-5 text-foreground/70 hover:text-accent transition-colors" />
            {totalItems > 0 && (
              <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-accent text-accent-foreground text-xs flex items-center justify-center font-bold">
                {totalItems}
              </motion.span>
            )}
          </Link>
          {user ? (
            <Link to="/dashboard" className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center hover:bg-accent/30 transition-colors">
              <User className="w-4 h-4 text-accent" />
            </Link>
          ) : (
            <Link to="/login" className="px-5 py-2 bg-accent text-accent-foreground rounded-full text-sm font-medium hover:shadow-[0_0_20px_hsl(43_85%_55%/0.3)] transition-shadow">
              Login
            </Link>
          )}
        </div>

        {/* Mobile toggle */}
        <div className="flex md:hidden items-center gap-3">
          <Link to="/cart" className="relative">
            <ShoppingCart className="w-5 h-5 text-foreground/70" />
            {totalItems > 0 && (
              <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-accent text-accent-foreground text-xs flex items-center justify-center font-bold">
                {totalItems}
              </span>
            )}
          </Link>
          <button onClick={() => setMobileOpen(!mobileOpen)} className="text-foreground">
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden glass-card mt-2 mx-4 rounded-xl overflow-hidden"
          >
            <div className="p-6 flex flex-col gap-4">
              {links.map((link) => (
                <Link key={link.to} to={link.to} className="text-lg font-medium text-foreground/80 hover:text-accent transition-colors">
                  {link.label}
                </Link>
              ))}
              {isAdmin && <Link to="/admin" className="text-lg font-medium text-accent">Admin Dashboard</Link>}
              {user ? (
                <Link to="/dashboard" className="text-lg font-medium text-foreground/80 hover:text-accent">My Account</Link>
              ) : (
                <Link to="/login" className="text-lg font-medium text-accent">Login</Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
};

export default Navbar;
