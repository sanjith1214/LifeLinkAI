
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Droplet,
  Phone,
  AlertCircle,
  Printer,
  Eye,
  FilePlus2,
  QrCode,
  ShieldAlert,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

import AppNavbar from "./AppNavbar";
import api from "../services/api";
import {
  listRecords,
  getAccessLog,
} from "../services/healthRecords";
import { getErrorMessage } from "../services/api";

import "./Dashboard.css";
import "./portal.css";

const VITALS = [
  {
    key: "heartRate",
    label: "Heart rate (bpm)",
    color: "#e5484d",
  },
  {
    key: "bloodSugar",
    label: "Blood sugar (mg/dL)",
    color: "#e5a72a",
  },
  {
    key: "weight",
    label: "Weight (kg)",
    color: "#2a9df4",
  },
];

function VitalChart({ label, color, points }) {
  if (points.length < 2) {
    return (
      <div className="portal-panel" style={{ marginBottom: 16 }}>
        <h3 style={{ marginTop: 0, fontSize: 14.5 }}>
          {label}
        </h3>

        <div className="portal-empty">
          Need at least 2 readings to draw a trend.
        </div>
      </div>
    );
  }

  return (
    <div className="portal-panel" style={{ marginBottom: 16 }}>
      <h3 style={{ marginTop: 0, fontSize: 14.5 }}>
        {label}
      </h3>

      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={points}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--border-color-soft)"
          />

          <XAxis
            dataKey="date"
            tick={{ fontSize: 11 }}
            stroke="var(--text-secondary)"
          />

          <YAxis
            tick={{ fontSize: 11 }}
            stroke="var(--text-secondary)"
            width={36}
          />

          <Tooltip
            contentStyle={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border-color)",
              fontSize: 12,
            }}
          />

          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            dot={{ r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function MedicalId() {
  const navigate = useNavigate();

  const [tab, setTab] = useState("id");
  const [profile, setProfile] = useState(null);
  const [records, setRecords] = useState([]);
  const [logEntries, setLogEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadMedicalData() {
      try {
        const [profileRes, recordsData, logData] =
          await Promise.all([
            api.get("/profile/me"),
            listRecords(),
            getAccessLog(),
          ]);

        if (!cancelled) {
          setProfile(profileRes.data);
          setRecords(recordsData);
          setLogEntries(logData);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            getErrorMessage(
              err,
              "Could not load your medical ID."
            )
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadMedicalData();

    return () => {
      cancelled = true;
    };
  }, []);

  const vitalPoints = (key) =>
    records
      .filter(
        (record) =>
          record[key] !== null &&
          record[key] !== undefined
      )
      .slice()
      .reverse()
      .map((record) => ({
        date: record.recordDate,
        value: record[key],
      }));

  // Create a readable plain-text QR payload, not JSON.
  const emergencyQrData = profile
    ? [
        "LIFELINKAI",
        "EMERGENCY MEDICAL CARD",
        "========================",
        "",
        `Name: ${profile.name || "Not provided"}`,
        `Phone: ${profile.phone || "Not provided"}`,
        `Age: ${profile.age || "Not provided"}`,
        `Blood Group: ${profile.bloodGroup || "Not set"}`,
        "",
        "ALLERGIES",
        "------------------------",
        ...(Array.isArray(profile.allergies) &&
        profile.allergies.length > 0
          ? profile.allergies.map(
              (allergy) => `- ${allergy}`
            )
          : ["- None recorded"]),
        "",
        "MEDICAL HISTORY",
        "------------------------",
        ...(Array.isArray(profile.medicalHistory) &&
        profile.medicalHistory.length > 0
          ? profile.medicalHistory.map(
              (item) => `- ${item}`
            )
          : ["- None recorded"]),
        "",
        "EMERGENCY CONTACTS",
        "------------------------",
        ...(Array.isArray(profile.emergencyContacts) &&
        profile.emergencyContacts.length > 0
          ? profile.emergencyContacts.map(
              (contact, index) =>
                `${index + 1}. ${contact.name || "Contact"}\n   Relationship: ${contact.relation || "Not specified"}\n   Phone: ${contact.phone || "Not provided"}`
            )
          : ["- No emergency contacts recorded"]),
        "",
        "IMPORTANT",
        "Verify this information with the patient or a healthcare professional.",
      ].join("\n")
    : "";

  return (
    <div className="portal-page">
      <AppNavbar showLogout />

      <div className="portal-content">
        <button
          className="portal-back"
          onClick={() => navigate("/dashboard")}
        >
          <ArrowLeft size={14} />
          Back to dashboard
        </button>

        <div className="portal-head">
          <div>
            <h1>Medical ID</h1>
            <p>
              Your emergency-ready summary, vitals trends,
              and who's accessed your records.
            </p>
          </div>

          <div
            className="portal-toolbar"
            style={{ margin: 0 }}
          >
            <button
              className={`portal-btn ${
                tab === "id" ? "primary" : "ghost"
              }`}
              onClick={() => setTab("id")}
            >
              ID card
            </button>

            <button
              className={`portal-btn ${
                tab === "vitals" ? "primary" : "ghost"
              }`}
              onClick={() => setTab("vitals")}
            >
              Vitals trends
            </button>

            <button
              className={`portal-btn ${
                tab === "log" ? "primary" : "ghost"
              }`}
              onClick={() => setTab("log")}
            >
              Access log
            </button>
          </div>
        </div>

        {error && (
          <div className="portal-message error">
            {error}
          </div>
        )}

        {loading ? (
          <div className="portal-empty">
            Loading medical information…
          </div>
        ) : (
          <>
            {/* MEDICAL ID */}
            {tab === "id" && profile && (
              <div
                className="portal-panel"
                id="medical-id-card"
              >
                <div
                  className="portal-head"
                  style={{ marginBottom: 16 }}
                >
                  <div>
                    <h1 style={{ fontSize: 20 }}>
                      {profile.name || "Medical ID"}
                    </h1>

                    <p>
                      {profile.phone || "No phone on file"}
                      {profile.age
                        ? ` · ${profile.age} yrs`
                        : ""}
                    </p>
                  </div>

                  <button
                    className="portal-btn ghost small"
                    onClick={() => window.print()}
                  >
                    <Printer size={14} />
                    Print
                  </button>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(200px, 1fr))",
                    gap: 16,
                  }}
                >
                  {/* BLOOD GROUP */}
                  <div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--text-secondary)",
                        marginBottom: 4,
                      }}
                    >
                      Blood group
                    </div>

                    <div
                      style={{
                        fontSize: 22,
                        fontWeight: 700,
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <Droplet size={18} />
                      {profile.bloodGroup || "Not set"}
                    </div>
                  </div>

                  {/* ALLERGIES */}
                  <div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--text-secondary)",
                        marginBottom: 4,
                      }}
                    >
                      Allergies
                    </div>

                    {profile.allergies?.length ? (
                      <div>
                        {profile.allergies.join(", ")}
                      </div>
                    ) : (
                      <div
                        style={{
                          color: "var(--text-secondary)",
                        }}
                      >
                        None on file
                      </div>
                    )}
                  </div>

                  {/* MEDICAL HISTORY */}
                  <div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--text-secondary)",
                        marginBottom: 4,
                      }}
                    >
                      Medical history
                    </div>

                    {profile.medicalHistory?.length ? (
                      <div>
                        {profile.medicalHistory.join(", ")}
                      </div>
                    ) : (
                      <div
                        style={{
                          color: "var(--text-secondary)",
                        }}
                      >
                        None on file
                      </div>
                    )}
                  </div>
                </div>

                {/* EMERGENCY CONTACTS */}
                <div style={{ marginTop: 20 }}>
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--text-secondary)",
                      marginBottom: 8,
                    }}
                  >
                    Emergency contacts
                  </div>

                  {profile.emergencyContacts?.length ? (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                      }}
                    >
                      {profile.emergencyContacts.map(
                        (contact, index) => (
                          <div
                            key={index}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                              fontSize: 13.5,
                            }}
                          >
                            <Phone size={13} />
                            {contact.name} (
                            {contact.relation || "contact"}) —{" "}
                            {contact.phone}
                          </div>
                        )
                      )}
                    </div>
                  ) : (
                    <div
                      className="portal-empty"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        justifyContent: "flex-start",
                      }}
                    >
                      <AlertCircle size={14} />
                      No emergency contacts added yet — add
                      some from My Profile.
                    </div>
                  )}
                </div>

                {/* EMERGENCY QR MEDICAL CARD */}
                <div
                  style={{
                    marginTop: 28,
                    padding: 20,
                    border: "1px solid var(--border-color)",
                    borderRadius: 16,
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 24,
                  }}
                >
                  <div style={{ flex: "1 1 240px" }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        marginBottom: 10,
                      }}
                    >
                      <QrCode size={22} />

                      <h2
                        style={{
                          margin: 0,
                          fontSize: 19,
                        }}
                      >
                        Emergency QR Medical Card
                      </h2>
                    </div>

                    <p
                      style={{
                        color: "var(--text-secondary)",
                        fontSize: 13,
                        lineHeight: 1.7,
                      }}
                    >
                      Scan this QR code with a phone camera
                      to read the emergency summary as plain
                      text.
                    </p>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 8,
                        fontSize: 12,
                        lineHeight: 1.6,
                        color: "var(--text-secondary)",
                      }}
                    >
                      <ShieldAlert
                        size={17}
                        style={{ flexShrink: 0 }}
                      />

                      <span>
                        Privacy notice: anyone who scans this
                        code can read the encoded information.
                        Only share or print it if you are
                        comfortable with that.
                      </span>
                    </div>

                    <button
                      className="portal-btn ghost small"
                      style={{ marginTop: 16 }}
                      onClick={() => window.print()}
                    >
                      <Printer size={14} />
                      Print medical card
                    </button>
                  </div>

                  <div
                    style={{
                      background: "#ffffff",
                      padding: 16,
                      borderRadius: 12,
                      textAlign: "center",
                      flexShrink: 0,
                    }}
                  >
                    {emergencyQrData && (
                      <QRCodeSVG
                        value={emergencyQrData}
                        size={180}
                        level="M"
                        includeMargin
                        title="LifeLinkAI emergency medical information"
                      />
                    )}

                    <div
                      style={{
                        color: "#222222",
                        fontSize: 12,
                        marginTop: 8,
                        fontWeight: 700,
                      }}
                    >
                      LifeLinkAI
                    </div>

                    <div
                      style={{
                        color: "#555555",
                        fontSize: 10,
                        marginTop: 3,
                      }}
                    >
                      Emergency Medical Card
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* VITALS TRENDS */}
            {tab === "vitals" && (
              <>
                {VITALS.map(
                  ({ key, label, color }) => (
                    <VitalChart
                      key={key}
                      label={label}
                      color={color}
                      points={vitalPoints(key)}
                    />
                  )
                )}
              </>
            )}

            {/* ACCESS LOG */}
            {tab === "log" && (
              <div className="portal-panel">
                {logEntries.length === 0 ? (
                  <div className="portal-empty">
                    No hospital has viewed or added to your
                    records yet.
                  </div>
                ) : (
                  <div className="portal-table-wrap">
                    <table className="portal-table">
                      <thead>
                        <tr>
                          <th>Hospital</th>
                          <th>Action</th>
                          <th>When</th>
                        </tr>
                      </thead>

                      <tbody>
                        {logEntries.map((entry) => (
                          <tr key={entry._id}>
                            <td>
                              {entry.hospitalId?.orgName ||
                                entry.hospitalId?.name ||
                                "Unknown"}
                            </td>

                            <td
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                              }}
                            >
                              {entry.action === "viewed" ? (
                                <Eye size={13} />
                              ) : (
                                <FilePlus2 size={13} />
                              )}

                              {entry.action === "viewed"
                                ? "Viewed your file"
                                : "Added a report"}
                            </td>

                            <td>
                              {new Date(
                                entry.createdAt
                              ).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default MedicalId;
