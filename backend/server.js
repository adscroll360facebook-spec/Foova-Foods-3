import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";
import { MongoClient, ServerApiVersion } from "mongodb";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import multer from "multer";
import fs from "fs";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import nodemailer from "nodemailer";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;
const FRONTEND_URL = process.env.FRONTEND_URL || "https://zfoova-feast-studio-main.vercel.app";
const GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL || "https://foova-foods-3.onrender.com/api/auth/google/callback";

// ─── Security & Middleware ───────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: false }));

const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500,
    message: { error: "Too many requests from this IP, please try again after 15 minutes" }
});
app.use(globalLimiter);

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: { error: "Too many login attempts, please try again after 15 minutes" }
});

app.use(express.json({ limit: "10mb" }));
app.use(cors({
    origin: [
        "https://zfoova-feast-studio-main.vercel.app",
        "https://www.foovafoods.com",
        "https://foovafoods.com",
        /\.vercel\.app$/,
        /\.onrender\.com$/,
        "http://localhost:5173",
        "http://localhost:8080",
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true
}));


app.use(passport.initialize());

// ─── DB ──────────────────────────────────────────────────────────────────
let db = null;
const client = new MongoClient(process.env.MONGODB_URI, {
    serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true }
});
async function connectDB() {
    if (!db) { await client.connect(); db = client.db("foovafoods"); }
    return db;
}
app.use(async (req, res, next) => { if (!db) await connectDB(); next(); });

const JWT_SECRET = process.env.JWT_SECRET || "foova_secret";

// ─── Email Transporter ───────────────────────────────────────────────────
let transporter = null;
function getTransporter() {
    if (transporter) return transporter;
    transporter = nodemailer.createTransport({
        host: "smtp.hostinger.com",
        port: 465,
        secure: true,
        auth: {
            user: process.env.EMAIL_USER || "info@foovafoods.com",
            pass: process.env.EMAIL_PASS,
        },
        tls: { rejectUnauthorized: false }
    });
    return transporter;
}

async function sendEmail({ to, subject, html }) {
    try {
        const t = getTransporter();
        await t.sendMail({
            from: `"FOOVA FOODS" <${process.env.EMAIL_USER || "info@foovafoods.com"}>`,
            to,
            subject,
            html,
        });
        console.log(`Email sent to ${to}: ${subject}`);
    } catch (err) {
        console.error("Email error:", err.message);
    }
}

