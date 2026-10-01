import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  User,
  Hospital,
  Droplet,
  Bot,
  FileHeart,
  Siren,
  ShieldCheck,
  Map,
  ClipboardList,
  BedDouble,
  Ambulance,
  Truck,
  Package,
  Clock,
  Inbox,
  Users,
  History,
  HeartPulse,
  Building2,
} from "lucide-react";

import api, { getErrorMessage } from "../services/api";

import {
  getUser,
  resendVerification,
} from "../services/auth";

import {
  roleLabel,
  refreshCurrentUser,
} from "../services/admin";

import {
  listActiveAnnouncements,
} from "../services/announcements";

import AppNavbar from "./AppNavbar";
import SOSRealtime from "../components/SOSRealtime";

import "./Dashboard.css";
import "./portal.css";

const FEATURES = {
  civilian: [
    {
      icon: History,
      title: "SOS History",
      desc: "Every alert you've sent, with live status and the option to cancel.",
      path: "/sos-history",
    },
    {
      icon: FileHeart,
      title: "Health Records",
      desc: "Your medical reports, vitals and documents in one place.",
      path: "/health-records",
    },
    {
      icon: HeartPulse,
      title: "Medical ID",
      desc: "Emergency-ready summary, vitals trends, and who's viewed your records.",
      path: "/medical-id",
    },
    {
      icon: User,
      title: "My Profile",
      desc: "Blood group, medical history, allergies, and emergency contacts.",
      path: "/profile",
    },
    {
      icon: Hospital,
      title: "Find Hospitals",
      desc: "Search nearby hospitals with bed and ambulance availability.",
      path: "/find-hospitals",
    },
    {
      icon: ShieldCheck,
      title: "Role & Account",
      desc: "Switch to civilian, hospital, police, fire station or pharmacy.",
      path: "/settings/role",
    },
    {
      icon: Droplet,
      title: "Blood Donation",
      desc: "Find or offer blood donations by blood group, nearby.",
      path: "/blood-donation",
    },
    {
      icon: Package,
      title: "Find Pharmacies",
      desc: "Check medicine stock nearby and request what you need.",
      path: "/find-pharmacies",
    },
    {
      icon: Bot,
      title: "AI First-Aid Assistant",
      desc: "Get quick first-aid guidance while help is on the way. Open it from the chat button in the bottom-right corner.",
      note: "Live now",
    },
  ],

  police: [
    {
      icon: Siren,
      title: "Incoming Alerts",
      desc: "Live SOS alerts raised in your coverage area.",
      path: "/police/alerts",
      tab: "alerts",
    },
    {
      icon: Map,
      title: "Coverage Map",
      desc: "See active incidents plotted across your jurisdiction.",
      path: "/police/alerts",
      tab: "map",
    },
    {
      icon: ClipboardList,
      title: "Incident Reports",
      desc: "File and review reports for responded incidents.",
      path: "/police/alerts",
      tab: "reports",
    },
    {
      icon: Building2,
      title: "Organisation Profile",
      desc: "Logo, hours, service radius, and staff accounts.",
      path: "/org-profile",
    },
    {
      icon: ShieldCheck,
      title: "Role & Account",
      desc: "Switch to civilian or request another organisation role.",
      path: "/settings/role",
    },
  ],

  hospital: [
    {
      icon: Users,
      title: "Patient Records",
      desc: "Look up a patient by phone and file medical reports.",
      path: "/hospital/patients",
    },
    {
      icon: Ambulance,
      title: "Incoming Patients",
      desc: "Patients heading your way from SOS alerts.",
      path: "/hospital/incoming",
    },
    {
      icon: BedDouble,
      title: "Bed Availability",
      desc: "Keep your bed and ambulance counts up to date.",
      path: "/hospital/beds",
    },
    {
      icon: Building2,
      title: "Organisation Profile",
      desc: "Logo, hours, service radius, and staff accounts.",
      path: "/org-profile",
    },
    {
      icon: ShieldCheck,
      title: "Role & Account",
      desc: "Switch to civilian or request another organisation role.",
      path: "/settings/role",
    },
  ],

  firestation: [
    {
      icon: Siren,
      title: "Active Calls",
      desc: "Fire and rescue calls assigned to your station.",
      path: "/firestation/alerts",
      tab: "alerts",
    },
    {
      icon: Truck,
      title: "Fleet Status",
      desc: "Track which engines and crews are available.",
      path: "/firestation/alerts",
      tab: "fleet",
    },
    {
      icon: Map,
      title: "Coverage Map",
      desc: "Live view of incidents across your coverage area.",
      path: "/firestation/alerts",
      tab: "map",
    },
    {
      icon: Building2,
      title: "Organisation Profile",
      desc: "Logo, hours, service radius, and staff accounts.",
      path: "/org-profile",
    },
    {
      icon: ShieldCheck,
      title: "Role & Account",
      desc: "Switch to civilian or request another organisation role.",
      path: "/settings/role",
    },
  ],

  pharmacy: [
    {
      icon: Package,
      title: "Stock Status",
      desc: "Publish which critical medicines you have in stock.",
      path: "/pharmacy/stock",
      tab: "stock",
    },
    {
      icon: Clock,
      title: "Hours & Availability",
      desc: "Let people know when you are open.",
      path: "/pharmacy/stock",
      tab: "stock",
    },
    {
      icon: Inbox,
      title: "Requests",
      desc: "Incoming medicine requests from nearby users.",
      path: "/pharmacy/stock",
      tab: "requests",
    },
    {
      icon: Building2,
      title: "Organisation Profile",
      desc: "Logo, service radius, and staff accounts.",
      path: "/org-profile",
    },
    {
      icon: ShieldCheck,
      title: "Role & Account",
      desc: "Switch to civilian or request another organisation role.",
      path: "/settings/role",
    },
  ],

  admin: [
    {
      icon: ShieldCheck,
      title: "Admin Console",
      desc: "Approve or reject organisation account requests.",
      path: "/admin",
    },
    {
      icon: Users,
      title: "All Accounts",
      desc: "Browse every account registered on LifeLink.",
      path: "/admin",
    },
    {
      icon: ShieldCheck,
      title: "Role & Account",
      desc: "Manage your account role and access settings.",
      path: "/settings/role",
    },
  ],
};

