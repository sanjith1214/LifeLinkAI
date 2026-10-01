const BloodRequest = require("../models/BloodRequest");
const User = require("../models/User");

const MAX_DISTANCE_METERS = 10 * 1000;

const bloodCompatibility = {
  "A+": ["A+", "A-", "O+", "O-"],
  "A-": ["A-", "O-"],
  "B+": ["B+", "B-", "O+", "O-"],
  "B-": ["B-", "O-"],
  "AB+": ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
  "AB-": ["A-", "B-", "AB-", "O-"],
  "O+": ["O+", "O-"],
  "O-": ["O-"],
};

const createBloodRequest = async (req, res) => {
  try {
    const {
      bloodGroup,
      unitsRequired,
      urgency,
      hospitalName,
      hospitalPhone,
      message,
      latitude,
      longitude,
    } = req.body;

    if (!bloodGroup || !unitsRequired || !hospitalName) {
      return res.status(400).json({
        message:
          "Blood group, units required and hospital name are required",
      });
    }

    const lat = Number(latitude);
    const lng = Number(longitude);

    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180
    ) {
      return res.status(400).json({
        message: "Valid location is required",
      });
    }

    const request = await BloodRequest.create({
      requester: req.userId,
      bloodGroup,
      unitsRequired: Number(unitsRequired),
      urgency: urgency || "urgent",
      hospitalName,
      hospitalPhone,
      message,
      location: {
        type: "Point",
        coordinates: [lng, lat],
      },
    });

    const populatedRequest = await BloodRequest.findById(
      request._id
    )
      .populate("requester", "name phone bloodGroup")
      .lean();

    res.status(201).json({
      message: "Blood request created successfully",
      request: populatedRequest,
    });
  } catch (err) {
    console.error("Create blood request error:", err);

    res.status(500).json({
      message: "Something went wrong",
      error: err.message,
    });
  }
};

const listNearbyBloodRequests = async (req, res) => {
  try {
    const { latitude, longitude } = req.query;

    const lat = Number(latitude);
    const lng = Number(longitude);

    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180
    ) {
      return res.status(400).json({
        message: "Valid location is required",
      });
    }

    const user = await User.findById(req.userId)
      .select("bloodGroup")
      .lean();

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    if (!user.bloodGroup) {
      return res.status(400).json({
        message: "Set your blood group first",
      });
    }

    const compatibleGroups =
      bloodCompatibility[user.bloodGroup] || [
        user.bloodGroup,
      ];

    const requests = await BloodRequest.aggregate([
      {
        $geoNear: {
          near: {
            type: "Point",
            coordinates: [lng, lat],
          },
          key: "location",
          distanceField: "distanceMeters",
          maxDistance: MAX_DISTANCE_METERS,
          spherical: true,
          query: {
            bloodGroup: {
              $in: compatibleGroups,
            },
            status: "searching",
            requester: {
              $ne: req.userId,
            },
          },
        },
      },
      {
        $sort: {
          urgency: -1,
          distanceMeters: 1,
        },
      },
      {
        $limit: 50,
      },
      {
        $lookup: {
          from: "users",
          localField: "requester",
          foreignField: "_id",
          as: "requester",
        },
      },
      {
        $unwind: {
          path: "$requester",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          _id: 1,
          bloodGroup: 1,
          unitsRequired: 1,
          urgency: 1,
          hospitalName: 1,
          hospitalPhone: 1,
          message: 1,
          status: 1,
          createdAt: 1,
          distanceKm: {
            $round: [
              {
                $divide: ["$distanceMeters", 1000],
              },
              1,
            ],
          },
          requester: {
            _id: "$requester._id",
            name: "$requester.name",
            phone: "$requester.phone",
          },
        },
      },
    ]);

    res.json({
      requests,
      radiusKm: 10,
      compatibleGroups,
    });
  } catch (err) {
    console.error("Nearby blood requests error:", err);

    res.status(500).json({
      message: "Something went wrong",
      error: err.message,
    });
  }
};

const listMyBloodRequests = async (req, res) => {
  try {
    const requests = await BloodRequest.find({
      requester: req.userId,
    })
      .populate("requester", "name phone bloodGroup")
      .populate(
        "responses.donor",
        "name phone bloodGroup"
      )
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      requests,
    });
  } catch (err) {
    console.error("My blood requests error:", err);

    res.status(500).json({
      message: "Something went wrong",
      error: err.message,
    });
  }
};