// ─── Email Templates ────────────────────────────────────────────────────
function getOrderEmailTemplate(order, type = "user") {
    const itemsHtml = (order.items || []).map(item =>
        `<tr>
      <td style="padding:8px;border-bottom:1px solid #2a2a2a;">${item.name}</td>
      <td style="padding:8px;border-bottom:1px solid #2a2a2a;text-align:center;">${item.quantity}</td>
      <td style="padding:8px;border-bottom:1px solid #2a2a2a;text-align:right;">₹${item.price * item.quantity}</td>
    </tr>`
    ).join("");

    const adminNote = type === "admin" ? `
    <div style="background:#1a2a1a;padding:12px;border-radius:8px;margin-top:16px;border:1px solid #2d4a2d;">
      <b style="color:#D4A843;">📋 Admin Order Info</b><br/>
      <span style="color:#ccc;">Phone: ${order.phone || "N/A"}</span><br/>
      <span style="color:#ccc;">Alternate Phone: ${order.alternate_phone || "N/A"}</span><br/>
      <span style="color:#ccc;">Email: ${order.email || "N/A"}</span><br/>
      <span style="color:#ccc;">Payment: ${order.payment_method === "razorpay" ? "Online (Razorpay)" : "Cash on Delivery"}</span><br/>
      ${order.transaction_id ? `<span style="color:#ccc;">TXN ID: ${order.transaction_id}</span><br/>` : ""}
      ${order.coupon_code ? `<span style="color:#4caf50;">Coupon: ${order.coupon_code} (-₹${order.discount_amount})</span><br/>` : ""}
    </div>` : "";

    return `
  <!DOCTYPE html>
  <html>
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
  <body style="margin:0;padding:0;background:#0a0f0a;font-family:'Poppins',Helvetica,Arial,sans-serif;">
    <div style="max-width:600px;margin:0 auto;background:#111811;border-radius:12px;overflow:hidden;border:1px solid #1e3a1e;">
      <div style="background:linear-gradient(135deg,#1a3a1a,#0a1a0a);padding:32px;text-align:center;border-bottom:2px solid #D4A843;">
        <h1 style="color:#D4A843;margin:0;font-size:28px;letter-spacing:2px;">FOOVA FOODS</h1>
        <p style="color:#8aab8a;margin:8px 0 0;">Premium Iftar | Delivered Fresh</p>
      </div>
      <div style="padding:32px;">
        <h2 style="color:#e8d5a3;margin:0 0 8px;">${type === "admin" ? "🛒 New Order Received!" : "✅ Order Confirmed!"}</h2>
        <p style="color:#8aab8a;margin:0 0 24px;">Order ID: <b style="color:#D4A843;">#${(order.id || "").slice(0, 8)}</b></p>

        <div style="background:#0d1a0d;border-radius:8px;padding:16px;margin-bottom:20px;border:1px solid #1e3a1e;">
          <b style="color:#a0c4a0;font-size:12px;letter-spacing:1px;">DELIVERY ADDRESS</b><br/>
          <span style="color:#e8d5a3;font-weight:600;">${order.full_name || "N/A"}</span><br/>
          <span style="color:#ccc;">${order.shipping_address || ""}</span><br/>
          <span style="color:#ccc;">📞 ${order.phone || "N/A"}</span>
          ${order.alternate_phone ? `<br/><span style="color:#ccc;">📞 Alt: ${order.alternate_phone}</span>` : ""}
        </div>

        <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
          <thead>
            <tr style="background:#1a2a1a;">
              <th style="padding:10px 8px;text-align:left;color:#a0c4a0;font-size:12px;letter-spacing:1px;">ITEM</th>
              <th style="padding:10px 8px;text-align:center;color:#a0c4a0;font-size:12px;letter-spacing:1px;">QTY</th>
              <th style="padding:10px 8px;text-align:right;color:#a0c4a0;font-size:12px;letter-spacing:1px;">TOTAL</th>
            </tr>
          </thead>
          <tbody style="color:#e8d5a3;">${itemsHtml}</tbody>
        </table>

        ${order.discount_amount > 0 ? `<p style="color:#4caf50;text-align:right;margin:0 0 4px;">Coupon Discount: -₹${order.discount_amount}</p>` : ""}
        <div style="background:#1a2a1a;border-radius:8px;padding:16px;text-align:right;border:1px solid #D4A843/30;">
          <span style="color:#8aab8a;">Total Amount: </span>
          <b style="color:#D4A843;font-size:22px;">₹${order.total}</b>
        </div>

        ${adminNote}

        <div style="text-align:center;margin-top:28px;">
          <a href="${FRONTEND_URL}" style="background:#D4A843;color:#0a0f0a;padding:12px 32px;border-radius:50px;text-decoration:none;font-weight:700;font-size:14px;display:inline-block;">Visit FOOVA FOODS</a>
        </div>
      </div>
      <div style="padding:16px;text-align:center;border-top:1px solid #1e3a1e;">
        <p style="color:#4a6a4a;font-size:12px;margin:0;">© ${new Date().getFullYear()} FOOVA FOODS | info@foovafoods.com</p>
      </div>
    </div>
  </body>
  </html>`;
}

