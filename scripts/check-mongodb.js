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
        const collections = await db.listCollections().toArray();
        console.log("Collections:", collections.map(c => c.name));

        for (const col of collections) {
            const count = await db.collection(col.name).countDocuments();
            console.log(`${col.name}: ${count} documents`);
        }

    } finally {
        await client.close();
    }
}
run();
