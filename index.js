const dns = require("node:dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
dotenv.config();

const uri = process.env.MONGODB_URI;
const app = express();
const PORT = process.env.PORT;

app.use(cors());
app.use(express.json());

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();

    const db = client.db("sportora");
    const facilitycollection = db.collection("facilities");

    
    app.get("/facility", async (req, res) => {
      try {
        const { search, sportType, owner_email } = req.query;
        let query = {};

        if (owner_email) {
          query.$or = [
            { owner_email: owner_email },
            { creatorEmail: owner_email },
            { email: owner_email },
            { userEmail: owner_email },
          ];
        }

        if (search) {
          query.name = { $regex: search, $options: "i" };
        }

        const result = await facilitycollection.find(query).toArray();
        res.json(result);
      } catch (error) {
        console.error("Error fetching filtered facilities:", error);
        res.status(500).json({ error: "Failed to fetch facilities data" });
      }
    });

    
    app.post("/facility", async (req, res) => {
      try {
        const facilityData = req.body;
        const result = await facilitycollection.insertOne(facilityData);
        res.json(result);
      } catch (error) {
        console.error("Error creating facility:", error);
        res
          .status(500)
          .json({ error: "Failed to create facility profile document" });
      }
    });

    
    app.get("/facility/:id", async (req, res) => {
      try {
        const { id } = req.params;
        const result = await facilitycollection.findOne({
          _id: new ObjectId(id),
        });
        res.json(result);
      } catch (error) {
        console.error("Error reading single facility:", error);
        res.status(500).json({ error: "Failed to read facility data" });
      }
    });

    
    app.patch("/facility/:id", async (req, res) => {
      try {
        const { id } = req.params;
        const updatedData = req.body;
        const result = await facilitycollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: updatedData },
        );
        res.json(result);
      } catch (error) {
        console.error("Error updating facility profile data:", error);
        res
          .status(500)
          .json({ error: "Failed to update facility data fields" });
      }
    });

    
    


    // Ping diagnostic check deployment layer validation
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!",
    );
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Server is running fine.");
});

app.listen(PORT, () => {
  console.log(`Server Running On Port ${PORT}`);
});
