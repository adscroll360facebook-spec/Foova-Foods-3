import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Eye, EyeOff, KeyRound, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

const ResetPassword = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const token = searchParams.get("token") || "";
    const email = searchParams.get("email") || "";
    const [newPw, setNewPw] = useState("");
    const [confirmPw, setConfirmPw] = useState("");
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [done, setDone] = useState(false);
    const [error, setError] = useState("");

    // Supabase puts the session tokens in the URL hash (#access_token=...&type=recovery)
    // when the user clicks the reset link. We need to pick it up.
    useEffect(() => {
        // Migration: Supabase logic removed
        /*
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event) => {
            if (event === "PASSWORD_RECOVERY") {
            }
        });
        return () => subscription.unsubscribe();
        */
    }, []);

    const strength = (() => {
        if (!newPw) return 0;
        let s = 0;
        if (newPw.length >= 8) s++;
        if (/[A-Z]/.test(newPw)) s++;
        if (/[0-9]/.test(newPw)) s++;
        if (/[^A-Za-z0-9]/.test(newPw)) s++;
        return s;
    })();

    const strengthLabel = ["", "Weak", "Fair", "Good", "Strong"][strength];
    const strengthColor = ["", "bg-red-500", "bg-orange-500", "bg-yellow-500", "bg-emerald-500"][strength];

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!token || !email) {
            setError("Invalid or expired reset link. Please request a new one.");
            return;
        }
        if (newPw.length < 8) {
            setError("Password must be at least 8 characters.");
            return;
        }
        if (newPw !== confirmPw) {
            setError("Passwords do not match.");
            return;
        }

        setLoading(true);
        try {
            const res = await fetch("/api/auth/reset-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, token, newPassword: newPw }),
            });
            const data = await res.json();
            if (data.error) {
                setError(data.error);
                toast.error(data.error);
            } else {
                setDone(true);
                toast.success("Password updated successfully!");
                setTimeout(() => navigate("/login"), 3000);
            }
        } catch (err) {
            setError("Network error. Please try again.");
        } finally {
            setLoading(false);
        }
    };


    return (
        <main className="min-h-screen flex items-center justify-center px-4 pt-20">
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card p-8 md:p-10 w-full max-w-md"
            >
                {done ? (
                    /* ── Success State ── */
                    <div className="text-center py-6">
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 200 }}
                            className="w-20 h-20 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto mb-5"
                        >
                            <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                        </motion.div>
                        <h1 className="font-display text-2xl font-bold mb-2">
                            Password <span className="gold-text">Updated!</span>
                        </h1>
                        <p className="text-muted-foreground text-sm mb-6">
                            Your password has been changed successfully. Redirecting to login...
                        </p>
                        <div className="w-full h-1 bg-secondary rounded-full overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: "100%" }}
                                transition={{ duration: 3 }}
                                className="h-full bg-accent rounded-full"
                            />
                        </div>
                    </div>
                ) : (
                    /* ── Form State ── */
                    <>
                        <div className="text-center mb-8">
                            <div className="w-14 h-14 rounded-full bg-accent/15 flex items-center justify-center mx-auto mb-4">
                                <KeyRound className="w-7 h-7 text-accent" />
                            </div>
                            <h1 className="font-display text-3xl font-bold mb-2">
                                Set New <span className="gold-text">Password</span>
                            </h1>
                            <p className="text-muted-foreground text-sm">
                                Choose a strong password for your account
                            </p>
                        </div>

                        <form onSubmit={handleReset} className="space-y-5">
                            {/* New Password */}
                            <div>
                                <label className="text-sm font-medium block mb-1.5">New Password</label>
                                <div className="relative">
                                    <input
                                        type={showNew ? "text" : "password"}
                                        value={newPw}
                                        onChange={(e) => { setNewPw(e.target.value); setError(""); }}
                                        placeholder="Min. 8 characters"
                                        required
                                        className="w-full px-4 py-3 pr-12 rounded-xl bg-secondary border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowNew(!showNew)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                    >
                                        {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                                {/* Strength meter */}
                                {newPw && (
                                    <div className="mt-2">
                                        <div className="flex gap-1 mb-1">
                                            {[1, 2, 3, 4].map((i) => (
                                                <div
                                                    key={i}
                                                    className={`h-1.5 flex-1 rounded-full transition-all ${i <= strength ? strengthColor : "bg-secondary"}`}
                                                />
                                            ))}
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            Strength: <span className={`font-medium ${strength >= 3 ? "text-emerald-400" : strength === 2 ? "text-yellow-400" : "text-red-400"}`}>{strengthLabel}</span>
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Confirm Password */}
                            <div>
                                <label className="text-sm font-medium block mb-1.5">Confirm Password</label>
                                <div className="relative">
                                    <input
                                        type={showConfirm ? "text" : "password"}
                                        value={confirmPw}
                                        onChange={(e) => { setConfirmPw(e.target.value); setError(""); }}
                                        placeholder="Re-enter password"
                                        required
                                        className={`w-full px-4 py-3 pr-12 rounded-xl bg-secondary border text-foreground focus:outline-none focus:ring-2 ${confirmPw && newPw !== confirmPw
                                            ? "border-red-500 focus:ring-red-500/50"
                                            : confirmPw && newPw === confirmPw
                                                ? "border-emerald-500 focus:ring-emerald-500/50"
                                                : "border-border focus:ring-accent/50"
                                            }`}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirm(!showConfirm)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                    >
                                        {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                                {confirmPw && newPw !== confirmPw && (
                                    <p className="text-xs text-red-400 mt-1">Passwords do not match</p>
                                )}
                            </div>

                            {/* Error */}
                            {error && (
                                <div className="flex items-center gap-2 text-red-400 text-sm bg-red-950/20 border border-red-800/40 px-4 py-2.5 rounded-xl">
                                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading || !newPw || !confirmPw}
                                className="w-full py-3 bg-accent text-accent-foreground font-semibold rounded-full hover:shadow-[0_0_30px_hsl(43_85%_55%/0.4)] transition-shadow disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-accent-foreground border-t-transparent rounded-full animate-spin" />
                                        Updating...
                                    </>
                                ) : (
                                    <>
                                        <KeyRound className="w-4 h-4" />
                                        Update Password
                                    </>
                                )}
                            </button>
                        </form>
                    </>
                )}
            </motion.div>
        </main>
    );
};

export default ResetPassword;
