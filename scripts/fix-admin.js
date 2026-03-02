import "dotenv/config";
import { MongoClient, ServerApiVersion } from 'mongodb';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const uri = process.env.MONGODB_URI || "process.env.MONGODB_URI";
const email = "foovafoods@gmail.com";
const password = "Foovafoods@@1113"; // Using the password from previous conversation context

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

        console.log(`--- Setting up Admin Account: ${email} ---`);

        const hashedPassword = await bcrypt.hash(password, 10);
        const userId = crypto.randomUUID();

        // 1. Upsert User
        const userUpdate = {
            id: userId,
            email: email,
            password: hashedPassword,
            role: "admin",
            updated_at: new Date().toISOString()
        };

        const existingUser = await db.collection("users").findOne({ email });
        if (existingUser) {
            await db.collection("users").updateOne({ email }, { $set: { password: hashedPassword, role: "admin", updated_at: new Date().toISOString() } });
            console.log("Updated existing admin password.");
        } else {
            await db.collection("users").insertOne({
                ...userUpdate,
                created_at: new Date().toISOString()
            });
            console.log("Created new admin user.");
        }

        const finalUser = await db.collection("users").findOne({ email });

        // 2. Upsert Profile
        await db.collection("profiles").updateOne(
            { email: email },
            {
                $set: {
                    user_id: finalUser.id,
                    full_name: "Foova Foods Admin",
                    updated_at: new Date().toISOString()
                },
                $setOnInsert: { created_at: new Date().toISOString() }
            },
            { upsert: true }
        );
        console.log("Admin profile synchronized.");

        console.log("✅ Admin credentials set successfully!");
        console.log(`Email: ${email}`);
        console.log(`Password: ${password}`);

    } catch (err) {
        console.error("❌ Error setting admin credentials:", err);
    } finally {
        await client.close();
    }
}
run();
