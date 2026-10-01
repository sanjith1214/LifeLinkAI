const mongoose = require("mongoose");

const geoPointSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["Point"],
      required: true,
    },

    coordinates: {
      type: [Number],
      required: true,
      validate: {
        validator: function (value) {
          return (
            Array.isArray(value) &&
            value.length === 2 &&
            value.every((number) =>
              Number.isFinite(number)
            )
          );
        },
        message:
          "GeoJSON coordinates must contain exactly [longitude, latitude]",
      },
    },
  },
  {
    _id: false,
  }
);

const responseSchema = new mongoose.Schema(
  {
    service: {
      type: String,
      enum: [
        "hospital",
        "police",
        "firestation",
      ],
      required: true,
    },

    status: {
      type: String,
      enum: [
        "pending",
        "accepted",
        "declined",
        "resolved",
      ],
      default: "pending",
    },

    responder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    responderName: {
      type: String,
    },

    responderOrganisation: {
      type: String,
    },

    responderPhone: {
      type: String,
    },

    acceptedAt: {
      type: Date,
    },

    resolvedAt: {
      type: Date,
    },

    etaMinutes: {
      type: Number,
    },

    estimatedArrivalAt: {
      type: Date,
    },

    responderLocation: {
      type: geoPointSchema,
      default: undefined,
    },

    responderLocationUpdatedAt: {
      type: Date,
    },
  },
  {
    _id: false,
  }
);

const emergencyRequestSchema =
  new mongoose.Schema(
    {
      citizenId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },

      type: {
        type: String,
        enum: [
          "medical",
          "accident",
          "fire",
          "crime",
          "other",
        ],
        default: "medical",
      },

      emergencyNote: {
        type: String,
        trim: true,
        maxlength: 500,
        default: "",
      },

      location: {
        type: geoPointSchema,
        required: true,
      },

      status: {
        type: String,
        enum: [
          "pending",
          "accepted",
          "resolved",
          "cancelled",
        ],
        default: "pending",
      },

      assignedHospitalId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Hospital",
        default: null,
      },

      targets: {
        type: [String],
        enum: [
          "hospital",
          "police",
          "firestation",
        ],
        default: ["hospital"],
      },

      responses: {
        type: [responseSchema],
        default: [],
      },

      respondedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },

      respondedByRole: {
        type: String,
        enum: [
          "hospital",
          "police",
          "firestation",
        ],
        default: undefined,
      },

      responderName: {
        type: String,
        default: undefined,
      },

      responderOrganisation: {
        type: String,
        default: undefined,
      },

      responderPhone: {
        type: String,
        default: undefined,
      },

      acceptedAt: {
        type: Date,
        default: undefined,
      },

      etaMinutes: {
        type: Number,
        default: undefined,
      },

      estimatedArrivalAt: {
        type: Date,
        default: undefined,
      },

      responderLocation: {
        type: geoPointSchema,
        default: undefined,
      },

      responderLocationUpdatedAt: {
        type: Date,
        default: undefined,
      },

      cancelledAt: {
        type: Date,
        default: undefined,
      },

      resolvedAt: {
        type: Date,
        default: undefined,
      },

      medicalIdShared: {
        type: Boolean,
        default: false,
      },

      medicalSnapshot: {
        bloodGroup: {
          type: String,
        },

        allergies: {
          type: [String],
          default: [],
        },

        medicalHistory: {
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
      },

      emergencyContactsNotified: {
        type: Boolean,
        default: false,
      },
    },
    {
      timestamps: true,
    }
  );

emergencyRequestSchema.index({
  location: "2dsphere",
});

emergencyRequestSchema.index({
  "responses.responderLocation": "2dsphere",
});

module.exports =
  mongoose.model(
    "EmergencyRequest",
    emergencyRequestSchema
  );