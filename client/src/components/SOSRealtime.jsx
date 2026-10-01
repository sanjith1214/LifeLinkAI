import { useEffect, useState } from "react";

import {
  connectSocket,
} from "../services/socket";

import {
  myRequests,
} from "../services/sos";

function SOSRealtime({
  onNotification,
}) {
  const [latestSOS, setLatestSOS] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const loadLatestSOS = async () => {
    try {
      const requests = await myRequests();

      if (!Array.isArray(requests) || requests.length === 0) {
        setLatestSOS(null);
        setLoading(false);
        return;
      }

      const latest = requests[0];

      setLatestSOS(latest);
      setError("");
    } catch (err) {
      console.error(
        "Could not load live SOS:",
        err
      );

      setError("");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLatestSOS();

    const socket = connectSocket();

    if (!socket) {
      return;
    }

    const handleConnected = (data) => {
      console.log(
        "SOS Socket connected:",
        data?.message
      );
    };

    const handleNewSOS = (data) => {
      onNotification?.({
        type: "new-sos",
        title: "New Emergency SOS",
        message:
          data?.message ||
          "A new emergency alert has been received.",
        data,
      });
    };

    const handleSOSUpdate = (data) => {
      const updatedRequest =
        data?.request;

      if (updatedRequest) {
        setLatestSOS((current) => {
          if (!current) {
            return updatedRequest;
          }

          const currentId =
            current._id?.toString();

          const updatedId =
            updatedRequest._id?.toString();

          if (
            currentId &&
            updatedId &&
            currentId === updatedId
          ) {
            return {
              ...current,
              ...updatedRequest,
            };
          }

          return current;
        });
      }

      onNotification?.({
        type: "sos-update",
        title: "SOS Updated",
        message:
          data?.message ||
          "Your emergency request has been updated.",
        data,
      });

      loadLatestSOS();
    };

    const handleResponderLocation = (
      data
    ) => {
      setLatestSOS((current) => {
        if (!current) {
          return current;
        }

        const currentId =
          current._id?.toString();

        const updatedId =
          data?.sosId?.toString();

        if (
          currentId &&
          updatedId &&
          currentId === updatedId
        ) {
          return {
            ...current,

            responderLocation:
              data.location || {
                type: "Point",
                coordinates: [
                  data.longitude,
                  data.latitude,
                ],
              },

            responderLocationUpdatedAt:
              data.updatedAt,

            responderName:
              data.responderName ||
              current.responderName,

            responderPhone:
              data.responderPhone ||
              current.responderPhone,
          };
        }

        return current;
      });

      onNotification?.({
        type: "responder-location",
        title: "Responder Location Updated",
        message:
          data?.message ||
          "Your responder's location has been updated.",
        data,
      });
    };

    socket.on(
      "sos:connected",
      handleConnected
    );

    socket.on(
      "sos:new",
      handleNewSOS
    );

    socket.on(
      "sos:update",
      handleSOSUpdate
    );

    socket.on(
      "sos:responder-location",
      handleResponderLocation
    );

    return () => {
      socket.off(
        "sos:connected",
        handleConnected
      );

      socket.off(
        "sos:new",
        handleNewSOS
      );

      socket.off(
        "sos:update",
        handleSOSUpdate
      );

      socket.off(
        "sos:responder-location",
        handleResponderLocation
      );
    };
  }, [onNotification]);

  const getStatusText = () => {
    if (!latestSOS) {
      return "";
    }

    if (latestSOS.status === "pending") {
      return "Waiting for a responder";
    }

    if (latestSOS.status === "accepted") {
      return "Responder is on the way";
    }

    if (latestSOS.status === "resolved") {
      return "Emergency resolved";
    }

    if (latestSOS.status === "cancelled") {
      return "SOS cancelled";
    }

    return latestSOS.status;
  };

  const getStatusClass = () => {
    if (!latestSOS) {
      return "";
    }

    if (latestSOS.status === "accepted") {
      return "accepted";
    }

    if (latestSOS.status === "resolved") {
      return "resolved";
    }

    if (latestSOS.status === "cancelled") {
      return "cancelled";
    }

    return "pending";
  };

  const openResponderLocation = () => {
    const coordinates =
      latestSOS?.responderLocation
        ?.coordinates;

    if (
      !Array.isArray(coordinates) ||
      coordinates.length !== 2
    ) {
      return;
    }

    const longitude = coordinates[0];
    const latitude = coordinates[1];

    const url =
      `https://www.google.com/maps?q=${latitude},${longitude}`;

    window.open(
      url,
      "_blank",
      "noopener,noreferrer"
    );
  };

  if (loading || !latestSOS) {
    return null;
  }

  return (
    <>
      <div
        style={{
          position: "fixed",
          right: 24,
          bottom: 24,
          width: 360,
          maxWidth: "calc(100vw - 32px)",
          background: "var(--card-bg, #ffffff)",
          border:
            "1px solid var(--border-color, #e5e7eb)",
          borderRadius: 16,
          padding: 18,
          boxShadow:
            "0 12px 35px rgba(0,0,0,0.15)",
          zIndex: 9998,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div>
            <strong>
              🚨 Live SOS Status
            </strong>

            <div
              style={{
                fontSize: 13,
                marginTop: 4,
                opacity: 0.65,
              }}
            >
              Your emergency request
            </div>
          </div>

          <span
            className={`portal-badge ${getStatusClass()}`}
            style={{
              textTransform: "capitalize",
            }}
          >
            {latestSOS.status}
          </span>
        </div>

        <div
          style={{
            marginTop: 14,
            fontWeight: 600,
          }}
        >
          {getStatusText()}
        </div>

        {latestSOS.type && (
          <div
            style={{
              marginTop: 8,
              fontSize: 14,
            }}
          >
            Emergency:{" "}
            <strong>
              {latestSOS.type}
            </strong>
          </div>
        )}

        {latestSOS.responderName && (
          <div
            style={{
              marginTop: 8,
              fontSize: 14,
            }}
          >
            Responder:{" "}
            <strong>
              {latestSOS.responderName}
            </strong>
          </div>
        )}

        {latestSOS.responderOrganisation && (
          <div
            style={{
              marginTop: 4,
              fontSize: 14,
            }}
          >
            Organisation:{" "}
            {latestSOS.responderOrganisation}
          </div>
        )}

        {latestSOS.etaMinutes !== undefined &&
          latestSOS.etaMinutes !== null &&
          latestSOS.status === "accepted" && (
            <div
              style={{
                marginTop: 10,
                padding: "10px 12px",
                borderRadius: 10,
                background:
                  "var(--background-secondary, #f5f7fa)",
                fontSize: 14,
              }}
            >
              ⏱️ Estimated arrival:{" "}
              <strong>
                {latestSOS.etaMinutes} minutes
              </strong>
            </div>
          )}

        {latestSOS.responderLocation
          ?.coordinates && (
          <button
            type="button"
            className="portal-btn secondary"
            onClick={openResponderLocation}
            style={{
              marginTop: 12,
              width: "100%",
            }}
          >
            📍 View Responder Location
          </button>
        )}

        {latestSOS.responderPhone &&
          latestSOS.status === "accepted" && (
          <a
            href={`tel:${latestSOS.responderPhone}`}
            className="portal-btn primary"
            style={{
              display: "block",
              marginTop: 8,
              width: "100%",
              textAlign: "center",
              textDecoration: "none",
              boxSizing: "border-box",
            }}
          >
            📞 Call Responder
          </a>
        )}

        {latestSOS.status === "pending" && (
          <div
            style={{
              marginTop: 10,
              fontSize: 12,
              opacity: 0.65,
              textAlign: "center",
            }}
          >
            Waiting for hospital, police,
            or fire station response...
          </div>
        )}

        {latestSOS.status === "resolved" && (
          <div
            style={{
              marginTop: 10,
              fontSize: 13,
              textAlign: "center",
              opacity: 0.7,
            }}
          >
            This emergency request has
            been resolved.
          </div>
        )}
      </div>

      {error && null}
    </>
  );
}

export default SOSRealtime;