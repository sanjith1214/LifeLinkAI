const express = require("express");

const router = express.Router();

const {
  protect,
  requireApproved,
} = require("../middleware/authMiddleware");

const {
  createSOS,
  listSOS,
  myRequests,
  cancelSOS,
  acceptSOS,
  declineSOS,
  resolveSOS,
  updateResponderLocation,
} = require("../controllers/sosController");

router.post(
  "/",
  protect,
  requireApproved,
  createSOS
);

router.get(
  "/mine",
  protect,
  requireApproved,
  myRequests
);

router.patch(
  "/:id/cancel",
  protect,
  requireApproved,
  cancelSOS
);

router.get(
  "/",
  protect,
  requireApproved,
  listSOS
);

router.patch(
  "/:id/accept",
  protect,
  requireApproved,
  acceptSOS
);

router.patch(
  "/:id/decline",
  protect,
  requireApproved,
  declineSOS
);

router.patch(
  "/:id/resolve",
  protect,
  requireApproved,
  resolveSOS
);

router.patch(
  "/:id/location",
  protect,
  requireApproved,
  updateResponderLocation
);

module.exports = router;