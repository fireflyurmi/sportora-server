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
    const bookingCollection = db.collection("bookings");
    const userCollection = db.collection("user");

    // --- FACILITY API ---
    app.get("/facility", async (req, res) => {
      try {
        const { search, owner_email } = req.query;
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

    app.delete("/facility/:id", async (req, res) => {
      try {
        const { id } = req.params;
        const result = await facilitycollection.deleteOne({
          _id: new ObjectId(id),
        });
        res.json(result);
      } catch (error) {
        console.error("Error deleting facility document:", error);
        res
          .status(500)
          .json({ error: "Failed to execute delete transaction routing" });
      }
    });

    // --- BOOKING API WITH USER METRICS ---
    app.get("/bookings/:userEmail", async (req, res) => {
      try {
        const { userEmail } = req.params;
        const result = await bookingCollection
          .find({ userEmail: userEmail })
          .toArray();
        res.json(result);
      } catch (error) {
        console.error("Error fetching bookings:", error);
        res
          .status(500)
          .json({ error: "Failed to fetch matching reservation files." });
      }
    });

    app.post("/bookings", async (req, res) => {
      try {
        const bookingData = req.body;
        const bookingResult = await bookingCollection.insertOne(bookingData);

        if (bookingData.userEmail) {
          await userCollection.updateOne(
            { email: bookingData.userEmail },
            { $inc: { booking_count: 1 } },
            { upsert: true },
          );
        }

        res.json(bookingResult);
      } catch (error) {
        console.error("Error creating booking and updating counter:", error);
        res
          .status(500)
          .json({
            error: "Failed to write reservation data and update user metrics.",
          });
      }
    });

    app.delete("/bookings/:bookingId", async (req, res) => {
      try {
        const { bookingId } = req.params;
        const booking = await bookingCollection.findOne({
          _id: new ObjectId(bookingId),
        });

        if (booking) {
          const deleteResult = await bookingCollection.deleteOne({
            _id: new ObjectId(bookingId),
          });

          if (booking.userEmail) {
            await userCollection.updateOne(
              { email: booking.userEmail },
              { $inc: { booking_count: -1 } },
            );
          }

          res.json(deleteResult);
        } else {
          res
            .status(404)
            .json({ error: "Booking record context target not found." });
        }
      } catch (error) {
        console.error("Error deleting booking asset context:", error);
        res
          .status(500)
          .json({
            error: "Failed to execute drop process on targeted booking.",
          });
      }
    });

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
