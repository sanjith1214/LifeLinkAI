const mongoose = require("mongoose");

const bloodRequestSchema = new mongoose.Schema(
  {
    requester: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    bloodGroup: {
      type: String,
      enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
      required: true,
    },

    unitsRequired: {
      type: Number,
      required: true,
      min: 1,
      max: 20,
    },

    urgency: {
      type: String,
      enum: ["normal", "urgent", "critical"],
      default: "urgent",
    },

    hospitalName: {
      type: String,
      required: true,
      trim: true,
    },

    hospitalPhone: {
      type: String,
      trim: true,
    },

    message: {
      type: String,
      trim: true,
      maxlength: 500,
    },

    location: {
      type: {
        type: String,
        enum: ["Point"],
      },
      coordinates: {
        type: [Number],
      },
    },

    status: {
      type: String,
      enum: ["searching", "matched", "fulfilled", "cancelled"],
      default: "searching",
    },

    responses: [
      {
        donor: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },

        status: {
          type: String,
          enum: ["pending", "accepted", "declined"],
          default: "pending",
        },

        respondedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

bloodRequestSchema.index({
  location: "2dsphere",
});

module.exports = mongoose.model("BloodRequest", bloodRequestSchema);