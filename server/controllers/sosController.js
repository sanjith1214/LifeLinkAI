const mongoose = require("mongoose");

const EmergencyRequest = require("../models/EmergencyRequest");
const Hospital = require("../models/Hospital");
const User = require("../models/User");

const {
  analyzeEmergency,
} = require("../services/emergencyIntelligence");

const VALID_TARGETS = [
  "hospital",
  "police",
  "firestation",
];

const RESPONDER_ROLES = [
  "hospital",
  "police",
  "firestation",
];

const DEFAULT_SERVICE_RADIUS_KM = 25;

function getIO(req) {
  return req.app.get("io");
}

function emitToUser(req, userId, event, data) {
  const io = getIO(req);

  if (!io || !userId) {
    return;
  }

  io.to(`user:${userId.toString()}`).emit(
    event,
    data
  );
}

function emitToRole(req, role, event, data) {
  const io = getIO(req);

  if (!io || !role) {
    return;
  }

  io.to(`role:${role}`).emit(event, data);
}

function emitToSOS(req, sosId, event, data) {
  const io = getIO(req);

  if (!io || !sosId) {
    return;
  }

  io.to(`sos:${sosId.toString()}`).emit(
    event,
    data
  );
}

const createSOS = async (req, res) => {
  try {
    const {
      longitude,
      latitude,
      type,
      targets,
      emergencyNote,
      medicalIdShared,
    } = req.body;

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

    const cleanTargets = Array.isArray(targets)
      ? targets.filter((target) =>
          VALID_TARGETS.includes(target)
        )
      : [];

    const finalTargets = cleanTargets.length
      ? [...new Set(cleanTargets)]
      : ["hospital"];

    let nearestHospital = null;

    if (finalTargets.includes("hospital")) {
      nearestHospital =
        await Hospital.findOne({
          location: {
            $near: {
              $geometry: {
                type: "Point",
                coordinates: [lng, lat],
              },
            },
          },
        });
    }

    let medicalSnapshot;

    if (medicalIdShared) {
      const user = await User.findById(
        req.userId
      ).lean();

      if (user) {
        medicalSnapshot = {
          bloodGroup: user.bloodGroup,
          allergies: user.allergies || [],
          medicalHistory:
            user.medicalHistory || [],
          emergencyContacts:
            user.emergencyContacts || [],
        };
      }
    }

    const responses = finalTargets.map(
      (service) => ({
        service,
        status: "pending",
      })
    );

    const emergencyRequest =
      await EmergencyRequest.create({
        citizenId: req.userId,

        type: type || "medical",

        emergencyNote:
          emergencyNote || "",

        location: {
          type: "Point",
          coordinates: [lng, lat],
        },

        assignedHospitalId:
          nearestHospital?._id || null,

        targets: finalTargets,

        responses,

        medicalIdShared:
          Boolean(medicalIdShared),

        medicalSnapshot,
      });

    const populatedRequest =
      await EmergencyRequest.findById(
        emergencyRequest._id
      )
        .populate(
          "citizenId",
          "name phone bloodGroup"
        )
        .populate(
          "assignedHospitalId",
          "name phone address"
        );

    const socketPayload = {
      message:
        "New emergency SOS received",

      request: populatedRequest,
    };

    // Send SOS to responders immediately
    for (const target of finalTargets) {
      emitToRole(
        req,
        target,
        "sos:new",
        socketPayload
      );
    }

    // Send SOS response immediately
    res.status(201).json({
      message:
        "SOS request created successfully",

      emergencyRequest,

      nearestHospital:
        finalTargets.includes("hospital")
          ? nearestHospital ||
            "No hospital is registered on the platform yet"
          : "Hospital was not alerted for this request",
    });

    // Run AI separately so it does not delay the SOS
    setImmediate(async () => {
      try {
        const analysis =
          await analyzeEmergency({
            type:
              emergencyRequest.type,

            emergencyNote:
              emergencyRequest.emergencyNote,

            bloodGroup:
              medicalSnapshot?.bloodGroup,

            allergies:
              medicalSnapshot?.allergies,

            medicalHistory:
              medicalSnapshot?.medicalHistory,

            targets:
              finalTargets,
          });

        if (!analysis) {
          console.log(
            "Emergency intelligence was not generated."
          );
          return;
        }

        const updatedRequest =
          await EmergencyRequest.findById(
            emergencyRequest._id
          );

        if (!updatedRequest) {
          return;
        }

        updatedRequest.emergencyIntelligence = {
          severity:
            analysis.severity,

          summary:
            analysis.summary,

          recommendedServices:
            analysis.recommendedServices || [],

          resourceNeeds:
            analysis.resourceNeeds || [],

          responderInstructions:
            analysis.responderInstructions || [],

          analyzedAt: new Date(),
        };

        await updatedRequest.save();

        const intelligencePayload = {
          message:
            "Emergency intelligence analysis completed",

          sosId:
            updatedRequest._id,

          intelligence:
            updatedRequest.emergencyIntelligence,
        };

        // Send AI intelligence to responders
        for (const target of finalTargets) {
          emitToRole(
            req,
            target,
            "sos:intelligence",
            intelligencePayload
          );
        }

        // Send AI intelligence to the citizen
        emitToUser(
          req,
          updatedRequest.citizenId,
          "sos:intelligence",
          intelligencePayload
        );

        // Send AI intelligence to the SOS room
        emitToSOS(
          req,
          updatedRequest._id,
          "sos:intelligence",
          intelligencePayload
        );

        console.log(
          "Emergency intelligence generated:",
          updatedRequest._id.toString()
        );
      } catch (error) {
        console.error(
          "Background emergency intelligence error:",
          error.message
        );
      }
    });
  } catch (err) {
    console.error(
      "Create SOS error:",
      err
    );

    res.status(500).json({
      message: "Something went wrong",
      error: err.message,
    });
  }
};

