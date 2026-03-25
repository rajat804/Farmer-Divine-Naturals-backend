import express from "express";
import cors from "cors";
// import dotenv from "dotenv";
import session from "express-session"
import dotenv from "dotenv/config";
import connectDB from "./config/mongodb.js";
import adminRoutes from "./routes/adminRoutes.js";
// Routes
import { promises as dns } from "dns";
dns.setServers(["8.8.8.8", "1.1.1.1"]);


const app = express();
const PORT = process.env.PORT || 4000;

/* ==============================
   DATABASE
============================== */
connectDB();

/* ==============================
   CORS CONFIG
============================== */
const allowedOrigins = [
  "http://localhost:5173",
  "https://farmer-divine-naturals.vercel.app"
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("CORS not allowed"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
};

// ✅ THIS handles preflight automatically (NO crash)
app.use(cors(corsOptions));

/* ==============================
   MIDDLEWARE
============================== */
app.use(express.json());


/* ==============================
   ROUTES
============================== */
app.use(
  session({
    secret: "adminsecretkey",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false
    }
  })
);
app.use("/api/admin", adminRoutes)


/* ==============================
   TEST ROUTE
============================== */
app.get("/", (req, res) => {
  res.send("✅ API Working");
});

/* ==============================
   START SERVER
============================== */
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
