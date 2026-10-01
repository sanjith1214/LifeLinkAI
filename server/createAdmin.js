require("dotenv").config();

const dns = require("dns");
dns.setDefaultResultOrder("ipv4first");
dns.setServers(["1.1.1.1", "8.8.8.8"]);

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./models/User");

const createAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      family: 4,
      serverSelectionTimeoutMS: 15000,
    });

    console.log("MongoDB connected");

    const email = "admin@lifelink.ai";
    const password = "Admin@123456";

    const existing = await User.findOne({ email });

    if (existing) {
      existing.role = "admin";
      existing.roleStatus = "approved";
      existing.isDemo = false;
      existing.emailVerified = true;

      await existing.save();

      console.log("Existing user converted to admin.");
    } else {
      const hashedPassword = await bcrypt.hash(
        password,
        10
      );

      await User.create({
        name: "LifeLink Admin",
        email,
        password: hashedPassword,
        role: "admin",
        roleStatus: "approved",
        emailVerified: true,
        isDemo: false,
      });

      console.log("Admin created successfully.");
    }

    console.log("Email:", email);
    console.log("Password:", password);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("Failed:", error.message);
    process.exit(1);
  }
};

createAdmin();