const listSOS = async (req, res) => {
  try {
    const role = req.user.role;

    if (!RESPONDER_ROLES.includes(role)) {
      return res.status(403).json({
        message:
          "Only response services can view incoming SOS alerts",
      });
    }

    const filter = {
      "responses.service": role,
      "responses.status": {
        $in: ["pending", "accepted"],
      },
    };

    if (role === "hospital") {
      const myHospital =
        await Hospital.findOne({
          ownerId: req.user._id,
        });

      if (myHospital) {
        const radiusKm =
          req.user.serviceRadiusKm ||
          DEFAULT_SERVICE_RADIUS_KM;

        filter.location = {
          $near: {
            $geometry:
              myHospital.location,
            $maxDistance:
              radiusKm * 1000,
          },
        };
      }
    }

    const requests =
      await EmergencyRequest.find(filter)
        .populate(
          "citizenId",
          "name phone bloodGroup"
        )
        .populate(
          "assignedHospitalId",
          "name phone address"
        )
        .populate(
          "responses.responder",
          "name orgName phone role"
        )
        .sort({
          createdAt: -1,
        })
        .limit(200);

    const result = requests.map(
      (request) => {
        const response =
          request.responses.find(
            (item) =>
              item.service === role
          );

        return {
          ...request.toObject(),

          responderResponse:
            response || null,
        };
      }
    );

    res.json({
      requests: result,
    });
  } catch (err) {
    console.error(
      "List SOS error:",
      err
    );

    res.status(500).json({
      message: "Something went wrong",
      error: err.message,
    });
  }
};

const myRequests = async (req, res) => {
  try {
    const requests =
      await EmergencyRequest.find({
        citizenId: req.userId,
      })
        .populate(
          "assignedHospitalId",
          "name phone address"
        )
        .populate(
          "responses.responder",
          "name orgName phone role"
        )
        .sort({
          createdAt: -1,
        });

    res.json({
      requests,
    });
  } catch (err) {
    console.error(
      "My SOS requests error:",
      err
    );

    res.status(500).json({
      message: "Something went wrong",
      error: err.message,
    });
  }
};

const cancelSOS = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({
        message: "Request not found",
      });
    }

    const request =
      await EmergencyRequest.findOne({
        _id: id,
        citizenId: req.userId,
      });

    if (!request) {
      return res.status(404).json({
        message: "Request not found",
      });
    }

    if (request.status !== "pending") {
      return res.status(400).json({
        message:
          "This request can no longer be cancelled",
      });
    }

    request.status = "cancelled";
    request.cancelledAt = new Date();

    request.responses.forEach(
      (response) => {
        if (
          response.status === "pending"
        ) {
          response.status = "declined";
        }
      }
    );

    await request.save();

    const payload = {
      message: "SOS request cancelled",
      request,
      status: "cancelled",
    };

    emitToUser(
      req,
      request.citizenId,
      "sos:update",
      payload
    );

    emitToSOS(
      req,
      request._id,
      "sos:update",
      payload
    );

    for (const response of request.responses) {
      emitToRole(
        req,
        response.service,
        "sos:update",
        payload
      );
    }

    res.json({
      message: "SOS request cancelled",
      request,
    });
  } catch (err) {
    console.error(
      "Cancel SOS error:",
      err
    );

    res.status(500).json({
      message: "Something went wrong",
      error: err.message,
    });
  }
};

