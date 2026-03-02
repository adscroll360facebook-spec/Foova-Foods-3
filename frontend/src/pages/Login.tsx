import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff, Mail, AlertCircle, Send, CheckCircle2, Lock } from "lucide-react";
import { toast } from "sonner";
import { safeFetch } from "@/lib/utils";

const RESET_COOLDOWN = 60;

const Login = () => {
  const { signIn, user } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Google login visibility — fetched from admin settings
  const [googleEnabled, setGoogleEnabled] = useState<boolean | null>(null);
  useEffect(() => {
    safeFetch("/api/settings")
      .then((rows: any[]) => {
        const row = rows?.find((r: any) => r.key === "google_login_enabled");
        setGoogleEnabled(row?.value === "true");
      })
      .catch(() => setGoogleEnabled(false)); // hide on error
  }, []);

  // Forgot password
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Redirect if already logged in
  if (user) {
    navigate("/");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = await signIn(email, password);
    setLoading(false);
    if (result.error) {
      setError(result.error);
    } else {
      toast.success("Welcome back!");
      navigate("/");
    }
  };

  const startCooldown = () => {
    setCooldown(RESET_COOLDOWN);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setCooldown(prev => {
        if (prev <= 1) { clearInterval(cooldownRef.current!); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSendResetLink = async () => {
    if (!forgotEmail) return;
    setForgotLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail })
      });
      const data = await res.json();
      if (data.error) { toast.error(data.error); }
      else {
        setForgotSent(true);
        startCooldown();
        toast.success("Reset link sent! Check your inbox.");
      }
    } catch {
      toast.error("Failed to send reset link. Please try again.");
    } finally {
      setForgotLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    // Must use absolute URL pointing to Render backend — NOT relative /api (that's Vercel-only)
    const apiUrl = import.meta.env.VITE_API_URL || "https://foova-foods-3.onrender.com";
    window.location.href = `${apiUrl}/api/auth/google`;
  };

  return (
    <main className="min-h-screen pt-28 pb-20 px-4 flex items-center justify-center bg-background relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-accent/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-20 right-10 w-80 h-80 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md glass-card p-8 relative z-10"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-accent/15 flex items-center justify-center mx-auto mb-4 border border-accent/20">
            <Lock className="w-7 h-7 text-accent" />
          </div>
          <h1 className="font-display text-3xl font-bold mb-2">Welcome <span className="gold-text">Back</span></h1>
          <p className="text-muted-foreground">Sign in to your FOOVA FOODS account</p>
        </div>

        {/* Google Sign-In Button — only shown when admin enables it */}
        {googleEnabled && (
          <>
            <button
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 mb-6 bg-secondary border border-border rounded-xl hover:bg-secondary/80 hover:border-accent/30 transition-all group"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              <span className="font-medium text-sm group-hover:text-foreground transition-colors">Continue with Google</span>
            </button>
            <div className="flex items-center gap-4 mb-6">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground uppercase tracking-widest">or email</span>
              <div className="flex-1 h-px bg-border" />
            </div>
          </>
        )}

        {/* Error */}
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-3 text-red-400 text-sm"
          >
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p>{error}</p>
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground/80 ml-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="email"
                required
                id="login-email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-secondary/50 border border-border focus:border-accent rounded-xl py-3 pl-11 pr-4 outline-none transition-all text-foreground"
                placeholder="name@example.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium text-foreground/80 ml-1">Password</label>
              <button
                type="button"
                onClick={() => { setForgotOpen(true); setForgotSent(false); setForgotEmail(email); }}
                className="text-xs text-accent hover:underline font-medium"
              >
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
              <input
                type={showPass ? "text" : "password"}
                required
                id="login-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-secondary/50 border border-border focus:border-accent rounded-xl py-3 px-4 pr-12 outline-none transition-all text-foreground"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            id="login-submit"
            disabled={loading}
            className="w-full py-4 bg-accent hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed text-accent-foreground font-bold rounded-xl shadow-[0_10px_20px_-10px_rgba(212,168,67,0.3)] transition-all transform hover:-translate-y-0.5 active:translate-y-0"
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-accent-foreground/30 border-t-accent-foreground rounded-full animate-spin" />
                <span>Signing in...</span>
              </div>
            ) : "Sign In"}
          </button>
        </form>

        <div className="mt-8 pt-8 border-t border-border flex flex-col items-center gap-4">
          <p className="text-muted-foreground text-sm">Don't have an account?</p>
          <Link
            to="/signup"
            className="inline-flex items-center gap-2 text-accent font-semibold hover:gap-3 transition-all"
          >
            Create New Account <Send className="w-4 h-4" />
          </Link>
        </div>
      </motion.div>

      {/* Forgot Password Modal */}
      <AnimatePresence>
        {forgotOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setForgotOpen(false)}
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.9 }}
              className="w-full max-w-sm glass-card p-6 relative z-10"
            >
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-accent/20">
                  {forgotSent ? <CheckCircle2 className="w-8 h-8 text-emerald-400" /> : <Mail className="w-8 h-8 text-accent" />}
                </div>
                <h2 className="text-xl font-bold mb-2">{forgotSent ? "Link Sent!" : "Reset Password"}</h2>
                <p className="text-sm text-muted-foreground px-4">
                  {forgotSent
                    ? `Check your inbox at ${forgotEmail} for the reset link.`
                    : "Enter your email and we'll send you a recovery link."}
                </p>
              </div>

              {forgotSent ? (
                <div className="space-y-4">
                  <button
                    onClick={() => { setForgotOpen(false); setForgotSent(false); }}
                    className="w-full py-3 bg-secondary text-foreground font-semibold rounded-xl"
                  >
                    Close
                  </button>
                  {cooldown > 0 ? (
                    <p className="text-center text-xs text-muted-foreground">Resend available in {cooldown}s</p>
                  ) : (
                    <button onClick={handleSendResetLink} className="w-full text-xs text-accent hover:underline">
                      Didn't get it? Send again
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="Your registered email"
                      className="w-full bg-secondary/50 border border-border focus:border-accent rounded-xl py-3 pl-10 pr-4 outline-none transition-all text-sm text-foreground"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setForgotOpen(false)}
                      className="flex-1 py-3 bg-secondary text-foreground font-semibold rounded-xl text-sm transition-colors hover:bg-secondary/80"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSendResetLink}
                      disabled={forgotLoading || !forgotEmail || cooldown > 0}
                      className="flex-[2] py-3 bg-accent text-accent-foreground font-bold rounded-xl text-sm transition-all hover:shadow-lg disabled:opacity-50"
                    >
                      {forgotLoading ? "Sending..." : cooldown > 0 ? `Resend (${cooldown}s)` : "Send Reset Link"}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
};

export default Login;
