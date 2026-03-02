import { useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate, Link } from "react-router-dom";
import { CheckCircle2, ShoppingBag, ArrowRight } from "lucide-react";

const OrderSuccess = () => {
    const navigate = useNavigate();

    useEffect(() => {
        // Scroll to top on mount
        window.scrollTo(0, 0);
    }, []);

    return (
        <main className="min-h-screen pt-32 pb-20 px-4 flex items-center justify-center">
            <div className="container mx-auto max-w-lg text-center">
                <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.5, type: "spring" }}
                    className="mb-8"
                >
                    <div className="w-24 h-24 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle2 className="w-12 h-12 text-primary" />
                    </div>
                    <h1 className="font-display text-4xl font-bold mb-4">
                        Order <span className="gold-text">Placed!</span>
                    </h1>
                    <p className="text-foreground/70 text-lg">
                        Thank you for your order. We've received it and are preparing your healthy delicacies.
                    </p>
                </motion.div>

                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="glass-card p-8 mb-8"
                >
                    <div className="space-y-4">
                        <div className="flex justify-between items-center text-sm border-b border-border pb-4">
                            <span className="text-muted-foreground">Order Status</span>
                            <span className="bg-primary/20 text-primary px-3 py-1 rounded-full font-semibold uppercase text-xs">
                                Confirmed
                            </span>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            You can track your order status in your dashboard. We'll also notify you once your order is dispatched.
                        </p>
                    </div>
                </motion.div>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Link to="/dashboard">
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="w-full sm:w-auto px-8 py-3 bg-accent text-accent-foreground font-semibold rounded-full flex items-center justify-center gap-2"
                        >
                            Go to Dashboard <ArrowRight className="w-4 h-4" />
                        </motion.button>
                    </Link>
                    <Link to="/products">
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="w-full sm:w-auto px-8 py-3 border border-border hover:border-accent/50 text-foreground font-semibold rounded-full flex items-center justify-center gap-2 transition-colors"
                        >
                            <ShoppingBag className="w-4 h-4" /> Continue Shopping
                        </motion.button>
                    </Link>
                </div>

                {/* Decorative elements */}
                <div className="fixed top-1/4 left-1/4 w-64 h-64 bg-accent/5 rounded-full blur-3xl -z-10 animate-pulse" />
                <div className="fixed bottom-1/4 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl -z-10 animate-float" />
            </div>
        </main>
    );
};

export default OrderSuccess;
