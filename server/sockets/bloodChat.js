const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

const BloodRequest = require("../models/BloodRequest");
const ChatMessage = require("../models/ChatMessage");
const User = require("../models/User");

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

const findAcceptedChat = async (
  requestId,
  userId
) => {
  if (!mongoose.Types.ObjectId.isValid(requestId)) {
    throw new Error("Invalid blood request");
  }

  const request = await BloodRequest.findById(
    requestId
  ).lean();

  if (!request) {
    throw new Error("Blood request not found");
  }

  const requesterId =
    request.requester?.toString();

  const acceptedResponse =
    request.responses?.find(
      (response) =>
        response.status === "accepted"
    );

  if (!acceptedResponse) {
    throw new Error(
      "Chat is available only after a donor is accepted"
    );
  }

  const donorId =
    acceptedResponse.donor?.toString();

  const currentUserId = userId.toString();

  const isRequester =
    requesterId === currentUserId;

  const isDonor =
    donorId === currentUserId;

  if (!isRequester && !isDonor) {
    throw new Error(
      "You are not part of this blood request"
    );
  }

  return {
    request,
    requesterId,
    donorId,
  };
};

const setupBloodChat = (io) => {
  io.on("connection", (socket) => {
    console.log(
      "Socket connected:",
      socket.id
    );

    socket.on("joinBloodChat", async (data) => {
      try {
        const {
          token,
          requestId,
        } = data || {};

        const userId =
          getUserIdFromToken(token);

        const {
          requesterId,
          donorId,
        } = await findAcceptedChat(
          requestId,
          userId
        );

        const roomId =
          `blood-request-${requestId}`;

        socket.join(roomId);

        socket.data.userId =
          userId.toString();

        socket.data.requestId =
          requestId;

        socket.data.roomId =
          roomId;

        socket.emit("bloodChatJoined", {
          success: true,
          roomId,
          requesterId,
          donorId,
        });

        const messages =
          await ChatMessage.find({
            requestId,
          })
            .sort({ createdAt: 1 })
            .populate(
              "sender",
              "name"
            )
            .lean();

        socket.emit(
          "bloodChatHistory",
          messages
        );

      } catch (error) {
        socket.emit(
          "bloodChatError",
          error.message
        );
      }
    });

    socket.on(
      "sendBloodMessage",
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
              "Join the blood chat first"
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
              "Invalid chat request"
            );
          }

          const {
            requesterId,
            donorId,
          } = await findAcceptedChat(
            requestId,
            userId
          );

          const receiver =
            userId.toString() ===
            requesterId
              ? donorId
              : requesterId;

          const chatMessage =
            await ChatMessage.create({
              requestId,
              sender: userId,
              receiver,
              message: message.trim(),
            });

          const populatedMessage =
            await ChatMessage.findById(
              chatMessage._id
            )
              .populate(
                "sender",
                "name"
              )
              .lean();

          io.to(roomId).emit(
            "bloodMessage",
            populatedMessage
          );

        } catch (error) {
          socket.emit(
            "bloodChatError",
            error.message
          );
        }
      }
    );

    socket.on("disconnect", () => {
      console.log(
        "Socket disconnected:",
        socket.id
      );
    });
  });
};

module.exports = setupBloodChat;