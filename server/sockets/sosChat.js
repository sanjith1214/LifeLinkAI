const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

const EmergencyRequest = require("../models/EmergencyRequest");
const SOSChatMessage = require("../models/SOSChatMessage");

const getUserIdFromToken = (token) => {
  if (!token) {
    throw new Error("Authentication required");
  }

  const decoded = jwt.verify(
    token,
    process.env.JWT_SECRET
  );

  return decoded.id;
};

const findSOSChat = async (requestId, userId) => {
  if (!mongoose.Types.ObjectId.isValid(requestId)) {
    throw new Error("Invalid SOS request");
  }

  const request = await EmergencyRequest.findById(
    requestId
  ).lean();

  if (!request) {
    throw new Error("SOS request not found");
  }

  const currentUserId = userId.toString();
  const citizenId = request.citizenId?.toString();
  const responderId = request.respondedBy?.toString();

  const isCitizen =
    citizenId === currentUserId;

  const isResponder =
    responderId === currentUserId;

  if (!isCitizen && !isResponder) {
    throw new Error(
      "You are not part of this SOS chat"
    );
  }

  if (
    request.status !== "accepted" &&
    request.status !== "resolved"
  ) {
    throw new Error(
      "Chat is available after the SOS is accepted"
    );
  }

  return {
    request,
    citizenId,
    responderId,
  };
};

const setupSOSChat = (io) => {
  io.on("connection", (socket) => {
    console.log(
      "SOS chat socket connected:",
      socket.id
    );

    socket.on("joinSOSChat", async (data) => {
      try {
        const {
          token,
          requestId,
        } = data || {};

        const userId =
          getUserIdFromToken(token);

        const {
          citizenId,
          responderId,
        } = await findSOSChat(
          requestId,
          userId
        );

        const roomId =
          `sos-request-${requestId}`;

        socket.join(roomId);

        socket.data.userId =
          userId.toString();

        socket.data.requestId =
          requestId;

        socket.data.roomId =
          roomId;

        socket.emit("sosChatJoined", {
          success: true,
          roomId,
          citizenId,
          responderId,
        });

        const messages =
          await SOSChatMessage.find({
            requestId,
          })
            .sort({ createdAt: 1 })
            .populate(
              "sender",
              "name role"
            )
            .lean();

        socket.emit(
          "sosChatHistory",
          messages
        );
      } catch (error) {
        socket.emit(
          "sosChatError",
          error.message
        );
      }
    });

    socket.on(
      "sendSOSMessage",
      async (data) => {
        try {
          const {
            requestId,
            message,
          } = data || {};

          const userId =
            socket.data.userId;

          const roomId =
            socket.data.roomId;

          if (!userId) {
            throw new Error(
              "Join the SOS chat first"
            );
          }

          if (
            !message ||
            !message.trim()
          ) {
            throw new Error(
              "Message cannot be empty"
            );
          }

          if (
            message.trim().length > 1000
          ) {
            throw new Error(
              "Message is too long"
            );
          }

          if (
            socket.data.requestId !==
            requestId
          ) {
            throw new Error(
              "Invalid SOS chat request"
            );
          }

          const {
            citizenId,
            responderId,
          } = await findSOSChat(
            requestId,
            userId
          );

          const receiver =
            userId.toString() ===
            citizenId
              ? responderId
              : citizenId;

          if (!receiver) {
            throw new Error(
              "No responder is assigned to this SOS"
            );
          }

          const chatMessage =
            await SOSChatMessage.create({
              requestId,
              sender: userId,
              receiver,
              message: message.trim(),
            });

          const populatedMessage =
            await SOSChatMessage.findById(
              chatMessage._id
            )
              .populate(
                "sender",
                "name role"
              )
              .lean();

          io.to(roomId).emit(
            "sosMessage",
            populatedMessage
          );
        } catch (error) {
          socket.emit(
            "sosChatError",
            error.message
          );
        }
      }
    );

    socket.on("disconnect", () => {
      console.log(
        "SOS chat socket disconnected:",
        socket.id
      );
    });
  });
};

module.exports = setupSOSChat;