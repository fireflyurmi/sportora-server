# SportOra Server 🏐

The robust, secure, and high-performance REST API backend architecture powering the **SportOra** sports facility booking platform. This server handles real-time data persistence, secure JWT token handshakes, user metric updates, and sports venue reservation pipelines.

## 🔗 Live Deployment URL
The live API service is deployed on Vercel Serverless Infrastructures and can be accessed at:
👉 **[https://sportora-server.vercel.app](https://sportora-server.vercel.app)**

---

## 🎯 Purpose
The main purpose of **SportOra Server** is to act as a centralized data abstraction layer and security gateway for sports facility managers and athletes. It decouples complex database operations from the frontend user interface, providing a highly maintainable, scalable, and isolated ecosystem to manage venue availability, reservation transactions, and access authorization securely.

---

## ✨ Features

- **Robust RESTful API Routing:** Complete CRUD (Create, Read, Update, Delete) capability mappings across structural database documents (`/facility`, `/bookings`, `/user`).
- **Secure JWT Session Validation:** Complete integration with Next-js client auth contexts using remote JSON Web Key Sets (`JWKS`) and cryptographic verification protocols to prevent spoofing.
- **Atomic Operations & Metrics Increments:** Leverages MongoDB `$inc` logic routines to automatically update real-time user booking frequencies when reservation metrics change.
- **Dynamic Context Fallback Guards:** Intelligent token parsing layers featuring fallback matching context blocks to guarantee reliable query validation transitions between local coding and server environments.
- **Production-Grade CORS Security:** Explicit domain binding configurations restricting access to authorized origins (`localhost:3000` and the production live site).
- **DNS Resolver Overrides:** Built-in secondary Cloudflare/Google public lookup fail-safes ensuring zero network drops during high-frequency server database connections.

---

## 📦 NPM Packages Used

The server relies on a minimal, highly optimized footprint of packages to ensure fast cold-start times on cloud serverless runtimes:

| Package | Purpose |
| :--- | :--- |
| `express` | Core minimalist web framework utilized to instantiate the server application router layer. |
| `mongodb` | Official MongoDB Node.js driver handling low-latency connections to MongoDB Atlas clusters. |
| `cors` | Middleware package implementing Cross-Origin Resource Sharing rules to secure incoming request channels. |
| `jose-cjs` | High-performance, lightweight JSON Web Token (`JWT`) decoding and verification framework. |
| `dotenv` | Zero-dependency module that loads environment variable strings from files securely into process spaces. |

---

## 🛠️ Local Installation & Development

To clone, execute, and inspect this server environment locally on your computer:

1. **Clone the repository:**
   ```bash
   git clone [https://github.com/fireflyurmi/sportora-server.git](https://github.com/fireflyurmi/sportora-server.git)
   cd sportora-server
