import { useState, useEffect, useCallback } from "react";
import { safeFetch } from "@/lib/utils";

// Keys used in site_content table
export const SITE_KEYS = {
    FEATURED_VISIBLE: "featured_products_visible",
    FEATURED_PRODUCT_IDS: "homepage_featured_product_ids",
    HERO_BG_IMAGE: "hero_bg_image",
    HERO_TITLE: "hero_title",
    HERO_SUBTITLE: "hero_subtitle",
    HERO_DESCRIPTION: "hero_description",
    COUPON_BANNER_TEXT: "coupon_banner_text",
    COUPON_BANNER_EXPIRY: "coupon_banner_expiry",
    COUPON_BANNER_VISIBLE: "coupon_banner_visible",
    GOOGLE_LOGIN_ENABLED: "google_login_enabled",  // Admin-controlled Google OAuth toggle
} as const;

type SiteKey = (typeof SITE_KEYS)[keyof typeof SITE_KEYS];

/** Fetch all site_content rows and return as a key→value map */
async function fetchSettings(): Promise<Record<string, string>> {
    try {
        const data = await safeFetch("/api/settings");

        const map: Record<string, string> = {};
        (data ?? []).forEach((row: any) => {
            map[row.key] = row.value ?? "";
        });
        return map;
    } catch (err) {
        console.error("fetchSettings exception:", err);
        return {};
    }
}

/** Upsert a key/value in site_content via MongoDB API */
async function saveSetting(key: SiteKey, value: string): Promise<void> {
    try {
        await safeFetch("/api/admin/settings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ key, value })
        });
    } catch (err) {
        console.error("saveSetting exception:", err);
    }
}

/** Hook: returns settings map + typed helpers */
export function useSiteSettings() {
    const [settings, setSettings] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);

    const reload = useCallback(async () => {
        const map = await fetchSettings();
        setSettings(map);
        setLoading(false);
    }, []);

    useEffect(() => {
        reload();
    }, [reload]);

    /** Returns boolean for a setting key, defaulting to true if not set */
    const getBool = (key: SiteKey, defaultVal = true): boolean => {
        if (!(key in settings)) return defaultVal;
        return settings[key] !== "false";
    };

    /** Toggle a boolean setting */
    const toggleBool = async (key: SiteKey, currentVal: boolean) => {
        const next = !currentVal;
        setSettings((prev) => ({ ...prev, [key]: next.toString() })); // optimistic
        await saveSetting(key, next.toString());
    };

    // ── Featured product IDs helpers ──────────────────────────────────────────

    /** Get the current array of featured product IDs (max 3) */
    const getFeaturedIds = (): string[] => {
        const raw = settings[SITE_KEYS.FEATURED_PRODUCT_IDS];
        if (!raw) return [];
        try {
            return JSON.parse(raw);
        } catch {
            return [];
        }
    };

    /** Returns true if productId is in the featured list */
    const isProductFeatured = (productId: string): boolean =>
        getFeaturedIds().includes(productId);

    /**
     * Toggle a product in/out of the featured list.
     * Max 3: will reject with a message if over limit.
     * Min 1: will reject removing the last one.
     * Returns an error string or null on success.
     */
    const toggleFeaturedProduct = async (
        productId: string
    ): Promise<{ success: boolean; message: string }> => {
        const current = getFeaturedIds();
        const isOn = current.includes(productId);

        if (isOn) {
            // Remove — enforce min 1
            if (current.length <= 1) {
                return { success: false, message: "At least 1 product must be featured." };
            }
            const next = current.filter((id) => id !== productId);
            const nextStr = JSON.stringify(next);
            setSettings((prev) => ({ ...prev, [SITE_KEYS.FEATURED_PRODUCT_IDS]: nextStr }));
            await saveSetting(SITE_KEYS.FEATURED_PRODUCT_IDS, nextStr);
            return { success: true, message: "Removed from featured." };
        } else {
            // Add — enforce max 3
            if (current.length >= 3) {
                return { success: false, message: "Maximum 3 products can be featured. Turn off another first." };
            }
            const next = [...current, productId];
            const nextStr = JSON.stringify(next);
            setSettings((prev) => ({ ...prev, [SITE_KEYS.FEATURED_PRODUCT_IDS]: nextStr }));
            await saveSetting(SITE_KEYS.FEATURED_PRODUCT_IDS, nextStr);
            return { success: true, message: "Added to featured!" };
        }
    };

    return {
        settings,
        loading,
        getBool,
        toggleBool,
        getFeaturedIds,
        isProductFeatured,
        toggleFeaturedProduct,
        reload,
    };
}
