import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import https from "https";
import crypto from "crypto";
import { MongoClient, ServerApiVersion } from "mongodb";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import multer from "multer";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Parse JSON bodies
app.use(express.json());
app.use(cors());

// Serve static files from public/uploads
const uploadDir = path.join(process.cwd(), "public/uploads");
if (!fs.existsSync(uploadDir)) {
    try { fs.mkdirSync(uploadDir, { recursive: true }); }
    catch (e) { console.warn("Could not create upload directory:", e.message); }
}
app.use("/uploads", express.static(uploadDir));

const JWT_SECRET = process.env.JWT_SECRET || "YOUR_JWT_SECRET";

// ─── MongoDB Initialization ───────────────────────────────────────────────
let MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || "YOUR_MONGODB_URI_HERE";

// Sanitize: strip any potential quotes from env variables (common copy-paste error)
MONGO_URI = MONGO_URI.trim().replace(/^["'](.+)["']$/, '$1');

const client = new MongoClient(MONGO_URI, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    },
    connectTimeoutMS: 15000,
    socketTimeoutMS: 60000,
    maxPoolSize: 10,
    minPoolSize: 1,
});

let db = null;
let cachedPromise = null;
let lastDbError = null;

async function connectDB() {
    if (db) return db;
    if (cachedPromise) return cachedPromise;

    cachedPromise = (async () => {
        try {
            console.log("Attempting to connect to MongoDB Cluster...");
            const maskedUri = MONGO_URI.replace(/:([^@]+)@/, ":****@");
            console.log(`Connecting to: ${maskedUri}`);
            
            await client.connect();
            db = client.db("foovafoods");
            console.log("✅ Successfully connected to MongoDB database!");
            lastDbError = null;
            return db;
        } catch (err) {
            console.error("❌ MongoDB Connection Error:", err.message);
            lastDbError = err.message;
            if (err.message.includes("SSL") || err.message.includes("alert internal error")) {
                console.error("🔒 SSL Alert detected: This usually means your IP is NOT whitelisted in MongoDB Atlas.");
            }
            cachedPromise = null;
            return null;
        }
    })();

    return cachedPromise;
}

// Ensure DB in middleware
app.use(async (req, res, next) => {
    try {
        if (!db) await connectDB();
        next();
    } catch (err) {
        console.error("Middleware DB connect error:", err);
        next();
    }
});

// Health check
app.get("/api/health", (req, res) => {
    res.json({ 
        status: "ok", 
        database: db ? "connected" : "disconnected",
        error: lastDbError
    });
});

// ─── Multer Storage Setup ──────────────────────────────────────────────────
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage });

// ─── Auth Middleware ───────────────────────────────────────────────────────
const verifyToken = (req, res, next) => {
    const token = req.headers["authorization"]?.split(" ")[1];
    if (!token) return res.status(403).json({ error: "No token provided" });
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.userId = decoded.id;
        req.userRole = decoded.role;
        next();
    } catch {
        res.status(401).json({ error: "Unauthorized" });
    }
};

const verifyAdmin = (req, res, next) => {
    verifyToken(req, res, () => {
        if (req.userRole !== "admin") return res.status(403).json({ error: "Admin access required" });
        next();
    });
};