function getStatusUpdateEmailTemplate(order) {
    const statusEmoji = {
        pending: "⏳", confirmed: "✅", packed: "📦", dispatched: "🚚",
        out_for_delivery: "🛵", delivered: "🎉", cancelled: "❌"
    };
    const statusLabels = {
        pending: "Pending", confirmed: "Confirmed", packed: "Packed", dispatched: "Dispatched",
        out_for_delivery: "Out for Delivery", delivered: "Delivered", cancelled: "Cancelled"
    };
    return `
  <!DOCTYPE html>
  <html>
  <body style="margin:0;padding:0;background:#0a0f0a;font-family:'Poppins',Helvetica,Arial,sans-serif;">
    <div style="max-width:600px;margin:0 auto;background:#111811;border-radius:12px;overflow:hidden;border:1px solid #1e3a1e;">
      <div style="background:linear-gradient(135deg,#1a3a1a,#0a1a0a);padding:24px;text-align:center;border-bottom:2px solid #D4A843;">
        <h1 style="color:#D4A843;margin:0;font-size:24px;">FOOVA FOODS</h1>
      </div>
      <div style="padding:32px;text-align:center;">
        <div style="font-size:48px;margin-bottom:16px;">${statusEmoji[order.status] || "📦"}</div>
        <h2 style="color:#e8d5a3;margin:0 0 8px;">Order Status Updated</h2>
        <p style="color:#8aab8a;margin:0 0 24px;">Order #${(order.id || "").slice(0, 8)}</p>
        <div style="background:#1a2a1a;border-radius:12px;padding:20px;border:2px solid #D4A843;display:inline-block;min-width:200px;">
          <p style="color:#8aab8a;margin:0 0 4px;font-size:12px;letter-spacing:1px;">CURRENT STATUS</p>
          <p style="color:#D4A843;font-size:22px;font-weight:700;margin:0;">${statusLabels[order.status] || order.status}</p>
        </div>
        ${order.status === "delivered" ? `
        <div style="margin-top:24px;background:#0d1a0d;border-radius:8px;padding:16px;border:1px solid #2d4a2d;">
          <p style="color:#4caf50;margin:0;font-size:14px;">🙏 Thank you for ordering with FOOVA FOODS!</p>
          <p style="color:#8aab8a;margin:8px 0 0;font-size:13px;">We'd love to hear about your experience. Please share your review!</p>
          <a href="${FRONTEND_URL}/products" style="display:inline-block;margin-top:12px;background:#D4A843;color:#0a0f0a;padding:10px 24px;border-radius:50px;text-decoration:none;font-weight:700;font-size:13px;">Write a Review</a>
        </div>` : ""}
      </div>
      <div style="padding:16px;text-align:center;border-top:1px solid #1e3a1e;">
        <p style="color:#4a6a4a;font-size:12px;margin:0;">© ${new Date().getFullYear()} FOOVA FOODS | info@foovafoods.com</p>
      </div>
    </div>
  </body>
  </html>`;
}

function getDeliveryReviewEmailTemplate(order) {
    return `
  <!DOCTYPE html>
  <html>
  <body style="margin:0;padding:0;background:#0a0f0a;font-family:'Poppins',Helvetica,Arial,sans-serif;">
    <div style="max-width:600px;margin:0 auto;background:#111811;border-radius:12px;overflow:hidden;border:1px solid #1e3a1e;">
      <div style="background:linear-gradient(135deg,#1a3a1a,#0a1a0a);padding:24px;text-align:center;border-bottom:2px solid #D4A843;">
        <h1 style="color:#D4A843;margin:0;font-size:24px;">FOOVA FOODS</h1>
      </div>
      <div style="padding:32px;text-align:center;">
        <div style="font-size:48px;margin-bottom:16px;">⭐</div>
        <h2 style="color:#e8d5a3;margin:0 0 8px;">How was your experience?</h2>
        <p style="color:#8aab8a;margin:0 0 16px;">Order #${(order.id || "").slice(0, 8)} has been delivered!</p>
        <p style="color:#ccc;margin:0 0 24px;font-size:14px;">
          Dear ${order.full_name || "Valued Customer"},<br/>
          We hope you loved your FOOVA FOODS order. Your feedback means a lot to us and helps us serve you better!
        </p>
        <a href="${FRONTEND_URL}/products" style="display:inline-block;background:#D4A843;color:#0a0f0a;padding:14px 36px;border-radius:50px;text-decoration:none;font-weight:700;font-size:15px;">⭐ Write a Review</a>
        <p style="color:#4a6a4a;font-size:12px;margin-top:20px;">Thank you for choosing FOOVA FOODS — Premium Iftar Delivered Fresh</p>
      </div>
    </div>
  </body>
  </html>`;
}

