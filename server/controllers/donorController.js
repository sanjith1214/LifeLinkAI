const User = require("../models/User");
const { CIVILIAN_ROLES } = require("../constants/roles");

const MAX_DISTANCE_METERS = 10 * 1000;

// Donors are civilians who opted in
const civilianFilter = {
  $or: [
    { role: { $in: CIVILIAN_ROLES } },
    { role: { $exists: false } },
  ],
};

const listDonors = async (req, res) => {
  try {
    const { bloodGroup, latitude, longitude } = req.query;

    const filter = {
      ...civilianFilter,
      donorAvailable: true,
      _id: { $ne: req.userId },
    };

    if (bloodGroup) {
      filter.bloodGroup = bloodGroup;
    }

    // Find donors within 10 km
    if (latitude !== undefined && longitude !== undefined) {
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
          message: "Invalid location coordinates",
        });
      }

      const donors = await User.aggregate([
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
            query: filter,
          },
        },
        {
          $project: {
            _id: 1,
            name: 1,
            phone: 1,
            bloodGroup: 1,
            distanceKm: {
              $round: [
                {
                  $divide: ["$distanceMeters", 1000],
                },
                1,
              ],
            },
          },
        },
      ]);

      return res.json({
        donors,
        radiusKm: 10,
      });
    }

    // Return all available donors if location is unavailable
    const donors = await User.find(filter)
      .select("name phone bloodGroup")
      .lean();

    res.json({
      donors,
      radiusKm: 10,
    });
  } catch (err) {
    console.error("List donors error:", err);

    res.status(500).json({
      message: "Something went wrong",
      error: err.message,
    });
  }
};

const setDonorStatus = async (req, res) => {
  try {
    const {
      donorAvailable,
      bloodGroup,
      latitude,
      longitude,
    } = req.body;

    const update = {};

    if (donorAvailable !== undefined) {
      update.donorAvailable = Boolean(donorAvailable);
    }

    if (bloodGroup !== undefined) {
      update.bloodGroup = bloodGroup;
    }

    if (update.donorAvailable) {
      const finalBloodGroup =
        update.bloodGroup || req.user.bloodGroup;

      if (!finalBloodGroup) {
        return res.status(400).json({
          message: "Set your blood group first so donors can find you",
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
          message: "Your current location is required to become an available donor",
        });
      }

      update.location = {
        type: "Point",
        coordinates: [lng, lat],
      };
    }

    const user = await User.findByIdAndUpdate(
      req.userId,
      update,
      {
        new: true,
        runValidators: true,
      }
    ).select("-password");

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    res.json({
      message: user.donorAvailable
        ? "You are now listed as an available donor"
        : "You are no longer listed as a donor",
      donorAvailable: user.donorAvailable,
      bloodGroup: user.bloodGroup || null,
    });
  } catch (err) {
    console.error("Set donor status error:", err);

    res.status(500).json({
      message: "Something went wrong",
      error: err.message,
    });
  }
};

module.exports = {
  listDonors,
  setDonorStatus,
};