const updateOverallStatus = (request) => {
  const responses =
    request.responses || [];

  if (request.status === "cancelled") {
    return;
  }

  const hasAccepted =
    responses.some(
      (response) =>
        response.status === "accepted"
    );

  const hasResolved =
    responses.some(
      (response) =>
        response.status === "resolved"
    );

  const hasPending =
    responses.some(
      (response) =>
        response.status === "pending"
    );

  const allFinished =
    responses.length > 0 &&
    responses.every(
      (response) =>
        response.status ===
          "resolved" ||
        response.status ===
          "declined"
    );

  if (
    allFinished &&
    hasResolved
  ) {
    request.status = "resolved";

    request.resolvedAt =
      request.resolvedAt ||
      new Date();

    return;
  }

  if (hasAccepted) {
    request.status = "accepted";
    return;
  }

  if (hasPending) {
    request.status = "pending";
    return;
  }

  request.status = "pending";
};

const acceptSOS = async (req, res) => {
  try {
    await updateResponderResponse(
      req,
      res,
      "accepted"
    );
  } catch (err) {
    console.error(
      "Accept SOS error:",
      err
    );

    res.status(500).json({
      message: "Something went wrong",
      error: err.message,
    });
  }
};

const declineSOS = async (req, res) => {
  try {
    await updateResponderResponse(
      req,
      res,
      "declined"
    );
  } catch (err) {
    console.error(
      "Decline SOS error:",
      err
    );

    res.status(500).json({
      message: "Something went wrong",
      error: err.message,
    });
  }
};

const resolveSOS = async (req, res) => {
  try {
    await updateResponderResponse(
      req,
      res,
      "resolved"
    );
  } catch (err) {
    console.error(
      "Resolve SOS error:",
      err
    );

    res.status(500).json({
      message: "Something went wrong",
      error: err.message,
    });
  }
};

const updateResponderResponse = async (
  req,
  res,
  newStatus
) => {
  const { id } = req.params;
  const role = req.user.role;

  if (!mongoose.isValidObjectId(id)) {
    return res.status(404).json({
      message: "Request not found",
    });
  }

  if (!RESPONDER_ROLES.includes(role)) {
    return res.status(403).json({
      message:
        "Only response services can update SOS requests",
    });
  }

  const request =
    await EmergencyRequest.findById(id);

  if (!request) {
    return res.status(404).json({
      message: "Request not found",
    });
  }

  const response =
    request.responses.find(
      (item) =>
        item.service === role
    );

  if (!response) {
    return res.status(403).json({
      message:
        "This SOS was not sent to your service",
    });
  }

  if (newStatus === "accepted") {
    if (response.status !== "pending") {
      return res.status(409).json({
        message:
          "Your service has already responded to this SOS",
      });
    }

    response.status = "accepted";

    response.responder =
      req.user._id;

    response.responderName =
      req.user.name;

    response.responderOrganisation =
      req.user.orgName;

    response.responderPhone =
      req.user.phone;

    response.acceptedAt =
      new Date();

    if (
      req.body.etaMinutes !==
      undefined
    ) {
      const eta = Number(
        req.body.etaMinutes
      );

      if (
        Number.isFinite(eta) &&
        eta >= 0
      ) {
        response.etaMinutes = eta;

        response.estimatedArrivalAt =
          new Date(
            Date.now() +
              eta *
                60 *
                1000
          );
      }
    }

    const lat = Number(
      req.body.latitude
    );

    const lng = Number(
      req.body.longitude
    );

    if (
      Number.isFinite(lat) &&
      Number.isFinite(lng) &&
      lat >= -90 &&
      lat <= 90 &&
      lng >= -180 &&
      lng <= 180
    ) {
      response.responderLocation = {
        type: "Point",
        coordinates: [lng, lat],
      };

      response.responderLocationUpdatedAt =
        new Date();
    }
  }

  if (newStatus === "declined") {
    if (response.status !== "pending") {
      return res.status(409).json({
        message:
          "Your service has already responded to this SOS",
      });
    }

    response.status = "declined";

    response.responder =
      req.user._id;

    response.responderName =
      req.user.name;

    response.responderOrganisation =
      req.user.orgName;

    response.responderPhone =
      req.user.phone;
  }

  if (newStatus === "resolved") {
    if (response.status !== "accepted") {
      return res.status(409).json({
        message:
          "Only an accepted SOS can be resolved",
      });
    }

    response.status = "resolved";

    response.resolvedAt =
      new Date();
  }

  updateOverallStatus(request);

  const activeResponse =
    request.responses.find(
      (item) =>
        item.status === "accepted"
    );

  if (activeResponse) {
    request.respondedBy =
      activeResponse.responder;

    request.respondedByRole =
      activeResponse.service;

    request.responderName =
      activeResponse.responderName;

    request.responderOrganisation =
      activeResponse.responderOrganisation;

    request.responderPhone =
      activeResponse.responderPhone;

    request.etaMinutes =
      activeResponse.etaMinutes;

    request.estimatedArrivalAt =
      activeResponse.estimatedArrivalAt;

    request.responderLocation =
      activeResponse.responderLocation;

    request.responderLocationUpdatedAt =
      activeResponse.responderLocationUpdatedAt;

    request.acceptedAt =
      activeResponse.acceptedAt;
  }

  await request.save();

  const updatedRequest =
    await EmergencyRequest.findById(
      request._id
    )
      .populate(
        "citizenId",
        "name phone bloodGroup"
      )
      .populate(
        "assignedHospitalId",
        "name phone address"
      )
      .populate(
        "responses.responder",
        "name orgName phone role"
      );

  const updatedResponse =
    updatedRequest.responses.find(
      (item) =>
        item.service === role
    );

  const requestObject =
    updatedRequest.toObject();

  const socketPayload = {
    message:
      `SOS ${newStatus} by ${role}`,
    request: {
      ...requestObject,
      responderResponse:
        updatedResponse || null,
    },
    status:
      updatedRequest.status,
    service: role,
    responseStatus: newStatus,
  };

  emitToUser(
    req,
    updatedRequest.citizenId?._id ||
      updatedRequest.citizenId,
    "sos:update",
    socketPayload
  );

  emitToSOS(
    req,
    updatedRequest._id,
    "sos:update",
    socketPayload
  );

  res.json({
    message:
      `Your ${role} response is now ${newStatus}`,

    request: {
      ...requestObject,

      responderResponse:
        updatedResponse || null,
    },
  });
};

