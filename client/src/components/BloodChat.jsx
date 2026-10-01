import { useEffect, useRef, useState } from "react";
import "./BloodChat.css";
import {
  X,
  Send,
  MessageCircle,
  Circle,
} from "lucide-react";
import { io } from "socket.io-client";

function BloodChat({
  requestId,
  donorName,
  onClose,
}) {
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState("");

  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);

  const socketUrl =
    import.meta.env.VITE_SOCKET_URL ||
    "http://localhost:5000";

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      setError("Please login again.");
      return;
    }

    if (!requestId) {
      setError("Invalid blood request.");
      return;
    }

    const socket = io(socketUrl, {
      transports: ["websocket"],
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
      setError("");

      socket.emit("joinBloodChat", {
        token,
        requestId,
      });
    });

    socket.on("bloodChatJoined", () => {
      setConnected(true);
    });

    socket.on("bloodChatHistory", (history) => {
      setMessages(history || []);
    });

    socket.on("bloodMessage", (newMessage) => {
      setMessages((currentMessages) => [
        ...currentMessages,
        newMessage,
      ]);
    });

    socket.on("bloodChatError", (message) => {
      setError(message);
    });

    socket.on("disconnect", () => {
      setConnected(false);
    });

    socket.on("connect_error", () => {
      setConnected(false);
      setError(
        "Unable to connect to the chat server."
      );
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [requestId, socketUrl]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

  const sendMessage = () => {
    const trimmedMessage = message.trim();

    if (!trimmedMessage) {
      return;
    }

    if (!connected) {
      setError("Chat is not connected.");
      return;
    }

    socketRef.current?.emit("sendBloodMessage", {
      requestId,
      message: trimmedMessage,
    });

    setMessage("");
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage();
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const currentUser = localStorage.getItem("user");

  let currentUserId = "";

  try {
    const parsedUser = JSON.parse(
      currentUser || "{}"
    );

    currentUserId =
      parsedUser._id ||
      parsedUser.id ||
      "";
  } catch {
    currentUserId = "";
  }

  const isMyMessage = (chatMessage) => {
    const senderId =
      chatMessage.sender?._id ||
      chatMessage.sender?.id ||
      chatMessage.sender;

    return (
      senderId?.toString() ===
      currentUserId?.toString()
    );
  };

  return (
    <div className="blood-chat-overlay">

      <div className="blood-chat-window">

        <div className="blood-chat-header">

          <div className="blood-chat-title">

            <div className="blood-chat-avatar">
              <MessageCircle size={20} />
            </div>

            <div>
              <h3>
                Blood Emergency Chat
              </h3>

              <p>
                {donorName || "Blood Donor"}
              </p>
            </div>

          </div>


          <button
            className="blood-chat-close"
            onClick={onClose}
          >
            <X size={20} />
          </button>

        </div>


        <div className="blood-chat-status">

          <Circle
            size={9}
            fill={connected ? "currentColor" : "none"}
          />

          <span>
            {connected
              ? "Connected"
              : "Connecting..."}
          </span>

        </div>


        {error && (
          <div className="blood-chat-error">
            {error}
          </div>
        )}


        <div className="blood-chat-messages">

          {messages.length === 0 ? (

            <div className="blood-chat-empty">

              <MessageCircle size={36} />

              <h4>
                Start the conversation
              </h4>

              <p>
                Coordinate the blood donation
                directly with the other person.
              </p>

            </div>

          ) : (

            messages.map((chatMessage, index) => {

              const mine =
                isMyMessage(chatMessage);

              return (
                <div
                  className={`blood-chat-message-row ${
                    mine ? "mine" : "theirs"
                  }`}
                  key={
                    chatMessage._id ||
                    `${chatMessage.createdAt}-${index}`
                  }
                >

                  <div
                    className={`blood-chat-message ${
                      mine ? "mine" : "theirs"
                    }`}
                  >

                    {!mine && (
                      <div className="blood-chat-sender">
                        {chatMessage.sender?.name ||
                          donorName ||
                          "User"}
                      </div>
                    )}

                    <div className="blood-chat-text">
                      {chatMessage.message}
                    </div>

                    {chatMessage.createdAt && (
                      <div className="blood-chat-time">
                        {new Date(
                          chatMessage.createdAt
                        ).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    )}

                  </div>

                </div>
              );
            })

          )}

          <div ref={messagesEndRef} />

        </div>


        <form
          className="blood-chat-input-area"
          onSubmit={handleSubmit}
        >

          <textarea
            value={message}
            onChange={(e) =>
              setMessage(e.target.value)
            }
            onKeyDown={handleKeyDown}
            placeholder={
              connected
                ? "Type a message..."
                : "Connecting..."
            }
            disabled={!connected}
            rows="1"
            maxLength={1000}
          />

          <button
            type="submit"
            disabled={
              !connected ||
              !message.trim()
            }
          >
            <Send size={18} />
          </button>

        </form>

      </div>

    </div>
  );
}

export default BloodChat;