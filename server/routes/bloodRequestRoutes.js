const express = require("express");

const protect = require("../middleware/authMiddleware");

const {
  createBloodRequest,
  listNearbyBloodRequests,
  listMyBloodRequests,
  listMyDonations,
  respondToBloodRequest,
  updateResponse,
  cancelBloodRequest,
  fulfillBloodRequest,
} = require("../controllers/bloodRequestController");

const router = express.Router();

// Create a new blood request
router.post("/", protect, createBloodRequest);

// Get nearby compatible blood requests
router.get("/nearby", protect, listNearbyBloodRequests);

// Get my blood requests
router.get("/mine", protect, listMyBloodRequests);

// Get blood requests where I responded as a donor
router.get("/my-donations", protect, listMyDonations);

// Respond to a blood request
router.post("/:id/respond", protect, respondToBloodRequest);

// Accept or decline a donor response
router.put(
  "/:id/responses/:donorId",
  protect,
  updateResponse
);

// Cancel a blood request
router.put(
  "/:id/cancel",
  protect,
  cancelBloodRequest
);

// Mark a blood request as fulfilled
router.put(
  "/:id/fulfill",
  protect,
  fulfillBloodRequest
);

module.exports = router;