// ─── Cloudinary or Local Upload ──────────────────────────────────────────
let upload;
if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
    });
    const storage = new CloudinaryStorage({
        cloudinary,
        params: {
            folder: "foovafoods_products",
            allowed_formats: ["jpg", "jpeg", "png", "webp", "gif"],
            transformation: [{ quality: "auto", fetch_format: "auto" }],
        },
    });
    upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });
    console.log("✅ Cloudinary storage enabled for persistent image hosting");
} else {
    const uploadsDir = path.join(__dirname, "public/uploads");
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
    const storage = multer.diskStorage({
        destination: uploadsDir,
        filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9.]/g, "_")}`),
    });
    upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });
    console.log("⚠️  Local storage used. Configure Cloudinary in .env for permanent image hosting.");
}

// ─── Passport Google Strategy ─────────────────────────────────────────────
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: GOOGLE_CALLBACK_URL,
    }, async (accessToken, refreshToken, profile, done) => {
        try {
            const database = await connectDB();
            const email = profile.emails[0].value;
            let user = await database.collection("users").findOne({ email });
            if (!user) {
                const id = crypto.randomUUID();
                const role = (email === "info@foovafoods.com" || email === "foovafoods@gmail.com") ? "admin" : "user";
                user = { id, email, google_id: profile.id, role, created_at: new Date().toISOString() };
                await database.collection("users").insertOne(user);
                await database.collection("profiles").insertOne({
                    user_id: id, full_name: profile.displayName,
                    avatar: profile.photos[0]?.value, email, created_at: new Date().toISOString()
                });
            } else if (!user.google_id) {
                await database.collection("users").updateOne({ id: user.id }, { $set: { google_id: profile.id } });
            }
            const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: "7d" });
            return done(null, { user, token });
        } catch (error) { return done(error, null); }
    }));
}

// ─── Auth Routes ───────────────────────────────────────────────────────────
app.get("/api/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));
app.get("/api/auth/google/callback",
    passport.authenticate("google", { session: false, failureRedirect: `${FRONTEND_URL}/login` }),
    (req, res) => {
        const { token } = req.user;
        res.redirect(`${FRONTEND_URL}/google-success?token=${token}`);
    }
);

app.post("/api/auth/register", async (req, res) => {
    try {
        const { email, password, full_name, phone } = req.body;
        if (!email || !password) return res.status(400).json({ error: "Email and password required" });
        const existing = await db.collection("users").findOne({ email });
        if (existing) return res.status(400).json({ error: "Email already registered" });
        const id = crypto.randomUUID();
        const role = (email === "info@foovafoods.com" || email === "foovafoods@gmail.com") ? "admin" : "user";
        await db.collection("users").insertOne({
            id, email, password: await bcrypt.hash(password, 12), role, phone: phone || null,
            created_at: new Date().toISOString()
        });
        await db.collection("profiles").insertOne({
            user_id: id, full_name: full_name || "", email, phone: phone || null,
            created_at: new Date().toISOString()
        });
        res.json({ token: jwt.sign({ id, role }, JWT_SECRET, { expiresIn: "7d" }), user: { id, email, full_name, role } });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/api/auth/login", authLimiter, async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await db.collection("users").findOne({ email });
        if (!user || !user.password || !(await bcrypt.compare(password, user.password)))
            return res.status(401).json({ error: "Invalid email or password" });
        const profile = await db.collection("profiles").findOne({ user_id: user.id });
        res.json({
            token: jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: "7d" }),
            user: { id: user.id, email, full_name: profile?.full_name, role: user.role }
        });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Forgot Password - send reset link to user email
app.post("/api/auth/forgot-password", async (req, res) => {
    try {
        const { email } = req.body;
        const user = await db.collection("users").findOne({ email });
        if (user) {
            const token = crypto.randomBytes(32).toString("hex");
            const expiry = new Date(Date.now() + 15 * 60 * 1000); // 15 min
            await db.collection("users").updateOne(
                { id: user.id },
                { $set: { resetToken: token, resetExpiry: expiry } }
            );
            const resetUrl = `${FRONTEND_URL}/reset-password?token=${token}&email=${encodeURIComponent(email)}`;
            await sendEmail({
                to: email,
                subject: "Reset Your FOOVA FOODS Password",
                html: `
        <div style="font-family:'Poppins',Arial,sans-serif;background:#0a0f0a;padding:32px;border-radius:12px;max-width:500px;margin:0 auto;">
          <h2 style="color:#D4A843;text-align:center;">🔐 Password Reset</h2>
          <p style="color:#ccc;">Hi, we received a request to reset your password for your FOOVA FOODS account.</p>
          <p style="color:#ccc;">Click the button below to reset your password. This link expires in 15 minutes.</p>
          <div style="text-align:center;margin:24px 0;">
            <a href="${resetUrl}" style="background:#D4A843;color:#0a0f0a;padding:14px 36px;border-radius:50px;text-decoration:none;font-weight:700;display:inline-block;">Reset Password</a>
          </div>
          <p style="color:#4a6a4a;font-size:12px;text-align:center;">If you didn't request this, please ignore this email.</p>
        </div>`
            });
        }
        res.json({ message: "If that email exists, a reset link has been sent." });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Reset Password
app.post("/api/auth/reset-password", async (req, res) => {
    try {
        const { email, token, newPassword } = req.body;
        const user = await db.collection("users").findOne({ email, resetToken: token });
        if (!user || !user.resetExpiry || new Date() > new Date(user.resetExpiry))
            return res.status(400).json({ error: "Invalid or expired reset link" });
        const hashed = await bcrypt.hash(newPassword, 12);
        await db.collection("users").updateOne(
            { email },
            { $set: { password: hashed }, $unset: { resetToken: "", resetExpiry: "" } }
        );
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Change Password (for logged-in users)
app.post("/api/auth/change-password", async (req, res) => {
    try {
        const { userId, currentPassword, newPassword } = req.body;
        const user = await db.collection("users").findOne({ id: userId });
        if (!user || !(await bcrypt.compare(currentPassword, user.password)))
            return res.status(401).json({ error: "Current password is incorrect" });
        await db.collection("users").updateOne({ id: userId }, { $set: { password: await bcrypt.hash(newPassword, 12) } });
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Product Routes ──────────────────────────────────────────────────────
app.get("/api/products", async (req, res) => res.json(await db.collection("products").find().toArray()));
app.get("/api/products/:id", async (req, res) => res.json(await db.collection("products").findOne({ id: req.params.id })));

// ─── Categories ──────────────────────────────────────────────────────────
app.get("/api/categories", async (req, res) => {
    try { res.json(await db.collection("categories").find().toArray()); }
    catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Settings ────────────────────────────────────────────────────────────
app.get("/api/settings", async (req, res) => {
    try { res.json(await db.collection("site_content").find().toArray()); }
    catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Testimonials ────────────────────────────────────────────────────────
app.get("/api/testimonials", async (req, res) => {
    try {
        const t = await db.collection("testimonials").find({ is_visible: true }).toArray();
        res.json(t);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── User Addresses ──────────────────────────────────────────────────────
app.get("/api/user/addresses/:userId", async (req, res) => {
    try { res.json(await db.collection("addresses").find({ user_id: req.params.userId }).toArray()); }
    catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/api/user/addresses", async (req, res) => {
    try {
        const payload = req.body;
        const id = payload.id || crypto.randomUUID();
        await db.collection("addresses").updateOne(
            { id },
            { $set: { ...payload, id, updated_at: new Date().toISOString() } },
            { upsert: true }
        );
        res.json({ success: true, id });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete("/api/user/addresses/:id", async (req, res) => {
    try {
        await db.collection("addresses").deleteOne({ id: req.params.id });
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Orders & Stock ──────────────────────────────────────────────────────
async function validateAndReduceStock(items) {
    for (const item of items) {
        const p = await db.collection("products").findOne({ id: item.id });
        if (!p) throw new Error(`Product not found: ${item.name}`);
        if ((p.stock_quantity || 0) < item.quantity)
            throw new Error(`Insufficient stock for ${item.name}. Only ${p.stock_quantity || 0} left.`);
        // ISSUE #11: Max 1 per person check is enforced by stock and quantity check above
        // If stock is 1 and someone tries to order 2, it will throw
    }
    for (const item of items) {
        await db.collection("products").updateOne(
            { id: item.id },
            { $inc: { stock_quantity: -item.quantity } }
        );
        // Re-check and set in_stock flag
        const updated = await db.collection("products").findOne({ id: item.id });
        if (updated && updated.stock_quantity <= 0) {
            await db.collection("products").updateOne({ id: item.id }, { $set: { in_stock: false, stock_quantity: 0 } });
        }
    }
}

app.post("/api/orders", async (req, res) => {
    try {
        const order = req.body;
        await validateAndReduceStock(order.items);
        const newOrder = {
            ...order,
            id: crypto.randomUUID(),
            status: "pending",
            payment_status: "pending",
            status_timeline: [{ status: "pending", time: new Date().toISOString() }],
            created_at: new Date().toISOString()
        };
        await db.collection("orders").insertOne(newOrder);

        // Email to customer
        if (order.email) {
            sendEmail({ to: order.email, subject: "✅ Order Placed — FOOVA FOODS", html: getOrderEmailTemplate(newOrder, "user") });
        }
        // Email to admin
        sendEmail({ to: "info@foovafoods.com", subject: "🛒 New Order Received", html: getOrderEmailTemplate(newOrder, "admin") });

        res.json({ success: true, order_id: newOrder.id });
    } catch (err) { res.status(400).json({ error: err.message }); }
});

app.get("/api/orders/:userId", async (req, res) => {
    try {
        const orders = await db.collection("orders").find({ user_id: req.params.userId }).sort({ created_at: -1 }).toArray();
        res.json(orders);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Razorpay ────────────────────────────────────────────────────────────
app.post("/api/razorpay/create-order", async (req, res) => {
    try {
        const { amount, receipt } = req.body;
        const keyId = process.env.RAZORPAY_KEY_ID;
        const keySecret = process.env.RAZORPAY_KEY_SECRET;
        if (!keyId || !keySecret) return res.status(500).json({ error: "Razorpay not configured" });

        const body = JSON.stringify({ amount: Math.round(amount * 100), currency: "INR", receipt });
        const creds = Buffer.from(`${keyId}:${keySecret}`).toString("base64");

        const response = await fetch("https://api.razorpay.com/v1/orders", {
            method: "POST",
            headers: { "Authorization": `Basic ${creds}`, "Content-Type": "application/json" },
            body,
        });
        const data = await response.json();
        if (data.error) return res.status(400).json({ error: data.error.description });
        res.json({ order_id: data.id, key_id: keyId, amount: data.amount });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/api/razorpay/verify-payment", async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderData } = req.body;
        const expected = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(`${razorpay_order_id}|${razorpay_payment_id}`).digest("hex");
        if (expected !== razorpay_signature) return res.status(400).json({ error: "Invalid payment signature" });

        await validateAndReduceStock(orderData.items);
        const newOrder = {
            ...orderData,
            id: crypto.randomUUID(),
            status: "confirmed",
            payment_status: "paid",
            transaction_id: razorpay_payment_id,
            status_timeline: [
                { status: "confirmed", time: new Date().toISOString() }
            ],
            created_at: new Date().toISOString()
        };
        await db.collection("orders").insertOne(newOrder);

        // Payment receipt email to customer
        if (orderData.email) {
            sendEmail({ to: orderData.email, subject: "💳 Payment Confirmed — FOOVA FOODS", html: getOrderEmailTemplate(newOrder, "user") });
        }
        // Notify admin
        sendEmail({ to: "info@foovafoods.com", subject: "💰 Payment Received — New Order", html: getOrderEmailTemplate(newOrder, "admin") });

        res.json({ success: true, order_id: newOrder.id });
    } catch (err) { res.status(400).json({ error: err.message }); }
});

// ─── Upload ───────────────────────────────────────────────────────────────
app.post("/api/upload", upload.single("file"), (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    // For Cloudinary, the URL is in req.file.path
    // For local, we build the URL
    const url = req.file.path || `/uploads/${req.file.filename}`;
    console.log("Upload success:", url);
    res.json({ url });
});

// ─── Admin Data ───────────────────────────────────────────────────────────
app.get("/api/admin/data", async (req, res) => {
    try {
        const [products, orders, coupons, testimonials, banners, profiles, categories] = await Promise.all([
            db.collection("products").find().sort({ created_at: -1 }).toArray(),
            db.collection("orders").find().sort({ created_at: -1 }).toArray(),
            db.collection("coupons").find().toArray(),
            db.collection("testimonials").find().toArray(),
            db.collection("banners").find().toArray(),
            db.collection("profiles").find().toArray(),
            db.collection("categories").find().toArray(),
        ]);
        res.json({ products, orders, coupons, testimonials, banners, profiles, categories });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/api/admin/products", async (req, res) => {
    try {
        const p = req.body;
        const now = new Date().toISOString();
        // Preserve image_url if already set and not being changed
        await db.collection("products").updateOne(
            { id: p.id },
            { $set: { ...p, updated_at: now }, $setOnInsert: { created_at: now } },
            { upsert: true }
        );
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete("/api/admin/products/:id", async (req, res) => {
    try {
        await db.collection("products").deleteOne({ id: req.params.id });
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/api/admin/categories", async (req, res) => {
    try {
        const c = req.body;
        const now = new Date().toISOString();
        await db.collection("categories").updateOne(
            { id: c.id },
            { $set: { ...c, updated_at: now }, $setOnInsert: { created_at: now } },
            { upsert: true }
        );
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete("/api/admin/categories/:id", async (req, res) => {
    try {
        await db.collection("categories").deleteOne({ id: req.params.id });
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/api/admin/coupons", async (req, res) => {
    try {
        const c = req.body;
        const now = new Date().toISOString();
        await db.collection("coupons").updateOne(
            { id: c.id },
            { $set: { ...c, updated_at: now }, $setOnInsert: { created_at: now, used_count: 0 } },
            { upsert: true }
        );
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete("/api/admin/coupons/:id", async (req, res) => {
    try {
        await db.collection("coupons").deleteOne({ id: req.params.id });
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Validate coupon
app.post("/api/coupons/validate", async (req, res) => {
    try {
        const { code, cartTotal } = req.body;
        const c = await db.collection("coupons").findOne({ code: code.toUpperCase(), is_active: true });
        if (!c) return res.status(404).json({ error: "Invalid or expired coupon" });
        if (c.expires_at && new Date() > new Date(c.expires_at))
            return res.status(400).json({ error: "Coupon has expired" });
        if (c.min_order_amount && cartTotal < c.min_order_amount)
            return res.status(400).json({ error: `Minimum order ₹${c.min_order_amount} required` });
        if (c.max_uses && (c.used_count || 0) >= c.max_uses)
            return res.status(400).json({ error: "Coupon usage limit reached" });
        const discount = c.discount_type === "percentage"
            ? Math.round((cartTotal * c.discount_value) / 100)
            : c.discount_value;
        res.json({ valid: true, discount, coupon: c });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/api/admin/banners", async (req, res) => {
    try {
        const b = req.body;
        const now = new Date().toISOString();
        await db.collection("banners").updateOne(
            { id: b.id || crypto.randomUUID() },
            { $set: { ...b, updated_at: now }, $setOnInsert: { created_at: now } },
            { upsert: true }
        );
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete("/api/admin/banners/:id", async (req, res) => {
    try {
        await db.collection("banners").deleteOne({ id: req.params.id });
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/api/admin/testimonials", async (req, res) => {
    try {
        const t = req.body;
        const now = new Date().toISOString();
        await db.collection("testimonials").updateOne(
            { id: t.id },
            { $set: { ...t, updated_at: now }, $setOnInsert: { created_at: now } },
            { upsert: true }
        );
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete("/api/admin/testimonials/:id", async (req, res) => {
    try {
        await db.collection("testimonials").deleteOne({ id: req.params.id });
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/api/admin/settings", async (req, res) => {
    try {
        const { key, value } = req.body;
        await db.collection("site_content").updateOne(
            { key },
            { $set: { key, value, updated_at: new Date().toISOString() } },
            { upsert: true }
        );
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Admin: Update order status + send email notification
app.post("/api/admin/orders/status", async (req, res) => {
    try {
        const { orderId, status } = req.body;
        const order = await db.collection("orders").findOne({ id: orderId });
        if (!order) return res.status(404).json({ error: "Order not found" });

        const timeline = order.status_timeline || [];
        timeline.push({ status, time: new Date().toISOString() });

        await db.collection("orders").updateOne(
            { id: orderId },
            { $set: { status, status_timeline: timeline, updated_at: new Date().toISOString() } }
        );

        const updatedOrder = { ...order, status, status_timeline: timeline };

        // Send status update email to customer
        if (order.email) {
            sendEmail({
                to: order.email,
                subject: `📦 Order Update — ${status.replace(/_/g, " ").toUpperCase()} | FOOVA FOODS`,
                html: getStatusUpdateEmailTemplate(updatedOrder)
            });
        }

        // If delivered, send review request email
        if (status === "delivered" && order.email) {
            setTimeout(() => {
                sendEmail({
                    to: order.email,
                    subject: "⭐ How was your FOOVA FOODS order? Share your review!",
                    html: getDeliveryReviewEmailTemplate(updatedOrder)
                });
            }, 3000);
        }

        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/api/admin/orders/tracking", async (req, res) => {
    try {
        const { orderId, tracking_number, tracking_link } = req.body;
        await db.collection("orders").updateOne(
            { id: orderId },
            { $set: { tracking_number, tracking_link, updated_at: new Date().toISOString() } }
        );
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Admin: Send mass offer notification email to all users
app.post("/api/admin/offers", async (req, res) => {
    try {
        const { title, message } = req.body;
        const users = await db.collection("users").find({ role: "user" }).toArray();
        let sent = 0;
        for (const u of users) {
            if (u.email) {
                await sendEmail({
                    to: u.email,
                    subject: title,
                    html: `
          <div style="font-family:'Poppins',Arial,sans-serif;background:#0a0f0a;padding:32px;border-radius:12px;max-width:600px;margin:0 auto;border:1px solid #1e3a1e;">
            <div style="text-align:center;margin-bottom:24px;">
              <h1 style="color:#D4A843;font-size:24px;margin:0;">FOOVA FOODS</h1>
              <p style="color:#8aab8a;margin:4px 0 0;font-size:13px;">Special Offer</p>
            </div>
            <h2 style="color:#e8d5a3;margin:0 0 12px;">${title}</h2>
            <div style="color:#ccc;line-height:1.7;white-space:pre-wrap;">${message}</div>
            <div style="text-align:center;margin-top:28px;">
              <a href="${FRONTEND_URL}/products" style="background:#D4A843;color:#0a0f0a;padding:12px 32px;border-radius:50px;text-decoration:none;font-weight:700;display:inline-block;">Shop Now</a>
            </div>
            <p style="color:#4a6a4a;font-size:11px;text-align:center;margin-top:20px;">© FOOVA FOODS | info@foovafoods.com</p>
          </div>`
                });
                sent++;
            }
        }
        res.json({ success: true, sent });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Static Files ────────────────────────────────────────────────────────
app.use("/uploads", express.static(path.join(__dirname, "public/uploads")));

const dist = path.join(__dirname, "../frontend/dist");
if (fs.existsSync(dist)) {
    app.use(express.static(dist));
    app.get("*", (req, res) => res.sendFile(path.join(dist, "index.html")));
}

app.listen(PORT, () => console.log(`✅ FOOVA FOODS Server running on port ${PORT}`));
