import { useEffect, useState } from "react";

import { useNavigate, useLocation } from "react-router-dom";

import {
  ArrowLeft,
  Plus,
  CheckCheck,
  Check,
  X,
} from "lucide-react";

import AppNavbar from "./AppNavbar";

import CoverageMap from "../components/CoverageMap";
import MapsLink from "../components/MapsLink";

import {
  listAlerts,
  listReports,
  createReport,
  updateReportStatus,
} from "../services/police";

import {
  acceptSOS,
  declineSOS,
  resolveSOS,
  updateResponderLocation,
} from "../services/sos";

import { connectSocket } from "../services/socket";

import { getErrorMessage } from "../services/api";

import "./Dashboard.css";
import "./portal.css";

const ALERT_BADGE = {
  pending: "pending",
  accepted: "hospital",
  resolved: "approved",
};

const REPORT_BADGE = {
  open: "pending",
  resolved: "approved",
};

function PoliceAlerts() {
  const navigate = useNavigate();
  const location = useLocation();

  const [tab, setTab] = useState(
    location.state?.tab || "alerts"
  );

  const [alerts, setAlerts] = useState([]);
  const [reports, setReports] = useState([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [busyId, setBusyId] = useState(null);
  const [filing, setFiling] = useState(false);

  const [form, setForm] = useState({
    title: "",
    description: "",
  });

  const load = async () => {
    setLoading(true);

    try {
      const [a, r] = await Promise.all([
        listAlerts(),
        listReports(),
      ]);

      setAlerts(a);
      setReports(r);
      setError("");
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          "Could not load data."
        )
      );
    } finally {
      setLoading(false);
    }
  };

  /*
   * Initial load + real-time SOS updates
   */
  useEffect(() => {
    (async () => {
      await load();
    })();

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

    socket.on(
      "sos:update",
      handleSOSUpdate
    );

    socket.on(
      "sos:new",
      handleNewSOS
    );

    return () => {
      socket.off(
        "sos:update",
        handleSOSUpdate
      );

      socket.off(
        "sos:new",
        handleNewSOS
      );
    };
  }, []);

  /*
   * NEW:
   * Automatically share Police responder
   * location for accepted SOS requests.
   */
  useEffect(() => {
    const acceptedAlerts = alerts.filter(
      (alert) =>
        alert.status === "accepted"
    );

    if (
      acceptedAlerts.length === 0 ||
      !navigator.geolocation
    ) {
      return;
    }

    const sendLocation = () => {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const {
            latitude,
            longitude,
          } = position.coords;

          for (const alert of acceptedAlerts) {
            try {
              await updateResponderLocation(
                alert._id,
                latitude,
                longitude
              );

              console.log(
                "Responder location updated:",
                latitude,
                longitude
              );
            } catch (err) {
              console.error(
                "Could not update responder location:",
                err
              );
            }
          }
        },
        (err) => {
          console.warn(
            "Responder location unavailable:",
            err.message
          );
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 5000,
        }
      );
    };

    /*
     * Send immediately.
     */
    sendLocation();

    /*
     * Then update every 10 seconds.
     */
    const intervalId =
      window.setInterval(
        sendLocation,
        10000
      );

    return () => {
      window.clearInterval(
        intervalId
      );
    };
  }, [alerts]);

  const submitReport = async (e) => {
    e.preventDefault();

    if (!form.title.trim()) {
      return setError(
        "Give the report a title."
      );
    }

    setFiling(true);
    setError("");

    try {
      await createReport(form);

      setForm({
        title: "",
        description: "",
      });

      setNotice(
        "Incident report filed."
      );

      await load();
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          "Could not file the report."
        )
      );
    } finally {
      setFiling(false);
    }
  };

  const resolveReport = async (id) => {
    setBusyId(id);

    try {
      await updateReportStatus(
        id,
        "resolved"
      );

      await load();
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          "Could not update the report."
        )
      );
    } finally {
      setBusyId(null);
    }
  };

  const actOnAlert = async (
    id,
    action
  ) => {
    setBusyId(id);
    setNotice("");
    setError("");

    try {
      if (action === "accept") {
        await acceptSOS(id);
      } else if (action === "decline") {
        await declineSOS(id);
      } else {
        await resolveSOS(id);
      }

      setNotice(
        `Alert marked as ${
          action === "accept"
            ? "accepted"
            : action
        }.`
      );

      await load();
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          "Could not update this alert."
        )
      );
    } finally {
      setBusyId(null);
    }
  };

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
            <h1>Police</h1>

            <p>
              Live SOS alerts and your
              filed incident reports.
            </p>
          </div>

          <div
            className="portal-toolbar"
            style={{ margin: 0 }}
          >
            <button
              className={`portal-btn ${
                tab === "alerts"
                  ? "primary"
                  : "ghost"
              }`}
              onClick={() =>
                setTab("alerts")
              }
            >
              Incoming alerts
            </button>

            <button
              className={`portal-btn ${
                tab === "reports"
                  ? "primary"
                  : "ghost"
              }`}
              onClick={() =>
                setTab("reports")
              }
            >
              Incident reports
            </button>

            <button
              className={`portal-btn ${
                tab === "map"
                  ? "primary"
                  : "ghost"
              }`}
              onClick={() =>
                setTab("map")
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

        {tab === "map" && (
          <div className="portal-panel">
            <CoverageMap
              alerts={alerts}
            />
          </div>
        )}

        {tab === "alerts" && (
          <div className="portal-panel">
            {loading ? (
              <div className="portal-empty">
                Loading alerts…
              </div>
            ) : alerts.length === 0 ? (
              <div className="portal-empty">
                No open alerts right now.
              </div>
            ) : (
              <div className="portal-table-wrap">
                <table className="portal-table">
                  <thead>
                    <tr>
                      <th>Citizen</th>
                      <th>Phone</th>
                      <th>Type</th>
                      <th>Status</th>
                      <th>Raised</th>
                      <th />
                    </tr>
                  </thead>

                  <tbody>
                    {alerts.map((a) => (
                      <tr key={a._id}>
                        <td>
                          {a.citizenId?.name ||
                            "Unknown"}
                        </td>

                        <td>
                          {a.citizenId?.phone ||
                            "—"}
                        </td>

                        <td>
                          {a.type}
                        </td>

                        <td>
                          <span
                            className={`portal-badge ${
                              ALERT_BADGE[
                                a.status
                              ]
                            }`}
                          >
                            {a.status}
                          </span>
                        </td>

                        <td>
                          {new Date(
                            a.createdAt
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
                                a.location
                                  ?.coordinates
                              }
                            />

                            {a.status ===
                              "pending" && (
                              <>
                                <button
                                  className="portal-btn primary small"
                                  disabled={
                                    busyId ===
                                    a._id
                                  }
                                  onClick={() =>
                                    actOnAlert(
                                      a._id,
                                      "accept"
                                    )
                                  }
                                >
                                  <Check
                                    size={14}
                                  />{" "}
                                  Accept
                                </button>

                                <button
                                  className="portal-btn danger small"
                                  disabled={
                                    busyId ===
                                    a._id
                                  }
                                  onClick={() =>
                                    actOnAlert(
                                      a._id,
                                      "decline"
                                    )
                                  }
                                >
                                  <X
                                    size={14}
                                  />{" "}
                                  Decline
                                </button>
                              </>
                            )}

                            {a.status ===
                              "accepted" && (
                              <button
                                className="portal-btn primary small"
                                disabled={
                                  busyId ===
                                  a._id
                                }
                                onClick={() =>
                                  actOnAlert(
                                    a._id,
                                    "resolve"
                                  )
                                }
                              >
                                <CheckCheck
                                  size={14}
                                />{" "}
                                Resolve
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {tab === "reports" && (
          <>
            <div
              className="portal-panel"
              style={{
                marginBottom: 20,
              }}
            >
              <form
                className="portal-form"
                onSubmit={submitReport}
              >
                <div className="portal-row">
                  <div className="portal-field">
                    <label htmlFor="title">
                      Report title
                    </label>

                    <input
                      id="title"
                      value={form.title}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          title:
                            e.target.value,
                        })
                      }
                      placeholder="e.g. Traffic accident on MG Road"
                    />
                  </div>
                </div>

                <div className="portal-field">
                  <label htmlFor="description">
                    Description
                  </label>

                  <textarea
                    id="description"
                    value={
                      form.description
                    }
                    onChange={(e) =>
                      setForm({
                        ...form,
                        description:
                          e.target.value,
                      })
                    }
                    placeholder="What happened, action taken…"
                  />
                </div>

                <div className="portal-form-actions">
                  <button
                    className="portal-btn primary"
                    type="submit"
                    disabled={filing}
                  >
                    <Plus size={16} />

                    {filing
                      ? "Filing…"
                      : "File report"}
                  </button>
                </div>
              </form>
            </div>

            <div className="portal-panel">
              {reports.length === 0 ? (
                <div className="portal-empty">
                  No incident reports
                  filed yet.
                </div>
              ) : (
                <div className="portal-table-wrap">
                  <table className="portal-table">
                    <thead>
                      <tr>
                        <th>Title</th>
                        <th>
                          Description
                        </th>
                        <th>Status</th>
                        <th>Filed</th>
                        <th />
                      </tr>
                    </thead>

                    <tbody>
                      {reports.map((r) => (
                        <tr key={r._id}>
                          <td>
                            {r.title}
                          </td>

                          <td>
                            {r.description ||
                              "—"}
                          </td>

                          <td>
                            <span
                              className={`portal-badge ${
                                REPORT_BADGE[
                                  r.status
                                ]
                              }`}
                            >
                              {r.status}
                            </span>
                          </td>

                          <td>
                            {new Date(
                              r.createdAt
                            ).toLocaleString()}
                          </td>

                          <td>
                            {r.status ===
                              "open" && (
                              <button
                                className="portal-btn primary small"
                                disabled={
                                  busyId ===
                                  r._id
                                }
                                onClick={() =>
                                  resolveReport(
                                    r._id
                                  )
                                }
                              >
                                <CheckCheck
                                  size={14}
                                />{" "}
                                Resolve
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default PoliceAlerts;