/* NEW: Requests where I responded as a donor */
const listMyDonations = async (req, res) => {
  try {
    const requests = await BloodRequest.find({
      "responses.donor": req.userId,
    })
      .populate("requester", "name phone")
      .populate(
        "responses.donor",
        "name phone bloodGroup"
      )
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      requests,
    });
  } catch (err) {
    console.error("List my donations error:", err);

    res.status(500).json({
      message: "Unable to load your blood donations",
    });
  }
};

const respondToBloodRequest = async (req, res) => {
  try {
    const { id } = req.params;

    const request = await BloodRequest.findById(id);

    if (!request) {
      return res.status(404).json({
        message: "Blood request not found",
      });
    }

    if (request.status !== "searching") {
      return res.status(400).json({
        message:
          "This blood request is no longer accepting responses",
      });
    }

    if (
      String(request.requester) ===
      String(req.userId)
    ) {
      return res.status(400).json({
        message:
          "You cannot respond to your own blood request",
      });
    }

    const existingResponse =
      request.responses.find(
        (response) =>
          String(response.donor) ===
          String(req.userId)
      );

    if (existingResponse) {
      return res.status(400).json({
        message:
          "You have already responded to this request",
      });
    }

    request.responses.push({
      donor: req.userId,
      status: "pending",
    });

    await request.save();

    res.json({
      message:
        "Your response has been sent to the requester",
    });
  } catch (err) {
    console.error(
      "Respond to blood request error:",
      err
    );

    res.status(500).json({
      message: "Something went wrong",
      error: err.message,
    });
  }
};

const updateResponse = async (req, res) => {
  try {
    const { id, donorId } = req.params;
    const { status } = req.body;

    if (
      !["accepted", "declined"].includes(status)
    ) {
      return res.status(400).json({
        message: "Invalid response status",
      });
    }

    const request = await BloodRequest.findById(id);

    if (!request) {
      return res.status(404).json({
        message: "Blood request not found",
      });
    }

    if (
      String(request.requester) !==
      String(req.userId)
    ) {
      return res.status(403).json({
        message:
          "Only the requester can update donor responses",
      });
    }

    const response = request.responses.find(
      (item) =>
        String(item.donor) ===
        String(donorId)
    );

    if (!response) {
      return res.status(404).json({
        message: "Donor response not found",
      });
    }

    response.status = status;

    if (status === "accepted") {
      request.status = "matched";
    }

    await request.save();

    res.json({
      message:
        status === "accepted"
          ? "Donor accepted successfully"
          : "Donor response declined",
      request,
    });
  } catch (err) {
    console.error(
      "Update donor response error:",
      err
    );

    res.status(500).json({
      message: "Something went wrong",
      error: err.message,
    });
  }
};

const cancelBloodRequest = async (req, res) => {
  try {
    const { id } = req.params;

    const request = await BloodRequest.findById(id);

    if (!request) {
      return res.status(404).json({
        message: "Blood request not found",
      });
    }

    if (
      String(request.requester) !==
      String(req.userId)
    ) {
      return res.status(403).json({
        message:
          "Only the requester can cancel this request",
      });
    }

    if (request.status === "fulfilled") {
      return res.status(400).json({
        message:
          "A fulfilled request cannot be cancelled",
      });
    }

    request.status = "cancelled";

    await request.save();

    res.json({
      message:
        "Blood request cancelled successfully",
    });
  } catch (err) {
    console.error(
      "Cancel blood request error:",
      err
    );

    res.status(500).json({
      message: "Something went wrong",
      error: err.message,
    });
  }
};

const fulfillBloodRequest = async (req, res) => {
  try {
    const { id } = req.params;

    const request = await BloodRequest.findById(id);

    if (!request) {
      return res.status(404).json({
        message: "Blood request not found",
      });
    }

    if (
      String(request.requester) !==
      String(req.userId)
    ) {
      return res.status(403).json({
        message:
          "Only the requester can mark this request as fulfilled",
      });
    }

    if (request.status === "cancelled") {
      return res.status(400).json({
        message:
          "A cancelled request cannot be fulfilled",
      });
    }

    request.status = "fulfilled";

    await request.save();

    res.json({
      message:
        "Blood request marked as fulfilled",
    });
  } catch (err) {
    console.error(
      "Fulfill blood request error:",
      err
    );

    res.status(500).json({
      message: "Something went wrong",
      error: err.message,
    });
  }
};

module.exports = {
  createBloodRequest,
  listNearbyBloodRequests,
  listMyBloodRequests,
  listMyDonations,
  respondToBloodRequest,
  updateResponse,
  cancelBloodRequest,
  fulfillBloodRequest,
};