import { MongoClient, ServerApiVersion } from 'mongodb';
import bcrypt from 'bcryptjs';

const uri = "process.env.MONGODB_URI";
const client = new MongoClient(uri, {
    serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true }
});

async function run() {
    try {
        await client.connect();
        const db = client.db('foovafoods');

        // Check if admin exists
        const adminExists = await db.collection('users').findOne({ email: 'foovafoods@gmail.com' });
        if (!adminExists) {
            console.log('Creating admin user...');
            const hashedPassword = await bcrypt.hash('Foovafoods@@1113', 10);
            const userId = 'admin-uuid-1234';

            await db.collection('users').insertOne({
                id: userId,
                email: 'foovafoods@gmail.com',
                password: hashedPassword,
                role: 'admin',
                created_at: new Date().toISOString()
            });

            await db.collection('profiles').insertOne({
                user_id: userId,
                full_name: 'Foova Admin',
                email: 'foovafoods@gmail.com',
                created_at: new Date().toISOString()
            });
            console.log('Admin user created successfully.');
        } else {
            console.log('Admin user already exists.');
        }

        // Seed settings so the DB shows up even if admin existed
        await db.collection('site_content').updateOne(
            { key: 'site_name' },
            { $set: { value: 'Foova Foods', updated_at: new Date().toISOString() } },
            { upsert: true }
        );
        console.log('Database seeded. It should now appear in Atlas!');
    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }
}
run();
