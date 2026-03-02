import { MongoClient, ServerApiVersion } from "mongodb";
import "dotenv/config";

const MONGO_URI = process.env.MONGODB_URI;
console.log("Testing connection to:", MONGO_URI);

const client = new MongoClient(MONGO_URI, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    },
    connectTimeoutMS: 5000,
});

async function run() {
    try {
        await client.connect();
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } catch (err) {
        console.error("Connection failed:", err);
    } finally {
        await client.close();
    }
}
run();
