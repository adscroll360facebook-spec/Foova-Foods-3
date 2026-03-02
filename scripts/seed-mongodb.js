import { MongoClient, ServerApiVersion } from 'mongodb';
const uri = "process.env.MONGODB_URI";

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        await client.connect();
        const db = client.db("foovafoods");

        console.log("--- Standardizing Products ---");
        const products = await db.collection("products").find().toArray();
        for (const p of products) {
            const update = {};
            if (p.image && !p.image_url) update.image_url = p.image;
            if (p.stock !== undefined && p.stock_quantity === undefined) update.stock_quantity = p.stock;
            if (p.stock_quantity !== undefined) update.in_stock = p.stock_quantity > 0;
            else if (p.stock !== undefined) update.in_stock = p.stock > 0;

            if (!p.id) update.id = p._id.toString();

            if (Object.keys(update).length > 0) {
                await db.collection("products").updateOne({ _id: p._id }, { $set: update });
                console.log(`Updated product: ${p.name}`);
            }
        }

        console.log("--- Seeding site_content ---");
        const siteContent = [
            { key: "featured_products_visible", value: "true", updated_at: new Date().toISOString() },
            { key: "homepage_featured_product_ids", value: "[]", updated_at: new Date().toISOString() }
        ];
        for (const item of siteContent) {
            await db.collection("site_content").updateOne({ key: item.key }, { $set: item }, { upsert: true });
        }
        console.log("Seeded site_content");

        console.log("--- Seeding user_roles for Admin ---");
        const adminEmail = "foovafoods@gmail.com";
        // We don't have the auth user_id yet, but we can seed it with a placeholder or just let the app handle it.
        // However, the app checks roles by user_id. 
        // In Supabase, the user_id is a UUID.
        // Since we don't know the user's UUID without them logging in once, 
        // we can't fully seed user_roles.
        // BUT we can add a document once we have a user_id.

        console.log("--- Ensuring collections exist ---");
        const collections = ["orders", "coupons", "testimonials", "offer_banners", "profiles", "user_roles"];
        for (const col of collections) {
            const existing = await db.listCollections({ name: col }).toArray();
            if (existing.length === 0) {
                await db.createCollection(col);
                console.log(`Created collection: ${col}`);
            }
        }

        console.log("--- Seeding Testimonials ---");
        const testimonials = [
            { id: "t1", customer_name: "Sarah M.", text: "The Medjool dates were incredibly fresh and sweet. Perfect for breaking fast.", rating: 5, is_visible: true, created_at: new Date().toISOString() },
            { id: "t2", customer_name: "Ahmed K.", text: "The Iftar kit made my Ramadan preparations so much easier. Highly recommend!", rating: 5, is_visible: true, created_at: new Date().toISOString() }
        ];
        for (const t of testimonials) {
            await db.collection("testimonials").updateOne({ id: t.id }, { $set: t }, { upsert: true });
        }

        console.log("--- Seeding Offer Banners ---");
        const banners = [
            { id: "b1", image_url: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=1600&h=400", is_active: true, sort_order: 0, created_at: new Date().toISOString() }
        ];
        for (const b of banners) {
            await db.collection("offer_banners").updateOne({ id: b.id }, { $set: b }, { upsert: true });
        }

        console.log("✅ Seeding complete!");

    } finally {
        await client.close();
    }
}
run();
