import { MongoClient, ServerApiVersion } from 'mongodb';
const uri = "mongodb+srv://foovafoods_db_user:MH5xYEk6x7qhFKm@cluster0.my1ojmt.mongodb.net/?appName=Cluster0";

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
        const products = await db.collection("products").find().toArray();
        console.log("Products:", JSON.stringify(products, null, 2));

    } finally {
        await client.close();
    }
}
run();
