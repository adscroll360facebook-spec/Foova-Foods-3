import { MongoClient, ServerApiVersion } from 'mongodb';
import 'dotenv/config';

const MONGODB_URI = process.env.MONGODB_URI || "process.env.MONGODB_URI";

async function setup() {
    const client = new MongoClient(MONGODB_URI, {
        serverApi: {
            version: ServerApiVersion.v1,
            strict: true,
            deprecationErrors: true,
        },
        connectTimeoutMS: 10000,
    });

    try {
        console.log("Connecting to MongoDB for setup...");
        await client.connect();
        const db = client.db("foovafoods");

        console.log("Creating indexes...");
        await db.collection("users").createIndex({ email: 1 }, { unique: true });
        await db.collection("users").createIndex({ id: 1 }, { unique: true });
        await db.collection("profiles").createIndex({ user_id: 1 }, { unique: true });
        await db.collection("products").createIndex({ id: 1 }, { unique: true });
        await db.collection("orders").createIndex({ id: 1 }, { unique: true });
        await db.collection("addresses").createIndex({ id: 1 }, { unique: true });
        await db.collection("reviews").createIndex({ id: 1 }, { unique: true });

        console.log("✅ Database setup complete!");
    } catch (err) {
        console.error("❌ Setup failed:", err.message);
        if (err.message.includes("SSL")) {
            console.error("\n💡 IMPORTANT: This SSL error usually means your IP is NOT whitelisted in MongoDB Atlas.");
            console.error("Please go to MongoDB Atlas -> Network Access -> Add IP Address -> Allow Access From Anywhere (0.0.0.0/0) or your current IP.\n");
        }
    } finally {
        await client.close();
    }
}

setup();