const updateResponderLocation =
  async (req, res) => {
    try {
      const { id } = req.params;

      if (!mongoose.isValidObjectId(id)) {
        return res.status(404).json({
          message: "Request not found",
        });
      }

      const role = req.user.role;

      if (!RESPONDER_ROLES.includes(role)) {
        return res.status(403).json({
          message:
            "Only response services can update location",
        });
      }

      const lat = Number(
        req.body.latitude
      );

      const lng = Number(
        req.body.longitude
      );

      if (
        !Number.isFinite(lat) ||
        !Number.isFinite(lng) ||
        lat < -90 ||
        lat > 90 ||
        lng < -180 ||
        lng > 180
      ) {
        return res.status(400).json({
          message:
            "Invalid location coordinates",
        });
      }

      const request =
        await EmergencyRequest.findById(id);

      if (!request) {
        return res.status(404).json({
          message: "Request not found",
        });
      }

      const response =
        request.responses.find(
          (item) =>
            item.service === role
        );

      if (!response) {
        return res.status(403).json({
          message:
            "This SOS was not sent to your service",
        });
      }

      if (response.status !== "accepted") {
        return res.status(400).json({
          message:
            "Accept the SOS before sharing your location",
        });
      }

      response.responderLocation = {
        type: "Point",
        coordinates: [lng, lat],
      };

      response.responderLocationUpdatedAt =
        new Date();

      if (
        request.respondedByRole === role
      ) {
        request.responderLocation =
          response.responderLocation;

        request.responderLocationUpdatedAt =
          response.responderLocationUpdatedAt;
      }

      await request.save();

      const socketPayload = {
        message:
          "Responder location updated",

        sosId:
          request._id,

        service: role,

        responderId:
          req.user._id,

        responderName:
          req.user.name,

        latitude: lat,

        longitude: lng,

        location:
          response.responderLocation,

        updatedAt:
          response.responderLocationUpdatedAt,
      };

      emitToUser(
        req,
        request.citizenId,
        "sos:responder-location",
        socketPayload
      );

      emitToSOS(
        req,
        request._id,
        "sos:responder-location",
        socketPayload
      );

      res.json({
        message:
          "Responder location updated",

        request,
      });
    } catch (err) {
      console.error(
        "Update responder location error:",
        err
      );

      res.status(500).json({
        message: "Something went wrong",
        error: err.message,
      });
    }
  };

module.exports = {
  createSOS,
  listSOS,
  myRequests,
  cancelSOS,
  acceptSOS,
  declineSOS,
  resolveSOS,
  updateResponderLocation,
};