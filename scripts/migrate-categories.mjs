import { MongoClient, ServerApiVersion } from 'mongodb';
import crypto from 'crypto';

const uri = "mongodb+srv://foovafoods_db_user:KDvxLp0m9Gqk8qHE@cluster0.qiwticq.mongodb.net/?appName=Cluster0";

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

        console.log("--- 1. Reassigning Cosmetics & Perfumes to General ---");
        const result = await db.collection("products").updateMany(
            { category: { $in: ["cosmetics", "perfumes"] } },
            { $set: { category: "General", updated_at: new Date().toISOString() } }
        );
        console.log(`Updated ${result.modifiedCount} products.`);

        console.log("--- 2. Seeding Dynamic Categories ---");
        const categories = [
            "🕌 Islamic Essentials",
            "🎁 Gift Hampers",
            "🍯 Honey & Sunnah Foods",
            "🌿 Herbal Products",
            "🥜 Premium Nuts",
            "🛍 Special Combos",
            "🎉 Festival Specials",
            "🧴 Personal Care",
            "Dates",
            "Iftar Kits",
            "Dry Fruits",
            "General"
        ];

        for (const catName of categories) {
            const id = crypto.randomUUID();
            await db.collection("categories").updateOne(
                { name: catName },
                { 
                    $setOnInsert: { id, created_at: new Date().toISOString() },
                    $set: { updated_at: new Date().toISOString() }
                },
                { upsert: true }
            );
            console.log(`Ensured category: ${catName}`);
        }

        console.log("✅ Migration complete!");

    } finally {
        await client.close();
    }
}
run();
