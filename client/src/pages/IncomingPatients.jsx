import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  ArrowLeft,
  Check,
  CheckCheck,
  X,
  MapPin,
} from "lucide-react";

import AppNavbar from "./AppNavbar";
import CoverageMap from "../components/CoverageMap";
import MapsLink from "../components/MapsLink";

import {
  listSOS,
  acceptSOS,
  declineSOS,
  resolveSOS,
} from "../services/sos";

import { getErrorMessage } from "../services/api";
import { connectSocket } from "../services/socket";

import "./Dashboard.css";
import "./portal.css";

const STATUS_BADGE = {
  pending: "pending",
  accepted: "hospital",
  declined: "rejected",
  resolved: "approved",
};

const TABS = [
  {
    value: "pending",
    label: "Pending",
  },
  {
    value: "accepted",
    label: "Accepted",
  },
  {
    value: "resolved",
    label: "Resolved",
  },
  {
    value: "declined",
    label: "Declined",
  },
];

function IncomingPatients() {
  const navigate = useNavigate();

  const [view, setView] = useState("pending");
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [etaDrafts, setEtaDrafts] = useState({});

  const load = async () => {
    try {
      const data = await listSOS();

      setRequests(data);
      setError("");
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          "Could not load incoming requests."
        )
      );
    } finally {
      setLoading(false);
    }
  };

  // Initial load + real-time SOS updates
  useEffect(() => {
    load();

    const socket = connectSocket();

    if (!socket) {
      return;
    }

    const handleSOSUpdate = () => {
      load();
    };

    const handleNewSOS = () => {
      load();
    };

    socket.on("sos:update", handleSOSUpdate);
    socket.on("sos:new", handleNewSOS);

    return () => {
      socket.off("sos:update", handleSOSUpdate);
      socket.off("sos:new", handleNewSOS);
    };
  }, []);

  const acceptWithLocation = (id) => {
    setBusyId(id);
    setNotice("");
    setError("");

    if (!navigator.geolocation) {
      setError(
        "Location is not supported on this device."
      );

      setBusyId(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const {
            latitude,
            longitude,
          } = position.coords;

          const etaValue = etaDrafts[id];

          const eta =
            etaValue !== undefined &&
            etaValue !== ""
              ? Number(etaValue)
              : undefined;

          await acceptSOS(
            id,
            eta,
            latitude,
            longitude
          );

          setNotice(
            "Emergency request accepted. Your location and ETA were shared."
          );

          await load();
        } catch (err) {
          setError(
            getErrorMessage(
              err,
              "Could not accept this request."
            )
          );
        } finally {
          setBusyId(null);
        }
      },
      () => {
        setError(
          "Location permission is required to accept this emergency request."
        );

        setBusyId(null);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000,
      }
    );
  };

  const act = async (id, action) => {
    if (action === "accept") {
      acceptWithLocation(id);
      return;
    }

    setBusyId(id);
    setNotice("");
    setError("");

    try {
      if (action === "decline") {
        await declineSOS(id);
      }

      if (action === "resolve") {
        await resolveSOS(id);
      }

      setNotice(
        `Request marked as ${action}.`
      );

      await load();
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          "Could not update this request."
        )
      );
    } finally {
      setBusyId(null);
    }
  };

  const visible = requests.filter(
    (request) => request.status === view
  );

  return (
    <div className="portal-page">
      <AppNavbar showLogout />

      <div className="portal-content">

        <button
          className="portal-back"
          onClick={() =>
            navigate("/dashboard")
          }
        >
          <ArrowLeft size={14} />
          Back to dashboard
        </button>

        <div className="portal-head">
          <div>
            <h1>
              Incoming patients
            </h1>

            <p>
              SOS alerts sent by patients,
              newest first.
            </p>
          </div>

          <div
            className="portal-toolbar"
            style={{
              margin: 0,
              flexWrap: "wrap",
            }}
          >
            {TABS.map((tab) => (
              <button
                key={tab.value}
                className={`portal-btn ${
                  view === tab.value
                    ? "primary"
                    : "ghost"
                }`}
                onClick={() =>
                  setView(tab.value)
                }
              >
                {tab.label}
              </button>
            ))}

            <button
              className={`portal-btn ${
                view === "map"
                  ? "primary"
                  : "ghost"
              }`}
              onClick={() =>
                setView("map")
              }
            >
              Coverage map
            </button>
          </div>
        </div>

        {error && (
          <div className="portal-message error">
            {error}
          </div>
        )}

        {notice && (
          <div className="portal-message success">
            {notice}
          </div>
        )}

        {view === "map" ? (
          <div className="portal-panel">
            <CoverageMap
              alerts={requests.filter(
                (request) =>
                  request.status === "pending" ||
                  request.status === "accepted"
              )}
            />
          </div>
        ) : (
          <div className="portal-panel">

            {loading ? (
              <div className="portal-empty">
                Loading requests…
              </div>
            ) : visible.length === 0 ? (
              <div className="portal-empty">
                No {view} requests right now.
              </div>
            ) : (
              <div className="portal-table-wrap">

                <table className="portal-table">
                  <thead>
                    <tr>
                      <th>Patient</th>
                      <th>Phone</th>
                      <th>Type</th>
                      <th>Hospital assigned</th>
                      <th>Status</th>
                      <th>Raised</th>
                      <th />
                    </tr>
                  </thead>

                  <tbody>
                    {visible.map(
                      (request) => (
                        <tr
                          key={request._id}
                        >
                          <td>
                            {request.citizenId?.name ||
                              "Unknown"}
                          </td>

                          <td>
                            {request.citizenId?.phone ||
                              "—"}
                          </td>

                          <td
                            style={{
                              textTransform:
                                "capitalize",
                            }}
                          >
                            {request.type}
                          </td>

                          <td>
                            {request
                              .assignedHospitalId
                              ?.name || "—"}
                          </td>

                          <td>
                            <span
                              className={`portal-badge ${
                                STATUS_BADGE[
                                  request.status
                                ]
                              }`}
                            >
                              {request.status}
                            </span>

                            {request.etaMinutes !=
                              null &&
                              request.status ===
                                "accepted" && (
                                <div
                                  style={{
                                    fontSize: 11.5,
                                    color:
                                      "var(--text-secondary)",
                                    marginTop: 4,
                                  }}
                                >
                                  ETA{" "}
                                  {
                                    request.etaMinutes
                                  }{" "}
                                  min
                                </div>
                              )}
                          </td>

                          <td>
                            {new Date(
                              request.createdAt
                            ).toLocaleString()}
                          </td>

                          <td
                            style={{
                              whiteSpace:
                                "nowrap",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                gap: 6,
                                alignItems:
                                  "center",
                                flexWrap:
                                  "wrap",
                              }}
                            >
                              <MapsLink
                                coordinates={
                                  request.location
                                    ?.coordinates
                                }
                              />

                              {request.status ===
                                "pending" && (
                                <>
                                  <div
                                    style={{
                                      display:
                                        "flex",
                                      alignItems:
                                        "center",
                                      gap: 5,
                                    }}
                                  >
                                    <ClockIcon />

                                    <input
                                      type="number"
                                      min="0"
                                      placeholder="ETA"
                                      value={
                                        etaDrafts[
                                          request._id
                                        ] || ""
                                      }
                                      onChange={(
                                        event
                                      ) =>
                                        setEtaDrafts(
                                          (current) => ({
                                            ...current,
                                            [request._id]:
                                              event
                                                .target
                                                .value,
                                          })
                                        )
                                      }
                                      style={{
                                        width: 70,
                                      }}
                                    />
                                  </div>

                                  <button
                                    className="portal-btn primary small"
                                    disabled={
                                      busyId ===
                                      request._id
                                    }
                                    onClick={() =>
                                      act(
                                        request._id,
                                        "accept"
                                      )
                                    }
                                  >
                                    <Check
                                      size={14}
                                    />

                                    {busyId ===
                                    request._id
                                      ? "Accepting..."
                                      : "Accept"}
                                  </button>

                                  <button
                                    className="portal-btn danger small"
                                    disabled={
                                      busyId ===
                                      request._id
                                    }
                                    onClick={() =>
                                      act(
                                        request._id,
                                        "decline"
                                      )
                                    }
                                  >
                                    <X
                                      size={14}
                                    />

                                    Decline
                                  </button>
                                </>
                              )}

                              {request.status ===
                                "accepted" && (
                                <>
                                  <button
                                    className="portal-btn primary small"
                                    disabled={
                                      busyId ===
                                      request._id
                                    }
                                    onClick={() =>
                                      act(
                                        request._id,
                                        "resolve"
                                      )
                                    }
                                  >
                                    <CheckCheck
                                      size={14}
                                    />

                                    Resolve
                                  </button>

                                  {request
                                    .responderLocation
                                    ?.coordinates && (
                                    <MapsLink
                                      coordinates={
                                        request
                                          .responderLocation
                                          .coordinates
                                      }
                                    />
                                  )}
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>

              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
}

function ClockIcon() {
  return (
    <MapPin
      size={14}
      style={{
        color: "var(--text-secondary)",
      }}
    />
  );
}

export default IncomingPatients;