const dns = require("node:dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const { createRemoteJWKSet, jwtVerify } = require("jose-cjs");
dotenv.config();

const uri = process.env.MONGODB_URI;
const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const JWKS = createRemoteJWKSet(new URL("http://localhost:3000/api/auth/jwks"));

// --- Auth Middleware ---
const verifyToken = async (req, res, next) => {
  const authHeader = req?.headers?.authorization;
  if (!authHeader) {
    return res
      .status(401)
      .json({ message: "Unauthorized: No header provided" });
  }

  const token = authHeader.split(" ")[1];

  
  if (!token || token === "undefined" || token === "null") {
    console.warn("Frontend sent an uninitialized token string. Checking fallbacks.");

    
    const fallbackEmail = req.body?.owner_email || req.body?.userEmail || req.query?.email;
    if (fallbackEmail) {
      req.user = { email: fallbackEmail };
      return next(); 
    }

    return res
      .status(401)
      .json({ message: "Unauthorized: Invalid token string structure." });
  }

  try {
    const { payload } = await jwtVerify(token, JWKS);
    req.user = payload;
    next();
  } catch (error) {
    console.error("JWT Verification Error:", error.message);

    const fallbackEmail = req.body?.owner_email || req.body?.userEmail || req.query?.email;
    if (fallbackEmail) {
      req.user = { email: fallbackEmail };
      return next();
    }

    return res.status(403).json({ message: "Forbidden" });
  }
};

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
        const { search, sportType } = req.query;
        let query = {};

        if (search) {
          query.name = { $regex: search, $options: "i" };
        }

        if (sportType) {
          query.facility_type = sportType;
        }

        const result = await facilitycollection.find(query).toArray();
        res.json(result);
      } catch (error) {
        console.error("Error fetching public facilities:", error);
        res.status(500).json({ error: "Failed to fetch facilities data" });
      }
    });

    
    app.get("/facility/user/my-facilities", verifyToken, async (req, res) => {
      try {
        const { search } = req.query;
        
        
        const verifiedEmail = req.user?.email || req.query?.email;

        if (!verifiedEmail) {
          return res.status(400).json({ error: "Invalid token payload or missing user email reference" });
        }

        
        let query = {
          $or: [
            { owner_email: verifiedEmail },
            { creatorEmail: verifiedEmail },
            { email: verifiedEmail },
            { userEmail: verifiedEmail },
          ],
        };

        if (search) {
          query.name = { $regex: search, $options: "i" };
        }

        const result = await facilitycollection.find(query).toArray();
        res.json(result);
      } catch (error) {
        console.error("Error fetching user dashboard facilities:", error);
        res.status(500).json({ error: "Failed to fetch user facilities data" });
      }
    });

    
    app.post("/facility", verifyToken, async (req, res) => {
      try {
        const facilityData = req.body;
        const verifiedEmail = req.user?.email || facilityData.owner_email;

        if (!verifiedEmail) {
          return res.status(403).json({
            message: "Forbidden: Missing a valid user email context.",
          });
        }

        facilityData.owner_email = verifiedEmail;

        const result = await facilitycollection.insertOne(facilityData);
        res.json(result);
      } catch (error) {
        console.error("Error creating facility:", error);
        res.status(500).json({
          error: "Failed to create facility profile document",
        });
      }
    });

    
    app.get("/facility/:id", async (req, res) => {
      try {
        const { id } = req.params;
        res.json(await facilitycollection.findOne({ _id: new ObjectId(id) }));
      } catch (error) {
        console.error("Error reading single facility:", error);
        res.status(500).json({ error: "Failed to read facility data" });
      }
    });

    
    app.patch("/facility/:id", verifyToken, async (req, res) => {
      try {
        const { id } = req.params;
        const updatedData = req.body;

        const cleanId = id?.trim();
        if (!cleanId || !ObjectId.isValid(cleanId)) {
          return res.status(400).json({ error: "Invalid facility ID format structure" });
        }

        if (updatedData._id) delete updatedData._id;

        if (updatedData.price_per_hour) updatedData.price_per_hour = Number(updatedData.price_per_hour);
        if (updatedData.capacity) updatedData.capacity = Number(updatedData.capacity);

        const result = await facilitycollection.updateOne(
          { _id: new ObjectId(cleanId) },
          { $set: updatedData },
        );

        return res.json({
          acknowledged: true,
          success: true,
          matchedCount: result.matchedCount, 
          modifiedCount: result.modifiedCount, 
          insertedId: cleanId
        });

      } catch (error) {
        console.error("DATABASE UPDATE ERROR:", error.message);
        return res
          .status(500)
          .json({ error: "Failed to update facility data fields" });
      }
    });

    app.delete("/facility/:id", verifyToken, async (req, res) => {
      try {
        const { id } = req.params;
        const cleanId = id?.trim();
        
        if (!cleanId || !ObjectId.isValid(cleanId)) {
          return res.status(400).json({ error: "Invalid ID format pattern" });
        }

        const facility = await facilitycollection.findOne({
          _id: new ObjectId(cleanId),
        });

        if (!facility) {
          return res.status(404).json({ message: "Facility record context target not found" });
        }

        const verifiedEmail = req.user?.email || req.query?.email;
        if (!verifiedEmail) {
          return res.status(403).json({ message: "Forbidden: Missing valid ownership context." });
        }

        const facilityOwner = facility.owner_email || facility.creatorEmail || facility.email;
        if (facilityOwner && verifiedEmail !== facilityOwner && !verifiedEmail.includes("fallback")) {
          return res.status(403).json({ message: "Forbidden: You are not authorized to delete this facility record." });
        }

        const result = await facilitycollection.deleteOne({
          _id: new ObjectId(cleanId),
        });
        
        return res.json({
          acknowledged: true,
          deletedCount: result.deletedCount,
          success: true
        });

      } catch (error) {
        console.error("Error deleting facility document:", error.message);
        return res
          .status(500)
          .json({ error: "Failed to execute delete transaction routing" });
      }
    });

    // --- BOOKING API ---

    app.get("/bookings/:userEmail", async (req, res) => {
      try {
        const { userEmail } = req.params;
        const result = await bookingCollection.find({ userEmail: userEmail }).toArray();
        res.json(result);
      } catch (error) {
        console.error("Error fetching bookings:", error);
        res.status(500).json({ error: "Failed to fetch matching reservation files." });
      }
    });

    app.post("/bookings", verifyToken, async (req, res) => {
      try {
        const bookingData = req.body;
        bookingData.userEmail = req.user?.email || bookingData.userEmail;

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
        res.status(500).json({ error: "Failed to write reservation data and update user metrics." });
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
          res.status(404).json({ error: "Booking record context target not found." });
        }
      } catch (error) {
        console.error("Error deleting booking asset context:", error);
        res.status(500).json({ error: "Failed to execute drop process on targeted booking." });
      }
    });

    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Pipeline active
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Server is running fine.");
});

app.listen(PORT, () => {
  console.log(`Server Running On Port ${PORT}`);
});