const normaliseRole = (role) =>
  role === "citizen" || !role
    ? "civilian"
    : role;

function Dashboard() {
  const navigate = useNavigate();

  const [user, setUser] = useState(
    () => getUser() || {}
  );

  const role = normaliseRole(user.role);
  const status = user.roleStatus || "approved";

  const [sosLoading, setSosLoading] =
    useState(false);

  const [sosResult, setSosResult] =
    useState(null);

  const [sosError, setSosError] =
    useState("");

  const [sosTargets, setSosTargets] =
    useState([
      "hospital",
      "police",
      "firestation",
    ]);

  const [sosType, setSosType] =
    useState("medical");

  const [sosNote, setSosNote] =
    useState("");

  const [medicalIdShared, setMedicalIdShared] =
    useState(false);

  const [verifySending, setVerifySending] =
    useState(false);

  const [verifyNotice, setVerifyNotice] =
    useState("");

  const [announcements, setAnnouncements] =
    useState([]);

  const [sosRealtimeNotice, setSosRealtimeNotice] =
    useState(null);

  const handleSOSRealtimeNotification = (
    notification
  ) => {
    setSosRealtimeNotice(notification);

    window.setTimeout(() => {
      setSosRealtimeNotice(null);
    }, 6000);
  };

  useEffect(() => {
    (async () => {
      const data =
        await listActiveAnnouncements().catch(
          () => []
        );

      setAnnouncements(data);
    })();

    (async () => {
      const fresh =
        await refreshCurrentUser().catch(
          () => null
        );

      if (fresh) {
        setUser(fresh);
      }
    })();
  }, []);

  const handleResendVerification = async () => {
    setVerifySending(true);
    setVerifyNotice("");

    try {
      const data =
        await resendVerification();

      setVerifyNotice(
        data.verifyUrl
          ? `Verification link: ${data.verifyUrl}`
          : "Verification email sent — check your inbox."
      );
    } catch (err) {
      setVerifyNotice(
        getErrorMessage(
          err,
          "Could not send verification email."
        )
      );
    } finally {
      setVerifySending(false);
    }
  };

  const toggleTarget = (target) => {
    setSosTargets((prev) =>
      prev.includes(target)
        ? prev.filter(
            (item) => item !== target
          )
        : [...prev, target]
    );
  };

  const handleSOS = () => {
    setSosError("");
    setSosResult(null);

    if (sosTargets.length === 0) {
      setSosError(
        "Choose at least one service to alert."
      );
      return;
    }

    if (!navigator.geolocation) {
      setSosError(
        "Location is not supported on this device/browser."
      );
      return;
    }

    setSosLoading(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const {
            latitude,
            longitude,
          } = position.coords;

          const res = await api.post(
            "/sos",
            {
              latitude,
              longitude,
              type: sosType,
              targets: sosTargets,
              emergencyNote:
                sosNote.trim(),
              medicalIdShared,
            }
          );

          setSosResult(res.data);
        } catch (err) {
          setSosError(
            err.response?.data?.message ||
              "Failed to send SOS. Please try again."
          );
        } finally {
          setSosLoading(false);
        }
      },
      () => {
        setSosError(
          "Location access denied. Please allow location to use SOS."
        );

        setSosLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000,
      }
    );
  };

  const cards =
    FEATURES[role] || FEATURES.civilian;

  const isPending =
    status === "pending";

  const isRejected =
    status === "rejected";

  return (
    <div className="dash-wrapper">
      <AppNavbar showLogout />

      {/* Real-time SOS listener */}
      <SOSRealtime
        onNotification={
          handleSOSRealtimeNotification
        }
      />

      {/* Real-time SOS notification */}
      {sosRealtimeNotice && (
        <div
          className="portal-message success"
          style={{
            position: "fixed",
            top: 80,
            right: 24,
            zIndex: 9999,
            maxWidth: 380,
            boxShadow:
              "0 10px 30px rgba(0,0,0,0.15)",
          }}
        >
          <strong>
            {sosRealtimeNotice.title}
          </strong>

          <div
            style={{
              marginTop: 4,
            }}
          >
            {sosRealtimeNotice.message}
          </div>
        </div>
      )}

      <div className="dash-content">

        {/* Welcome */}
        <div className="dash-welcome">
          <h1>
            Welcome back,{" "}
            {user.name || "there"}
          </h1>

          <p>
            {user.orgName
              ? `${user.orgName} · `
              : ""}
            {roleLabel(user.role)} account
          </p>
        </div>
                {/* Announcements */}
        {announcements.map((a) => (
          <div
            key={a._id}
            className="portal-message success"
            style={{
              marginBottom: 16,
            }}
          >
            📢 {a.message}
          </div>
        ))}

        {/* Pending / Rejected role */}
        {(isPending || isRejected) && (
          <div
            className="portal-panel"
            style={{
              marginBottom: 24,
            }}
          >
            <div
              className="portal-message error"
              style={{
                marginBottom: 16,
              }}
            >
              {isPending
                ? `Your ${roleLabel(
                    user.role
                  ).toLowerCase()} account is waiting for admin approval. You'll get access to these features once it's approved — check back here any time.`
                : "Your organisation request was rejected."}
            </div>

            <button
              className="portal-btn primary"
              onClick={() =>
                navigate("/settings/role")
              }
            >
              {isPending
                ? "View request / switch to a different role"
                : "Request a different role"}
            </button>
          </div>
        )}

        {/* Email verification */}
        {!user.emailVerified && (
          <div
            className="portal-message error"
            style={{
              marginBottom: 24,
            }}
          >
            Please verify your email address.{" "}

            <button
              className="portal-back"
              style={{
                margin: 0,
              }}
              onClick={
                handleResendVerification
              }
              disabled={verifySending}
            >
              {verifySending
                ? "Sending…"
                : "Resend verification email"}
            </button>

            {verifyNotice && (
              <div
                style={{
                  marginTop: 8,
                  wordBreak: "break-all",
                }}
              >
                {verifyNotice}
              </div>
            )}
          </div>
        )}

        {/* Civilian SOS */}
        {role === "civilian" && (
          <div className="sos-card">
            <div className="sos-text">
              <h2>
                In an emergency?
              </h2>

              <p>
                Choose who to alert,
                describe the emergency,
                and send your live location.
              </p>

              {/* SOS targets */}
              <div className="sos-targets">
                {[
                  {
                    value: "hospital",
                    label: "Hospital",
                  },
                  {
                    value: "police",
                    label: "Police",
                  },
                  {
                    value: "firestation",
                    label: "Fire Station",
                  },
                ].map((target) => (
                  <label
                    key={target.value}
                    className="sos-target-option"
                  >
                    <input
                      type="checkbox"
                      checked={sosTargets.includes(
                        target.value
                      )}
                      onChange={() =>
                        toggleTarget(
                          target.value
                        )
                      }
                    />

                    {target.label}
                  </label>
                ))}
              </div>

              <div
                style={{
                  display: "grid",
                  gap: 14,
                  marginTop: 16,
                }}
              >
                {/* Emergency type */}
                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: 6,
                      fontWeight: 600,
                    }}
                  >
                    Emergency type
                  </label>

                  <select
                    value={sosType}
                    onChange={(event) =>
                      setSosType(
                        event.target.value
                      )
                    }
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: 8,
                      border:
                        "1px solid var(--border-color)",
                      background:
                        "var(--card-bg, white)",
                    }}
                  >
                    <option value="medical">
                      Medical Emergency
                    </option>

                    <option value="accident">
                      Accident
                    </option>

                    <option value="fire">
                      Fire
                    </option>

                    <option value="crime">
                      Crime
                    </option>

                    <option value="other">
                      Other
                    </option>
                  </select>
                </div>

                {/* Emergency note */}
                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: 6,
                      fontWeight: 600,
                    }}
                  >
                    Emergency note
                  </label>

                  <textarea
                    value={sosNote}
                    onChange={(event) =>
                      setSosNote(
                        event.target.value
                      )
                    }
                    placeholder="Briefly describe what happened..."
                    rows={3}
                    maxLength={500}
                    style={{
                      width: "100%",
                      resize: "vertical",
                      padding: "10px 12px",
                      borderRadius: 8,
                      border:
                        "1px solid var(--border-color)",
                      boxSizing:
                        "border-box",
                      fontFamily: "inherit",
                    }}
                  />

                  <div
                    style={{
                      fontSize: 12,
                      marginTop: 4,
                      opacity: 0.65,
                    }}
                  >
                    {sosNote.length}/500
                  </div>
                </div>

                {/* Medical ID */}
                <label
                  className="sos-target-option"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={medicalIdShared}
                    onChange={(event) =>
                      setMedicalIdShared(
                        event.target.checked
                      )
                    }
                  />

                  Share my Medical ID
                  with responders
                </label>
              </div>

              {/* SOS success */}
              {sosResult && (
                <div className="sos-status success">
                  <strong>
                    SOS sent successfully.
                  </strong>

                  <div
                    style={{
                      marginTop: 6,
                    }}
                  >
                    Type: {sosType}

                    {sosTargets.length > 0 && (
                      <>
                        <br />
                        Services alerted:{" "}
                        {sosTargets.join(", ")}
                      </>
                    )}

                    {medicalIdShared && (
                      <>
                        <br />
                        Medical ID shared
                      </>
                    )}
                  </div>

                  {sosTargets.includes(
                    "hospital"
                  ) && (
                    <div
                      style={{
                        marginTop: 6,
                      }}
                    >
                      Nearest hospital:{" "}
                      {sosResult
                        .nearestHospital
                        ?.name ||
                        "None found, but your alert was recorded."}
                    </div>
                  )}
                </div>
              )}

              {/* SOS error */}
              {sosError && (
                <div className="sos-status error">
                  {sosError}
                </div>
              )}
            </div>

            {/* SOS button */}
            <button
              className="sos-button"
              onClick={handleSOS}
              disabled={sosLoading}
            >
              <Siren size={22} />

              {sosLoading
                ? "Sending..."
                : "SOS"}
            </button>
          </div>
        )}
                {/* Feature cards */}
        {!isPending && !isRejected && (
          <div className="dash-grid">
            {cards.map(
              ({
                icon: Icon,
                title,
                desc,
                path,
                note,
                tab,
              }) => (
                <div
                  className="dash-card"
                  key={title}
                  style={
                    path
                      ? {
                          cursor: "pointer",
                        }
                      : undefined
                  }
                  onClick={
                    path
                      ? () =>
                          navigate(
                            path,
                            tab
                              ? {
                                  state: {
                                    tab,
                                  },
                                }
                              : undefined
                          )
                      : undefined
                  }
                >
                  <div className="icon-circle">
                    <Icon size={19} />
                  </div>

                  <h3>{title}</h3>

                  <p>{desc}</p>

                  {!path && !note && (
                    <span className="badge-soon">
                      Coming soon
                    </span>
                  )}

                  {note && (
                    <span className="badge-live">
                      {note}
                    </span>
                  )}
                </div>
              )
            )}
          </div>
        )}
              </div>
    </div>
  );
}

export default Dashboard;