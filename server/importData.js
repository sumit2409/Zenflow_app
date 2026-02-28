const { MongoClient } = require('mongodb');
const path = require('path');
const fs = require('fs');

async function run() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/zenflow';
  const client = new MongoClient(uri, { useUnifiedTopology: true });
  await client.connect();
  const db = client.db();
  console.log('Connected to', uri);
  
  // load fallback file
  const dataPath = path.join(__dirname, 'data.json');
  if (!fs.existsSync(dataPath)) {
    console.error('data.json not found');
    process.exit(1);
  }
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

  // clear existing collections
  await db.dropDatabase();
  console.log('Dropped existing database.');

  // users
  const users = Object.entries(data.users || {}).map(([username,info]) => ({ username, ...info }));
  if (users.length) {
    await db.collection('users').insertMany(users);
    console.log('Imported', users.length, 'users');
  }

  // logs - convert nested structure
  const logs = [];
  for (const [username, days] of Object.entries(data.logs || {})) {
    for (const [date, types] of Object.entries(days)) {
      if (typeof types === 'object') {
        for (const [type, value] of Object.entries(types)) {
          logs.push({ user: username, date, type, value });
        }
      } else {
        // old format
        logs.push({ user: username, date, type: 'steps', value: types });
      }
    }
  }
  if (logs.length) {
    await db.collection('logs').insertMany(logs);
    console.log('Imported', logs.length, 'log entries');
  }

  // meta
  if (data.meta && Object.keys(data.meta).length) {
    await db.collection('meta').insertOne(data.meta);
    console.log('Imported meta');
  }

  // show collections
  const cols = await db.listCollections().toArray();
  console.log('Collections in database:');
  for (const c of cols) {
    const count = await db.collection(c.name).estimatedDocumentCount();
    console.log(` - ${c.name}: ${count}`);
  }

  await client.close();
  console.log('Import complete.');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
