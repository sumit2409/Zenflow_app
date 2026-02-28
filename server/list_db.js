const mongoose = require('mongoose')

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/zenflow'

async function main(){
  try{
    await mongoose.connect(MONGODB_URI, {useNewUrlParser:true, useUnifiedTopology:true})
    const db = mongoose.connection.db
    const cols = await db.listCollections().toArray()
    if (!cols.length) {
      console.log('No collections found in', MONGODB_URI)
      await mongoose.disconnect()
      return
    }
    console.log('Collections:', cols.map(c=>c.name).join(', '))
    for (const c of cols) {
      const col = db.collection(c.name)
      const count = await col.countDocuments()
      const sample = await col.find({}).limit(5).toArray()
      console.log(`\n=== ${c.name} (count: ${count}) ===`)
      console.log(JSON.stringify(sample, null, 2))
    }
    await mongoose.disconnect()
  }catch(err){
    console.error('Error listing DB:', err.message)
    process.exitCode = 1
  }
}

main()
