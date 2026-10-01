import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { X, Send, MessageCircle, Circle } from "lucide-react";
import "./BloodChat.css";

function SOSChat({ requestId, responderName, onClose }) {
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState("");

  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);

  const socketUrl =
    import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      setError("Please login again.");
      return;
    }

    if (!requestId) {
      setError("Invalid SOS request.");
      return;
    }

    const socket = io(socketUrl, {
      transports: ["websocket"],
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
      setError("");

      socket.emit("joinSOSChat", {
        token,
        requestId,
      });
    });

    socket.on("sosChatJoined", () => {
      setConnected(true);
    });

    socket.on("sosChatHistory", (history) => {
      setMessages(history || []);
    });

    socket.on("sosMessage", (newMessage) => {
      setMessages((current) => [...current, newMessage]);
    });

    socket.on("sosChatError", (message) => {
      setError(message);
    });

    socket.on("disconnect", () => {
      setConnected(false);
    });

    socket.on("connect_error", () => {
      setConnected(false);
      setError("Unable to connect to the emergency chat.");
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
    const trimmed = message.trim();

    if (!trimmed || !connected) {
      return;
    }

    socketRef.current?.emit("sendSOSMessage", {
      requestId,
      message: trimmed,
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
    const parsed = JSON.parse(currentUser || "{}");

    currentUserId =
      parsed._id ||
      parsed.id ||
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
              <h3>Emergency Chat</h3>
              <p>{responderName || "Emergency Responder"}</p>
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
            {connected ? "Connected" : "Connecting..."}
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

              <h4>Emergency communication</h4>

              <p>
                Coordinate directly with the responder.
              </p>
            </div>
          ) : (
            messages.map((chatMessage, index) => {
              const mine =
                isMyMessage(chatMessage);

              return (
                <div
                  key={
                    chatMessage._id ||
                    `${chatMessage.createdAt}-${index}`
                  }
                  className={`blood-chat-message-row ${
                    mine ? "mine" : "theirs"
                  }`}
                >
                  <div
                    className={`blood-chat-message ${
                      mine ? "mine" : "theirs"
                    }`}
                  >
                    {!mine && (
                      <div className="blood-chat-sender">
                        {chatMessage.sender?.name ||
                          responderName ||
                          "Responder"}
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

export default SOSChat;