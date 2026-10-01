const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
    },

    role: {
      type: String,
      enum: [
        "civilian",
        "hospital",
        "police",
        "firestation",
        "pharmacy",
        "admin",
      ],
      default: "civilian",
    },

    roleStatus: {
      type: String,
      enum: ["approved", "pending", "rejected"],
      default: "approved",
    },

    orgName: {
      type: String,
      trim: true,
    },

    bloodGroup: {
      type: String,
      enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
    },

    donorAvailable: {
      type: Boolean,
      default: false,
    },

    // Only store this when the user has actually shared their location.
    location: {
      type: {
        type: String,
        enum: ["Point"],
      },
      coordinates: {
        type: [Number],
      },
    },

    phone: {
      type: String,
      trim: true,
    },

    age: {
      type: Number,
    },

    medicalHistory: {
      type: [String],
      default: [],
    },

    allergies: {
      type: [String],
      default: [],
    },

    emergencyContacts: {
      type: [
        {
          name: String,
          phone: String,
          relationship: String,
        },
      ],
      default: [],
    },

    fleet: {
      type: [
        {
          vehicleNumber: String,
          vehicleType: String,
          status: String,
        },
      ],
      default: [],
    },

    stock: {
      type: [
        {
          bloodGroup: String,
          units: Number,
        },
      ],
      default: [],
    },

    openHours: {
      type: String,
    },

    isOpen: {
      type: Boolean,
      default: true,
    },

    logoUrl: {
      type: String,
    },

    serviceRadiusKm: {
      type: Number,
    },

    parentOrgId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    verificationDoc: {
      filename: String,
      contentType: String,
      size: Number,
      data: Buffer,
    },

    resetPasswordToken: {
      type: String,
    },

    resetPasswordExpires: {
      type: Date,
    },

    emailVerified: {
      type: Boolean,
      default: false,
    },

    emailVerificationToken: {
      type: String,
    },

    emailVerificationExpires: {
      type: Date,
    },

    suspended: {
      type: Boolean,
      default: false,
    },

    isDemo: {
      type: Boolean,
      default: false,
    },

    tokenVersion: {
      type: Number,
      default: 0,
    },

    twoFactorEnabled: {
      type: Boolean,
      default: false,
    },

    twoFactorCode: {
      type: String,
    },

    twoFactorCodeExpires: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Used for nearby donor searches.
userSchema.index({ location: "2dsphere" });

module.exports = mongoose.model("User", userSchema);