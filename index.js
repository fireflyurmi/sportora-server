const dns = require("node:dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const express = require('express')
const dotenv = require('dotenv');
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');
dotenv.config();
const uri = process.env.MONGODB_URI;
const app = express()
const PORT = process.env.PORT;
app.use(cors());
app.use(express.json());

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

    const db = client.db("sportora");
    const facilitycollection = db.collection("facilities");
    const bookingCollection = db.collection("bookings");

    app.post('/facility', async (req, res)=>{
        const facilityData = req.body
        console.log(facilityData);
        const result = await facilitycollection.insertOne(facilityData);

        res.json(result);
    });

    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('Hello Server World!! Server is running fine.')
})

app.listen(PORT, () => {
  console.log(`Server Running On Port ${PORT}`)
})