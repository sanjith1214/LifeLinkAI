const jwt = require("jsonwebtoken");
const User = require("../models/User");

function setupSOSSocket(io) {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;

      if (!token) {
        return next(
          new Error("Authentication required")
        );
      }

      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET
      );

      const user = await User.findById(
        decoded.id
      ).select("-password");

      if (!user) {
        return next(
          new Error("User not found")
        );
      }

      if (user.suspended) {
        return next(
          new Error("Account suspended")
        );
      }

      if (
        (decoded.tokenVersion || 0) !==
        (user.tokenVersion || 0)
      ) {
        return next(
          new Error("Session expired")
        );
      }

      socket.user = user;

      next();
    } catch (error) {
      next(
        new Error("Invalid authentication")
      );
    }
  });

  io.on("connection", (socket) => {
    const userId =
      socket.user._id.toString();

    const role = socket.user.role;

    socket.join(`user:${userId}`);

    if (role) {
      socket.join(`role:${role}`);
    }

    socket.emit("sos:connected", {
      message: "SOS real-time connection established",
    });

    socket.on("sos:join", (sosId) => {
      if (!sosId) return;

      socket.join(`sos:${sosId}`);
    });

    socket.on("sos:leave", (sosId) => {
      if (!sosId) return;

      socket.leave(`sos:${sosId}`);
    });
  });
}

module.exports = setupSOSSocket;