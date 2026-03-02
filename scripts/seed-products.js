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

        const products = [
            {
                id: "p1",
                name: "Premium Medjool Dates",
                description: "Large, succulent dates from the Jordan Valley. Perfect for Iftar.",
                price: 850,
                original_price: 950,
                category: "Dates",
                badge: "Bestseller",
                weight: "500g",
                image_url: "https://images.unsplash.com/photo-1590005024862-6b67679a29fb?auto=format&fit=crop&q=80&w=800",
                stock_quantity: 50,
                in_stock: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            },
            {
                id: "p2",
                name: "Ramadan Essentials Kit",
                description: "Complete set of dates, dry fruits, and prayer beads.",
                price: 2450,
                original_price: 2999,
                category: "Iftar Kits",
                badge: "Limited Edition",
                weight: "2kg",
                image_url: "https://images.unsplash.com/photo-1584447128309-b66b7a4d1b63?auto=format&fit=crop&q=80&w=800",
                stock_quantity: 20,
                in_stock: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            },
            {
                id: "p3",
                name: "Exotic Oud Perfume",
                description: "Long-lasting traditional Arabic fragrance with notes of agarwood and rose.",
                price: 1800,
                original_price: 2200,
                category: "perfumes",
                badge: "New Arrival",
                weight: "100ml",
                image_url: "https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&q=80&w=800",
                stock_quantity: 15,
                in_stock: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }
        ];

        console.log("Seeding products...");
        for (const p of products) {
            await db.collection("products").updateOne({ id: p.id }, { $set: p }, { upsert: true });
        }
        console.log("✅ Products seeded successfully!");

    } finally {
        await client.close();
    }
}
run();
