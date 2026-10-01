import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Siren,
  X,
  RefreshCw,
  Search,
  MapPin,
  Phone,
  Clock,
  CheckCircle,
  AlertCircle,
  Activity,
  Hospital,
  Shield,
  Flame,
  UserCheck,
  Navigation,
  HeartPulse,
} from "lucide-react";

import AppNavbar from "./AppNavbar";
import MapsLink from "../components/MapsLink";

import {
  myRequests,
  cancelSOS,
} from "../services/sos";

import { getErrorMessage } from "../services/api";

import "./Dashboard.css";
import "./portal.css";

const STATUS_BADGE = {
  pending: "pending",
  accepted: "hospital",
  resolved: "approved",
  cancelled: "rejected",
  declined: "rejected",
};

const TIMELINE_STEPS = [
  "pending",
  "accepted",
  "resolved",
];

const STEP_LABEL = {
  pending: "Sent",
  accepted: "Accepted",
  resolved: "Resolved",
};

function Timeline({ status }) {
  if (status === "cancelled") {
    return (
      <div
        className="portal-badge rejected"
        style={{ display: "inline-block" }}
      >
        Cancelled by you
      </div>
    );
  }

  if (status === "declined") {
    return (
      <div
        className="portal-badge rejected"
        style={{ display: "inline-block" }}
      >
        Declined
      </div>
    );
  }

  const currentIndex =
    TIMELINE_STEPS.indexOf(status);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        flexWrap: "wrap",
      }}
    >
      {TIMELINE_STEPS.map((step, index) => (
        <div
          key={step}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <span
            style={{
              fontSize: 11.5,
              padding: "4px 10px",
              borderRadius: 999,
              fontWeight: 600,
              background:
                index <= currentIndex
                  ? "var(--accent-soft-bg)"
                  : "var(--border-color-soft)",
              color:
                index <= currentIndex
                  ? "var(--accent)"
                  : "var(--text-secondary)",
            }}
          >
            {STEP_LABEL[step]}
          </span>

          {index <
            TIMELINE_STEPS.length - 1 && (
            <span
              style={{
                width: 18,
                height: 1,
                background:
                  index < currentIndex
                    ? "var(--accent)"
                    : "var(--border-color)",
              }}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function ServiceIcon({ service }) {
  if (service === "hospital") {
    return <Hospital size={14} />;
  }

  if (service === "police") {
    return <Shield size={14} />;
  }

  if (service === "firestation") {
    return <Flame size={14} />;
  }

  return <Siren size={14} />;
}

function serviceLabel(service) {
  if (service === "hospital") {
    return "Hospital";
  }

  if (service === "police") {
    return "Police";
  }

  if (service === "firestation") {
    return "Fire Station";
  }

  return service;
}

function SosHistory() {
  const navigate = useNavigate();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busyId, setBusyId] = useState(null);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const load = async (showRefresh = false) => {
    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const data = await myRequests();

      setRequests(data || []);
      setError("");
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          "Could not load your SOS history."
        )
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();

    const interval = setInterval(() => {
      load(true);
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const doCancel = async (id) => {
    setBusyId(id);
    setNotice("");
    setError("");

    try {
      await cancelSOS(id);

      setNotice(
        "SOS request cancelled successfully."
      );

      await load(true);
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          "Could not cancel this request."
        )
      );
    } finally {
      setBusyId(null);
    }
  };

  const totalCount = requests.length;

  const pendingCount = requests.filter(
    (request) =>
      request.status === "pending"
  ).length;

  const acceptedCount = requests.filter(
    (request) =>
      request.status === "accepted"
  ).length;

  const resolvedCount = requests.filter(
    (request) =>
      request.status === "resolved"
  ).length;

  const filteredRequests =
    requests.filter((request) => {
      const matchesFilter =
        filter === "all" ||
        request.status === filter;

      const hospitalName =
        request.assignedHospitalId?.name ||
        "";

      const responderName =
        request.responderName ||
        request.respondedBy?.name ||
        "";

      const organisation =
        request.responderOrganisation ||
        request.respondedBy?.orgName ||
        "";

      const searchText = [
        request.type,
        request.status,
        hospitalName,
        responderName,
        organisation,
        ...(request.targets || []),
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        searchText.includes(
          search.toLowerCase()
        );

      return (
        matchesFilter &&
        matchesSearch
      );
    });

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
            <h1>SOS History</h1>

            <p>
              Track every emergency alert,
              responder status and location.
            </p>
          </div>

          <button
            className="portal-btn ghost"
            onClick={() => load(true)}
            disabled={refreshing}
          >
            <RefreshCw
              size={15}
              className={
                refreshing
                  ? "sos-spin"
                  : ""
              }
            />

            {refreshing
              ? "Refreshing..."
              : "Refresh"}
          </button>
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

        {!loading && (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(180px, 1fr))",
                gap: 14,
                marginBottom: 20,
              }}
            >
              <div className="portal-panel">
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <div
                    className="icon-circle"
                    style={{ margin: 0 }}
                  >
                    <Activity size={19} />
                  </div>

                  <div>
                    <div
                      style={{
                        fontSize: 12,
                        color:
                          "var(--text-secondary)",
                      }}
                    >
                      Total Alerts
                    </div>

                    <strong
                      style={{
                        fontSize: 24,
                      }}
                    >
                      {totalCount}
                    </strong>
                  </div>
                </div>
              </div>

              <div className="portal-panel">
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <div
                    className="icon-circle"
                    style={{ margin: 0 }}
                  >
                    <AlertCircle size={19} />
                  </div>

                  <div>
                    <div
                      style={{
                        fontSize: 12,
                        color:
                          "var(--text-secondary)",
                      }}
                    >
                      Pending
                    </div>

                    <strong
                      style={{
                        fontSize: 24,
                      }}
                    >
                      {pendingCount}
                    </strong>
                  </div>
                </div>
              </div>

              <div className="portal-panel">
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <div
                    className="icon-circle"
                    style={{ margin: 0 }}
                  >
                    <CheckCircle size={19} />
                  </div>

                  <div>
                    <div
                      style={{
                        fontSize: 12,
                        color:
                          "var(--text-secondary)",
                      }}
                    >
                      Accepted
                    </div>

                    <strong
                      style={{
                        fontSize: 24,
                      }}
                    >
                      {acceptedCount}
                    </strong>
                  </div>
                </div>
              </div>

              <div className="portal-panel">
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <div
                    className="icon-circle"
                    style={{ margin: 0 }}
                  >
                    <CheckCircle size={19} />
                  </div>

                  <div>
                    <div
                      style={{
                        fontSize: 12,
                        color:
                          "var(--text-secondary)",
                      }}
                    >
                      Resolved
                    </div>

                    <strong
                      style={{
                        fontSize: 24,
                      }}
                    >
                      {resolvedCount}
                    </strong>
                  </div>
                </div>
              </div>
            </div>

            <div
              className="portal-panel"
              style={{
                marginBottom: 20,
              }}
            >
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  flexWrap: "wrap",
                  alignItems: "center",
                }}
              >
                <div
                  style={{
                    position: "relative",
                    flex: "1 1 260px",
                  }}
                >
                  <Search
                    size={16}
                    style={{
                      position: "absolute",
                      left: 12,
                      top: "50%",
                      transform:
                        "translateY(-50%)",
                      color:
                        "var(--text-secondary)",
                    }}
                  />

                  <input
                    type="text"
                    placeholder="Search SOS alerts..."
                    value={search}
                    onChange={(e) =>
                      setSearch(e.target.value)
                    }
                    style={{
                      width: "100%",
                      padding:
                        "11px 12px 11px 38px",
                      border:
                        "1px solid var(--border-color)",
                      borderRadius: 10,
                      background:
                        "var(--surface-color)",
                      color:
                        "var(--text-primary)",
                      outline: "none",
                    }}
                  />
                </div>

                {[
                  {
                    value: "all",
                    label: "All",
                  },
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
                    value: "cancelled",
                    label: "Cancelled",
                  },
                ].map((item) => (
                  <button
                    key={item.value}
                    className={`portal-btn ${
                      filter === item.value
                        ? "primary"
                        : "ghost"
                    }`}
                    onClick={() =>
                      setFilter(item.value)
                    }
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        <div className="portal-panel">
          {loading ? (
            <div className="portal-empty">
              <RefreshCw
                size={24}
                className="sos-spin"
              />

              <p>
                Loading your SOS history...
              </p>
            </div>
          ) : filteredRequests.length ===
            0 ? (
            <div className="portal-empty">
              <Siren size={38} />

              <h3>
                No SOS alerts found
              </h3>

              <p>
                {requests.length === 0
                  ? "You haven't sent any SOS alerts yet."
                  : "No alerts match your current search or filter."}
              </p>
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 16,
              }}
            >
              {filteredRequests.map(
                (request) => {
                  const hospital =
                    request.assignedHospitalId;

                  const responderName =
                    request.responderName ||
                    request.respondedBy?.name;

                  const responderOrganisation =
                    request.responderOrganisation ||
                    request.respondedBy?.orgName;

                  const responderPhone =
                    request.responderPhone;

                  const responderLocation =
                    request.responderLocation
                      ?.coordinates;

                  const isLive =
                    request.status ===
                      "pending" ||
                    request.status ===
                      "accepted";

                  const hasResponder =
                    request.status ===
                      "accepted" &&
                    (
                      responderName ||
                      responderOrganisation ||
                      responderLocation
                    );

                  return (
                    <div
                      key={request._id}
                      className="portal-panel"
                      style={{
                        margin: 0,
                        border:
                          isLive
                            ? "1px solid var(--accent)"
                            : undefined,
                      }}
                    >
                      <div
                        className="portal-head"
                        style={{
                          marginBottom: 14,
                        }}
                      >
                        <div>
                          <h1
                            style={{
                              fontSize: 17,
                              display: "flex",
                              alignItems:
                                "center",
                              gap: 8,
                              textTransform:
                                "capitalize",
                            }}
                          >
                            <Siren size={17} />

                            {request.type ||
                              "Emergency"}{" "}
                            SOS

                            {isLive && (
                              <span
                                style={{
                                  fontSize: 10,
                                  padding:
                                    "3px 7px",
                                  borderRadius:
                                    999,
                                  background:
                                    "var(--accent-soft-bg)",
                                  color:
                                    "var(--accent)",
                                }}
                              >
                                LIVE
                              </span>
                            )}
                          </h1>

                          <p>
                            {new Date(
                              request.createdAt
                            ).toLocaleString()}
                          </p>
                        </div>

                        <span
                          className={`portal-badge ${
                            STATUS_BADGE[
                              request.status
                            ]
                          }`}
                        >
                          {request.status}
                        </span>
                      </div>

                      <Timeline
                        status={
                          request.status
                        }
                      />

                      {request.targets?.length >
                        0 && (
                        <div
                          style={{
                            marginTop: 16,
                          }}
                        >
                          <div
                            style={{
                              fontSize: 12,
                              color:
                                "var(--text-secondary)",
                              marginBottom: 7,
                            }}
                          >
                            Services alerted
                          </div>

                          <div
                            style={{
                              display: "flex",
                              gap: 7,
                              flexWrap:
                                "wrap",
                            }}
                          >
                            {request.targets.map(
                              (service) => (
                                <span
                                  key={service}
                                  style={{
                                    display:
                                      "inline-flex",
                                    alignItems:
                                      "center",
                                    gap: 5,
                                    padding:
                                      "6px 9px",
                                    borderRadius:
                                      999,
                                    background:
                                      "var(--accent-soft-bg)",
                                    color:
                                      "var(--accent)",
                                    fontSize: 12,
                                    fontWeight: 600,
                                  }}
                                >
                                  <ServiceIcon
                                    service={
                                      service
                                    }
                                  />

                                  {serviceLabel(
                                    service
                                  )}
                                </span>
                              )
                            )}
                          </div>
                        </div>
                      )}

                      {request.medicalIdShared && (
                        <div
                          style={{
                            marginTop: 14,
                            display: "flex",
                            alignItems: "center",
                            gap: 7,
                            fontSize: 12,
                            color:
                              "var(--accent)",
                            fontWeight: 600,
                          }}
                        >
                          <HeartPulse
                            size={15}
                          />
                          Medical ID shared with
                          the responder
                        </div>
                      )}

                      {hospital && (
                        <div
                          style={{
                            marginTop: 16,
                            padding: 14,
                            borderRadius: 12,
                            background:
                              "var(--border-color-soft)",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems:
                                "center",
                              gap: 8,
                              marginBottom: 8,
                            }}
                          >
                            <Hospital
                              size={17}
                            />

                            <strong>
                              Assigned Hospital
                            </strong>
                          </div>

                          <div
                            style={{
                              fontSize: 14,
                              fontWeight: 600,
                            }}
                          >
                            {hospital.name}
                          </div>

                          {hospital.address && (
                            <div
                              style={{
                                marginTop: 4,
                                fontSize: 12,
                                color:
                                  "var(--text-secondary)",
                              }}
                            >
                              {hospital.address}
                            </div>
                          )}

                          {hospital.phone && (
                            <a
                              className="portal-btn ghost small"
                              href={`tel:${hospital.phone}`}
                              style={{
                                marginTop: 10,
                                display:
                                  "inline-flex",
                              }}
                            >
                              <Phone size={14} />
                              Call Hospital
                            </a>
                          )}
                        </div>
                      )}

                      {hasResponder && (
                        <div
                          style={{
                            marginTop: 16,
                            padding: 16,
                            borderRadius: 12,
                            border:
                              "1px solid var(--accent)",
                            background:
                              "var(--accent-soft-bg)",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems:
                                "center",
                              gap: 8,
                              marginBottom: 12,
                            }}
                          >
                            <UserCheck
                              size={18}
                            />

                            <strong>
                              Emergency Responder
                            </strong>
                          </div>

                          {responderName && (
                            <div
                              style={{
                                fontSize: 15,
                                fontWeight: 700,
                              }}
                            >
                              {responderName}
                            </div>
                          )}

                          {responderOrganisation && (
                            <div
                              style={{
                                marginTop: 4,
                                fontSize: 13,
                                color:
                                  "var(--text-secondary)",
                              }}
                            >
                              {responderOrganisation}
                            </div>
                          )}

                          {request.etaMinutes !=
                            null && (
                            <div
                              style={{
                                marginTop: 12,
                                display: "flex",
                                alignItems:
                                  "center",
                                gap: 7,
                                fontSize: 13,
                                fontWeight: 700,
                                color:
                                  "var(--accent)",
                              }}
                            >
                              <Clock
                                size={16}
                              />

                              ETA:{" "}
                              {
                                request.etaMinutes
                              }{" "}
                              minutes
                            </div>
                          )}

                          {request.estimatedArrivalAt && (
                            <div
                              style={{
                                marginTop: 7,
                                display: "flex",
                                alignItems:
                                  "center",
                                gap: 7,
                                fontSize: 12,
                                color:
                                  "var(--text-secondary)",
                              }}
                            >
                              <Clock
                                size={14}
                              />

                              Expected arrival:{" "}
                              {new Date(
                                request.estimatedArrivalAt
                              ).toLocaleTimeString(
                                [],
                                {
                                  hour: "2-digit",
                                  minute:
                                    "2-digit",
                                }
                              )}
                            </div>
                          )}

                          <div
                            style={{
                              marginTop: 14,
                              display: "flex",
                              gap: 8,
                              flexWrap:
                                "wrap",
                            }}
                          >
                            {responderLocation && (
                              <MapsLink
                                coordinates={
                                  responderLocation
                                }
                              />
                            )}

                            {responderPhone && (
                              <a
                                className="portal-btn ghost small"
                                href={`tel:${responderPhone}`}
                              >
                                <Phone
                                  size={14}
                                />
                                Call Responder
                              </a>
                            )}
                          </div>

                          {responderLocation && (
                            <div
                              style={{
                                marginTop: 10,
                                display: "flex",
                                alignItems:
                                  "center",
                                gap: 6,
                                fontSize: 11.5,
                                color:
                                  "var(--text-secondary)",
                              }}
                            >
                              <Navigation
                                size={13}
                              />

                              Responder location
                              available
                            </div>
                          )}
                        </div>
                      )}

                      <div
                        style={{
                          marginTop: 16,
                          display: "flex",
                          gap: 8,
                          flexWrap: "wrap",
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
                          <button
                            className="portal-btn danger small"
                            disabled={
                              busyId ===
                              request._id
                            }
                            onClick={() =>
                              doCancel(
                                request._id
                              )
                            }
                          >
                            <X size={13} />

                            {busyId ===
                            request._id
                              ? "Cancelling..."
                              : "Cancel Alert"}
                          </button>
                        )}
                      </div>

                      {request.status ===
                        "pending" && (
                        <div
                          style={{
                            marginTop: 12,
                            display: "flex",
                            alignItems:
                              "center",
                            gap: 6,
                            fontSize: 12,
                            color:
                              "var(--text-secondary)",
                          }}
                        >
                          <Clock
                            size={14}
                          />

                          Waiting for an
                          emergency responder
                          to accept your alert.
                        </div>
                      )}

                      {request.status ===
                        "accepted" && (
                        <div
                          style={{
                            marginTop: 12,
                            padding: 10,
                            borderRadius: 9,
                            background:
                              "var(--accent-soft-bg)",
                            color:
                              "var(--accent)",
                            fontSize: 13,
                            fontWeight: 600,
                          }}
                        >
                          ✓ Emergency responder
                          has accepted your SOS.
                          {request.etaMinutes !=
                            null &&
                            ` ETA: ${request.etaMinutes} minutes.`}
                        </div>
                      )}

                      {request.status ===
                        "resolved" && (
                        <div
                          style={{
                            marginTop: 12,
                            padding: 10,
                            borderRadius: 9,
                            background:
                              "var(--accent-soft-bg)",
                            color:
                              "var(--accent)",
                            fontSize: 13,
                            fontWeight: 600,
                          }}
                        >
                          ✓ This emergency
                          request has been
                          resolved.
                        </div>
                      )}
                    </div>
                  );
                }
              )}
            </div>
          )}
        </div>

        {!loading &&
          requests.length > 0 && (
            <div
              style={{
                marginTop: 14,
                textAlign: "center",
                fontSize: 11.5,
                color:
                  "var(--text-secondary)",
              }}
            >
              <Activity
                size={12}
                style={{
                  verticalAlign:
                    "middle",
                  marginRight: 4,
                }}
              />

              SOS status refreshes
              automatically every 10 seconds.
            </div>
          )}
      </div>

      <style>
        {`
          .sos-spin {
            animation: sosSpin 1s linear infinite;
          }

          @keyframes sosSpin {
            from {
              transform: rotate(0deg);
            }

            to {
              transform: rotate(360deg);
            }
          }
        `}
      </style>
    </div>
  );
}

export default SosHistory;