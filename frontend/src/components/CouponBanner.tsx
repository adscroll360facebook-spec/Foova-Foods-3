import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Tag, Calendar, Copy, CheckCheck } from "lucide-react";
import { useSiteSettings, SITE_KEYS } from "@/hooks/useSiteSettings";

const CouponBanner = () => {
    const { settings, getBool } = useSiteSettings();
    const [isVisible, setIsVisible] = useState(false);
    const [copied, setCopied] = useState(false);

    const isBannerEnabled = getBool(SITE_KEYS.COUPON_BANNER_VISIBLE as any, false);
    const bannerText = settings[SITE_KEYS.COUPON_BANNER_TEXT];
    const bannerExpiry = settings[SITE_KEYS.COUPON_BANNER_EXPIRY];

    // Extract coupon code from banner text (if written like: Use code SAVE10)
    // Or use the whole text as is
    const couponCode = bannerText?.match(/\b([A-Z0-9]{4,20})\b/)?.[0] || null;

    useEffect(() => {
        if (isBannerEnabled && bannerText) {
            const dismissed = sessionStorage.getItem("coupon_banner_dismissed");
            if (!dismissed) {
                const timer = setTimeout(() => setIsVisible(true), 1200);
                return () => clearTimeout(timer);
            }
        }
    }, [isBannerEnabled, bannerText]);

    const handleClose = () => {
        setIsVisible(false);
        sessionStorage.setItem("coupon_banner_dismissed", "true");
    };

    const handleCopy = () => {
        if (couponCode) {
            navigator.clipboard.writeText(couponCode).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            });
        }
    };

    if (!isBannerEnabled || !bannerText) return null;

    return (
        <AnimatePresence>
            {isVisible && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-background/60 backdrop-blur-sm z-50"
                        onClick={handleClose}
                    />

                    {/* Centered banner */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.85, y: 40 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.85, y: 20 }}
                        transition={{ type: "spring", damping: 20, stiffness: 300 }}
                        className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none px-4"
                    >
                        <div
                            className="glass-card p-8 w-full max-w-md relative overflow-hidden pointer-events-auto"
                            style={{
                                background: "linear-gradient(135deg, hsl(160 12% 8% / 0.97), hsl(160 12% 6% / 0.97))",
                                border: "1.5px solid hsl(43 85% 55% / 0.4)",
                                boxShadow: "0 0 60px hsl(43 85% 55% / 0.2), 0 20px 60px hsl(0 0% 0% / 0.6)"
                            }}
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Decorative blobs */}
                            <div className="absolute -top-8 -right-8 w-40 h-40 bg-accent/10 rounded-full blur-3xl pointer-events-none" />
                            <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

                            {/* Close button */}
                            <button
                                onClick={handleClose}
                                className="absolute top-4 right-4 p-1.5 hover:bg-secondary rounded-full transition-colors z-10"
                                aria-label="Close offer"
                            >
                                <X className="w-4 h-4 text-muted-foreground" />
                            </button>

                            {/* Icon */}
                            <div className="flex justify-center mb-5">
                                <div className="w-16 h-16 rounded-2xl bg-accent/20 flex items-center justify-center border border-accent/20 shadow-[0_0_20px_hsl(43_85%_55%/0.2)]">
                                    <Tag className="w-8 h-8 text-accent" />
                                </div>
                            </div>

                            {/* Title */}
                            <h3 className="font-display text-2xl font-bold text-center mb-2">
                                🎉 Special <span className="gold-text">Offer!</span>
                            </h3>

                            {/* Message */}
                            <p className="text-foreground/80 text-center mb-5 leading-relaxed">{bannerText}</p>

                            {/* Coupon code pill with copy */}
                            {couponCode && (
                                <div className="flex items-center justify-center gap-3 mb-5">
                                    <div className="flex items-center gap-3 px-5 py-3 bg-accent/10 border border-accent/30 rounded-xl">
                                        <span className="font-mono font-bold text-lg text-accent tracking-widest">{couponCode}</span>
                                        <button
                                            onClick={handleCopy}
                                            className="p-1 hover:bg-accent/20 rounded-lg transition-colors"
                                            aria-label="Copy coupon code"
                                        >
                                            {copied
                                                ? <CheckCheck className="w-4 h-4 text-primary" />
                                                : <Copy className="w-4 h-4 text-accent" />}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Expiry */}
                            {bannerExpiry && (
                                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground mb-5">
                                    <Calendar className="w-3 h-3" />
                                    Valid until: {new Date(bannerExpiry).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
                                </div>
                            )}

                            {/* CTA + Dismiss */}
                            <div className="flex gap-3">
                                <button
                                    onClick={handleClose}
                                    className="flex-1 py-3 bg-accent text-accent-foreground rounded-full text-sm font-bold uppercase tracking-wider hover:shadow-[0_0_24px_hsl(43_85%_55%/0.4)] transition-all"
                                >
                                    Claim Now
                                </button>
                                <button
                                    onClick={handleClose}
                                    className="px-4 py-3 bg-secondary text-foreground/60 rounded-full text-sm font-medium hover:text-foreground transition-colors"
                                >
                                    Dismiss
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default CouponBanner;