// ─── Auth Routes ───────────────────────────────────────────────────────────
app.post("/api/auth/register", async (req, res) => {
    try {
        if (!db) return res.status(500).json({ error: "Database not connected" });
        const { email, password, full_name } = req.body;
        const existing = await db.collection("users").findOne({ email });
        if (existing) return res.status(400).json({ error: "Email already exists" });

        const hashedPassword = await bcrypt.hash(password, 10);
        const userId = crypto.randomUUID();

        await db.collection("users").insertOne({
            id: userId,
            email,
            password: hashedPassword,
            role: email === "foovafoods@gmail.com" ? "admin" : "user",
            created_at: new Date().toISOString()
        });

        await db.collection("profiles").insertOne({
            user_id: userId,
            full_name: full_name || "",
            email,
            created_at: new Date().toISOString()
        });

        const token = jwt.sign({ id: userId, role: email === "foovafoods@gmail.com" ? "admin" : "user" }, JWT_SECRET, { expiresIn: "7d" });
        res.json({ token, user: { id: userId, email, full_name, role: email === "foovafoods@gmail.com" ? "admin" : "user" } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post("/api/auth/login", async (req, res) => {
    try {
        if (!db) return res.status(500).json({ error: "Database not connected" });
        const { email, password } = req.body;
        const user = await db.collection("users").findOne({ email });
        if (!user) return res.status(401).json({ error: "Incorrect email or password." });

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) return res.status(401).json({ error: "Incorrect email or password." });

        const profile = await db.collection("profiles").findOne({ user_id: user.id });
        const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: "7d" });
        res.json({ token, user: { id: user.id, email, full_name: profile?.full_name, role: user.role } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get("/api/auth/me", verifyToken, async (req, res) => {
    try {
        if (!db) return res.status(500).json({ error: "Database not connected" });
        const user = await db.collection("users").findOne({ id: req.userId });
        const profile = await db.collection("profiles").findOne({ user_id: req.userId });
        if (!user) return res.status(404).json({ error: "User not found" });
        res.json({ user: { id: user.id, email: user.email, full_name: profile?.full_name, role: user.role } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post("/api/upload", upload.single("file"), (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const url = `/uploads/${req.file.filename}`;
    res.json({ url });
});

// ─── Razorpay API helpers ───────────────────────────────────────────────────
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || "YOUR_RAZORPAY_KEY_ID";
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || "YOUR_RAZORPAY_KEY_SECRET";
const RAZORPAY_AUTH = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString("base64");

function razorpayPost(endpoint, payload) {
    return new Promise((resolve, reject) => {
        const body = JSON.stringify(payload);
        const options = {
            hostname: "api.razorpay.com",
            path: `/v1/${endpoint}`,
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Basic ${RAZORPAY_AUTH}`,
                "Content-Length": Buffer.byteLength(body),
            },
        };
        const req = https.request(options, (res) => {
            let data = "";
            res.on("data", (chunk) => (data += chunk));
            res.on("end", () => {
                try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
                catch { reject(new Error("Invalid JSON from Razorpay")); }
            });
        });
        req.on("error", reject);
        req.write(body);
        req.end();
    });
}

/** ─── Public Data Routes ────────────────────────────────────────────────────── */
app.get("/api/products", async (req, res) => {
    try {
        if (!db) return res.status(500).json({ error: "Database not connected" });
        const p = await db.collection("products").find().sort({ created_at: -1 }).toArray();
        res.json(p);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get("/api/products/:id", async (req, res) => {
    try {
        if (!db) return res.status(500).json({ error: "Database not connected" });
        const d = await db.collection("products").findOne({ id: req.params.id });
        if (!d) return res.status(404).json({ error: "Not found" });
        res.json(d);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get("/api/settings", async (req, res) => {
    try {
        if (!db) return res.status(500).json({ error: "Database not connected" });
        const s = await db.collection("site_content").find().toArray();
        res.json(s);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/api/razorpay/create-order", async (req, res) => {
    try {
        const { amount, receipt } = req.body;
        if (!amount) return res.status(400).json({ error: "amount is required" });
        const { status, body } = await razorpayPost("orders", {
            amount: Math.round(Number(amount) * 100),
            currency: "INR",
            receipt: receipt || `receipt_${Date.now()}`,
        });
        if (status !== 200) return res.status(status).json({ error: body?.error?.description || "Razorpay error" });
        return res.json({ order_id: body.id, key_id: RAZORPAY_KEY_ID });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Stock Management Helper ────────────────────────────────────────────────
async function updateStock(items) {
    if (!db) return;
    for (const item of items) {
        const product = await db.collection("products").findOne({ id: item.id });
        if (product) {
            const newQty = Math.max(0, (product.stock_quantity || 0) - item.quantity);
            await db.collection("products").updateOne(
                { id: item.id },
                { 
                    $set: { 
                        stock_quantity: newQty,
                        in_stock: newQty > 0,
                        updated_at: new Date().toISOString()
                    } 
                }
            );
        }
    }
}

app.post("/api/razorpay/verify-payment", async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderData } = req.body;
        const expectedSig = crypto.createHmac("sha256", RAZORPAY_KEY_SECRET).update(`${razorpay_order_id}|${razorpay_payment_id}`).digest("hex");
        
        if (expectedSig !== razorpay_signature) {
            return res.status(400).json({ success: false, error: "Invalid signature" });
        }
        
        if (!db) return res.status(500).json({ error: "Database not connected" });

        // 1. Create the Order
        const newOrder = {
            ...orderData,
            id: orderData.id || crypto.randomUUID(),
            status: "confirmed",
            payment_status: "paid",
            razorpay_payment_id,
            razorpay_order_id,
            created_at: new Date().toISOString()
        };
        await db.collection("orders").insertOne(newOrder);

        // 2. Update Stock
        if (orderData.items && Array.isArray(orderData.items)) {
            await updateStock(orderData.items);
        }
        
        return res.json({ success: true, order_id: newOrder.id });
    } catch (err) { 
        console.error("Payment verification error:", err);
        res.status(500).json({ success: false, error: err.message }); 
    }
});

app.post("/api/orders", async (req, res) => {
    try {
        if (!db) return res.status(500).json({ error: "Database not connected" });
        const order = req.body;
        const newOrder = {
            ...order,
            id: order.id || crypto.randomUUID(),
            status: "pending",
            created_at: new Date().toISOString()
        };
        await db.collection("orders").insertOne(newOrder);

        // Update stock immediately for COD orders
        if (order.payment_method === "cod" && order.items && Array.isArray(order.items)) {
            await updateStock(order.items);
        }

        res.json({ success: true, order_id: newOrder.id });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

/** ─── User Data & Addresses ────────────────────────────────────────────────── */
app.get("/api/user/data/:userId", async (req, res) => {
    try {
        if (!db) return res.status(500).json({ error: "Database not connected" });
        const [profile, orders, addresses] = await Promise.all([
            db.collection("profiles").findOne({ user_id: req.params.userId }),
            db.collection("orders").find({ user_id: req.params.userId }).sort({ created_at: -1 }).toArray(),
            db.collection("addresses").find({ user_id: req.params.userId }).toArray(),
        ]);
        res.json({ profile, orders, addresses });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/api/user/profile", async (req, res) => {
    try {
        if (!db) return res.status(500).json({ error: "Database not connected" });
        const { user_id, ...profile } = req.body;
        await db.collection("profiles").updateOne({ user_id }, { $set: { ...profile, updated_at: new Date().toISOString() } }, { upsert: true });
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get("/api/user/addresses/:userId", async (req, res) => {
    try {
        if (!db) return res.status(500).json({ error: "Database not connected" });
        const a = await db.collection("addresses").find({ user_id: req.params.userId }).toArray();
        res.json(a);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/api/user/addresses", async (req, res) => {
    try {
        if (!db) return res.status(500).json({ error: "Database not connected" });
        const addr = req.body;
        const id = addr.id || crypto.randomUUID();
        const update = { ...addr, id, updated_at: new Date().toISOString() };
        delete update._id;
        await db.collection("addresses").updateOne({ id }, { $set: update }, { upsert: true });
        res.json({ success: true, id });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete("/api/user/addresses/:id", async (req, res) => {
    try {
        if (!db) return res.status(500).json({ error: "Database not connected" });
        await db.collection("addresses").deleteOne({ id: req.params.id });
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

/** ─── Reviews ─────────────────────────────────────────────────────────────── */
app.get("/api/reviews/:productId", async (req, res) => {
    try {
        if (!db) return res.status(500).json({ error: "Database not connected" });
        const r = await db.collection("reviews").find({ product_id: req.params.productId }).sort({ created_at: -1 }).toArray();
        res.json(r);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/api/reviews", async (req, res) => {
    try {
        if (!db) return res.status(500).json({ error: "Database not connected" });
        const review = req.body;
        const id = crypto.randomUUID();
        await db.collection("reviews").insertOne({ ...review, id, created_at: new Date().toISOString() });
        res.json({ success: true, id });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

/** ─── Admin Data Access ────────────────────────────────────────────────────── */
app.get("/api/admin/data", verifyAdmin, async (req, res) => {
    try {
        if (!db) return res.status(500).json({ error: "Database not connected" });
        const [products, orders, coupons, testimonials, banners, profiles, settings, categories] = await Promise.all([
            db.collection("products").find().sort({ created_at: -1 }).toArray(),
            db.collection("orders").find().sort({ created_at: -1 }).toArray(),
            db.collection("coupons").find().sort({ created_at: -1 }).toArray(),
            db.collection("testimonials").find().sort({ created_at: -1 }).toArray(),
            db.collection("offer_banners").find().sort({ sort_order: 1 }).toArray(),
            db.collection("profiles").find().toArray(),
            db.collection("site_content").find().toArray(),
            db.collection("categories").find().sort({ name: 1 }).toArray()
        ]);
        res.json({ products, orders, coupons, testimonials, banners, profiles, settings, categories });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

/** ─── Admin CRUD Endpoints ──────────────────────────────────────────────────── */

// Categories CRUD
app.get("/api/categories", async (req, res) => {
    try {
        if (!db) return res.status(500).json({ error: "Database not connected" });
        const c = await db.collection("categories").find().sort({ name: 1 }).toArray();
        res.json(c);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/api/admin/categories", verifyAdmin, async (req, res) => {
    try {
        const category = req.body;
        const id = category.id || crypto.randomUUID();
        const update = { ...category, id, updated_at: new Date().toISOString() };
        delete update._id;
        await db.collection("categories").updateOne({ id }, { $set: update }, { upsert: true });
        res.json({ success: true, id });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete("/api/admin/categories/:id", verifyAdmin, async (req, res) => {
    try {
        // Check if products are assigned to this category
        const category = await db.collection("categories").findOne({ id: req.params.id });
        if (category) {
            const productCount = await db.collection("products").countDocuments({ category: category.name });
            if (productCount > 0) {
                return res.status(400).json({ error: `Cannot delete category. ${productCount} products are assigned to it.` });
            }
        }
        await db.collection("categories").deleteOne({ id: req.params.id });
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Products CRUD
app.post("/api/admin/products", verifyAdmin, async (req, res) => {
    try {
        const product = req.body;
        const id = product.id || crypto.randomUUID();
        const update = { ...product, id, updated_at: new Date().toISOString() };
        delete update._id;
        await db.collection("products").updateOne({ id }, { $set: update }, { upsert: true });
        res.json({ success: true, id });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete("/api/admin/products/:id", verifyAdmin, async (req, res) => {
    try {
        await db.collection("products").deleteOne({ id: req.params.id });
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Coupons CRUD
app.post("/api/admin/coupons", verifyAdmin, async (req, res) => {
    try {
        const coupon = req.body;
        const id = coupon.id || crypto.randomUUID();
        const update = { ...coupon, id, updated_at: new Date().toISOString() };
        delete update._id;
        await db.collection("coupons").updateOne({ id }, { $set: update }, { upsert: true });
        res.json({ success: true, id });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete("/api/admin/coupons/:id", verifyAdmin, async (req, res) => {
    try {
        await db.collection("coupons").deleteOne({ id: req.params.id });
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Testimonials CRUD
app.post("/api/admin/testimonials", verifyAdmin, async (req, res) => {
    try {
        const testimonial = req.body;
        const id = testimonial.id || crypto.randomUUID();
        const update = { ...testimonial, id, updated_at: new Date().toISOString() };
        delete update._id;
        await db.collection("testimonials").updateOne({ id }, { $set: update }, { upsert: true });
        res.json({ success: true, id });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete("/api/admin/testimonials/:id", verifyAdmin, async (req, res) => {
    try {
        await db.collection("testimonials").deleteOne({ id: req.params.id });
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Banners CRUD
app.post("/api/admin/banners", verifyAdmin, async (req, res) => {
    try {
        const banner = req.body;
        const id = banner.id || crypto.randomUUID();
        const update = { ...banner, id, updated_at: new Date().toISOString() };
        delete update._id;
        await db.collection("offer_banners").updateOne({ id }, { $set: update }, { upsert: true });
        res.json({ success: true, id });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete("/api/admin/banners/:id", verifyAdmin, async (req, res) => {
    try {
        await db.collection("offer_banners").deleteOne({ id: req.params.id });
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Order Status & Tracking
app.post("/api/admin/orders/status", verifyAdmin, async (req, res) => {
    try {
        const { orderId, status } = req.body;
        await db.collection("orders").updateOne({ id: orderId }, { $set: { status, updated_at: new Date().toISOString() } });
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/api/admin/orders/tracking", verifyAdmin, async (req, res) => {
    try {
        const { orderId, tracking_number, tracking_link } = req.body;
        await db.collection("orders").updateOne({ id: orderId }, { $set: { tracking_number, tracking_link, updated_at: new Date().toISOString() } });
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Settings Update
app.post("/api/admin/settings", verifyAdmin, async (req, res) => {
    try {
        const { key, value } = req.body;
        await db.collection("site_content").updateOne({ key }, { $set: { value, updated_at: new Date().toISOString() } }, { upsert: true });
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

export default app;
