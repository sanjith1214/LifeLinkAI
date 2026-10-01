require("dotenv").config();

const dns = require("dns");

dns.setDefaultResultOrder("ipv4first");
dns.setServers(["1.1.1.1", "8.8.8.8"]);

const http = require("http");

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const mongoose = require("mongoose");
const { Server } = require("socket.io");

const authRoutes = require("./routes/authRoutes");
const profileRoutes = require("./routes/profileRoutes");
const hospitalRoutes = require("./routes/hospitalRoutes");
const sosRoutes = require("./routes/sosRoutes");
const adminRoutes = require("./routes/adminRoutes");
const healthRecordRoutes = require("./routes/healthRecordRoutes");
const hospitalPatientRoutes = require("./routes/hospitalPatientRoutes");
const policeRoutes = require("./routes/policeRoutes");
const firestationRoutes = require("./routes/firestationRoutes");
const pharmacyRoutes = require("./routes/pharmacyRoutes");
const assistantRoutes = require("./routes/assistantRoutes");
const donorRoutes = require("./routes/donorRoutes");
const pharmacyDirectoryRoutes = require("./routes/pharmacyDirectoryRoutes");
const orgProfileRoutes = require("./routes/orgProfileRoutes");
const announcementRoutes = require("./routes/announcementRoutes");
const bloodRequestRoutes = require("./routes/bloodRequestRoutes");

const setupBloodChat = require("./sockets/bloodChat");
const setupSOSChat = require("./sockets/sosChat");
const setupSOSSocket = require("./sockets/sosSocket");

const app = express();

app.set("trust proxy", 1);

app.use(helmet());

const allowedOrigins = (process.env.CLIENT_URL || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins.length ? allowedOrigins : true,
    credentials: true,
  })
);

app.use(express.json());

app.use(
  "/api",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Too many attempts. Please try again later.",
  },
});

app.get("/", (req, res) => {
  res.send("LifeLink AI backend is running!");
});

app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);
app.use("/api/auth/forgot-password", authLimiter);
app.use("/api/auth/verify-2fa", authLimiter);
app.use("/api/auth/resend-verification", authLimiter);

app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/hospitals", hospitalRoutes);
app.use("/api/sos", sosRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/health-records", healthRecordRoutes);
app.use("/api/hospital/patients", hospitalPatientRoutes);
app.use("/api/police", policeRoutes);
app.use("/api/firestation", firestationRoutes);
app.use("/api/pharmacy", pharmacyRoutes);
app.use("/api/assistant", assistantRoutes);
app.use("/api/donors", donorRoutes);
app.use("/api/pharmacies", pharmacyDirectoryRoutes);
app.use("/api/org-profile", orgProfileRoutes);
app.use("/api/announcements", announcementRoutes);
app.use("/api/blood-requests", bloodRequestRoutes);

const connectMongoDB = () => {
  return mongoose.connect(process.env.MONGO_URI, {
    family: 4,
    serverSelectionTimeoutMS: 15000,
  });
};

connectMongoDB()
  .then(() => {
    console.log("MongoDB connected successfully");
  })
  .catch((err) => {
    console.error(
      "MongoDB connection failed:",
      err.message
    );

    console.log(
      "Retrying MongoDB connection in 5 seconds..."
    );

    setTimeout(() => {
      connectMongoDB()
        .then(() => {
          console.log("MongoDB connected successfully");
        })
        .catch((retryErr) => {
          console.error(
            "MongoDB retry failed:",
            retryErr.message
          );
        });
    }, 5000);
  });

const PORT = process.env.PORT || 5000;

const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins.length
      ? allowedOrigins
      : true,
    credentials: true,
  },
});

setupBloodChat(io);
setupSOSChat(io);
setupSOSSocket(io);

httpServer.listen(PORT, () => {
  console.log(
    `Server is running on http://localhost:${PORT}`
  );
});