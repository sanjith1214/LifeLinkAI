import { useEffect, useState } from "react";
import {
  Phone,
  Check,
  X,
  MessageCircle,
  RefreshCw,
} from "lucide-react";

import {
  createBloodRequest,
  getNearbyBloodRequests,
  getMyBloodRequests,
  respondToBloodRequest,
  updateBloodRequestResponse,
  cancelBloodRequest,
  fulfillBloodRequest,
} from "../services/bloodRequests";

import BloodChat from "./BloodChat";

function BloodRequestPanel() {
  const [activeTab, setActiveTab] = useState("find");

  const [bloodGroup, setBloodGroup] = useState("O+");
  const [unitsRequired, setUnitsRequired] = useState(1);
  const [urgency, setUrgency] = useState("urgent");
  const [hospitalName, setHospitalName] = useState("");
  const [hospitalPhone, setHospitalPhone] = useState("");
  const [message, setMessage] = useState("");

  const [requests, setRequests] = useState([]);
  const [myRequests, setMyRequests] = useState([]);

  const [chatOpen, setChatOpen] = useState(false);
  const [chatRequestId, setChatRequestId] = useState("");
  const [chatDonorName, setChatDonorName] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const getLocation = () =>
    new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(
          new Error(
            "Location is not supported by your browser."
          )
        );
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        () => {
          reject(
            new Error(
              "Location permission is required for nearby blood matching."
            )
          );
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    });

  const loadNearbyRequests = async () => {
    try {
      setLoading(true);
      setError("");

      const location = await getLocation();

      const data = await getNearbyBloodRequests(
        location.latitude,
        location.longitude
      );

      setRequests(data.requests || []);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Unable to load nearby blood requests."
      );
    } finally {
      setLoading(false);
    }
  };

  const loadMyRequests = async () => {
    try {
      setLoading(true);
      setError("");

      const data = await getMyBloodRequests();

      setMyRequests(data.requests || []);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to load your blood requests."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNearbyRequests();
  }, []);

  const handleCreateRequest = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);
      setError("");
      setSuccess("");

      const location = await getLocation();

      await createBloodRequest({
        bloodGroup,
        unitsRequired: Number(unitsRequired),
        urgency,
        hospitalName,
        hospitalPhone,
        message,
        latitude: location.latitude,
        longitude: location.longitude,
      });

      setSuccess(
        "Emergency blood request created successfully."
      );

      setHospitalName("");
      setHospitalPhone("");
      setMessage("");
      setUnitsRequired(1);

      await loadMyRequests();

      setActiveTab("mine");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Unable to create blood request."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRespond = async (requestId) => {
    try {
      setLoading(true);
      setError("");
      setSuccess("");

      await respondToBloodRequest(requestId);

      setSuccess(
        "Your donor response has been sent to the requester."
      );

      await loadNearbyRequests();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to respond to this request."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateResponse = async (
    requestId,
    donorId,
    status
  ) => {
    try {
      setLoading(true);
      setError("");
      setSuccess("");

      await updateBloodRequestResponse(
        requestId,
        donorId,
        status
      );

      if (status === "accepted") {
        setSuccess(
          "Donor accepted. You can now contact the donor."
        );
      } else {
        setSuccess("Donor response declined.");
      }

      await loadMyRequests();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to update donor response."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (requestId) => {
    try {
      setLoading(true);
      setError("");
      setSuccess("");

      await cancelBloodRequest(requestId);

      setSuccess("Blood request cancelled.");

      await loadMyRequests();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to cancel this request."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleFulfill = async (requestId) => {
    try {
      setLoading(true);
      setError("");
      setSuccess("");

      await fulfillBloodRequest(requestId);

      setSuccess(
        "Blood request marked as fulfilled."
      );

      await loadMyRequests();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to update this request."
      );
    } finally {
      setLoading(false);
    }
  };

  const openChat = (requestId, donorName) => {
    setChatRequestId(requestId);
    setChatDonorName(
      donorName || "Blood Donor"
    );
    setChatOpen(true);
  };

  const closeChat = () => {
    setChatOpen(false);
    setChatRequestId("");
    setChatDonorName("");
  };

  const getResponseStatusClass = (status) => {
    if (status === "accepted") {
      return "accepted";
    }

    if (status === "declined") {
      return "declined";
    }

    return "pending";
  };

  const getResponseStatusText = (status) => {
    if (status === "accepted") {
      return "Accepted";
    }

    if (status === "declined") {
      return "Declined";
    }

    return "Waiting for approval";
  };

  return (
    <section className="blood-request-panel">

      <div className="blood-request-header">
        <div>
          <span className="blood-request-label">
            EMERGENCY BLOOD NETWORK
          </span>

          <h2>Find or Request Blood</h2>

          <p>
            Connect nearby compatible blood donors during an
            emergency.
          </p>
        </div>

        <div className="blood-request-icon">
          🩸
        </div>
      </div>

      <div className="blood-request-tabs">

        <button
          className={
            activeTab === "find"
              ? "active"
              : ""
          }
          onClick={() => {
            setActiveTab("find");
            setError("");
            setSuccess("");
            loadNearbyRequests();
          }}
        >
          Find Blood
        </button>

        <button
          className={
            activeTab === "request"
              ? "active"
              : ""
          }
          onClick={() => {
            setActiveTab("request");
            setError("");
            setSuccess("");
          }}
        >
          Request Blood
        </button>

        <button
          className={
            activeTab === "mine"
              ? "active"
              : ""
          }
          onClick={() => {
            setActiveTab("mine");
            setError("");
            setSuccess("");
            loadMyRequests();
          }}
        >
          My Requests
        </button>

      </div>

      {error && (
        <div className="blood-request-message error">
          {error}
        </div>
      )}

      {success && (
        <div className="blood-request-message success">
          {success}
        </div>
      )}

      {activeTab === "find" && (
        <div className="blood-request-content">

          <div className="blood-request-section-title">

            <div>
              <h3>Nearby Blood Requests</h3>

              <p>
                Showing compatible emergency requests within
                10 km.
              </p>
            </div>

            <button
              className="refresh-blood-button"
              onClick={loadNearbyRequests}
              disabled={loading}
            >
              <RefreshCw size={15} />

              {loading
                ? "Loading..."
                : "Refresh"}
            </button>

          </div>

          {loading &&
          requests.length === 0 ? (

            <div className="blood-empty">

              <span>🩸</span>

              <h3>
                Finding nearby requests...
              </h3>

              <p>
                Searching for compatible emergency blood
                requests.
              </p>

            </div>

          ) : requests.length === 0 ? (

            <div className="blood-empty">

              <span>🩸</span>

              <h3>
                No nearby requests
              </h3>

              <p>
                There are currently no compatible blood
                requests within 10 km.
              </p>

            </div>

          ) : (

            <div className="blood-request-grid">

              {requests.map((request) => (

                <div
                  className="blood-request-card"
                  key={request._id}
                >

                  <div className="blood-card-top">

                    <div className="blood-group-badge">
                      {request.bloodGroup}
                    </div>

                    <span
                      className={`urgency-badge ${request.urgency}`}
                    >
                      {request.urgency}
                    </span>

                  </div>

                  <h3>
                    {request.hospitalName}
                  </h3>

                  <p className="blood-card-distance">
                    📍 {request.distanceKm} km away
                  </p>

                  <div className="blood-card-info">

                    <span>
                      <strong>
                        {request.unitsRequired}
                      </strong>{" "}
                      unit(s) required
                    </span>

                    <span>
                      Requested by{" "}
                      {request.requester?.name ||
                        "User"}
                    </span>

                  </div>

                  {request.message && (
                    <p className="blood-card-message">
                      {request.message}
                    </p>
                  )}

                  <div className="blood-card-actions">

                    <button
                      className="respond-blood-button"
                      onClick={() =>
                        handleRespond(
                          request._id
                        )
                      }
                      disabled={loading}
                    >
                      I Can Donate
                    </button>

                    {request.hospitalPhone && (
                      <a
                        className="call-blood-button"
                        href={`tel:${request.hospitalPhone}`}
                      >
                        <Phone size={15} />
                        Call Hospital
                      </a>
                    )}

                  </div>

                </div>

              ))}

            </div>

          )}

        </div>
      )}

      {activeTab === "request" && (

        <form
          className="blood-request-form"
          onSubmit={handleCreateRequest}
        >

          <div className="form-row">

            <div className="form-field">

              <label>
                Required Blood Group
              </label>

              <select
                value={bloodGroup}
                onChange={(e) =>
                  setBloodGroup(
                    e.target.value
                  )
                }
              >
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
              </select>

            </div>

            <div className="form-field">

              <label>
                Units Required
              </label>

              <input
                type="number"
                min="1"
                max="20"
                value={unitsRequired}
                onChange={(e) =>
                  setUnitsRequired(
                    e.target.value
                  )
                }
              />

            </div>

          </div>

          <div className="form-row">

            <div className="form-field">

              <label>
                Urgency
              </label>

              <select
                value={urgency}
                onChange={(e) =>
                  setUrgency(
                    e.target.value
                  )
                }
              >
                <option value="critical">
                  Critical
                </option>

                <option value="urgent">
                  Urgent
                </option>

                <option value="normal">
                  Normal
                </option>
              </select>

            </div>

            <div className="form-field">

              <label>
                Hospital Phone
              </label>

              <input
                type="tel"
                placeholder="Hospital contact number"
                value={hospitalPhone}
                onChange={(e) =>
                  setHospitalPhone(
                    e.target.value
                  )
                }
              />

            </div>

          </div>

          <div className="form-field">

            <label>
              Hospital Name
            </label>

            <input
              type="text"
              placeholder="Enter hospital name"
              value={hospitalName}
              onChange={(e) =>
                setHospitalName(
                  e.target.value
                )
              }
              required
            />

          </div>

          <div className="form-field">

            <label>
              Additional Message
            </label>

            <textarea
              placeholder="Add emergency details..."
              value={message}
              onChange={(e) =>
                setMessage(
                  e.target.value
                )
              }
              rows="4"
            />

          </div>

          <div className="location-note">
            📍 Your current location will be used for
            nearby blood matching.
          </div>

          <button
            className="create-blood-button"
            type="submit"
            disabled={loading}
          >
            {loading
              ? "Creating Request..."
              : "Create Emergency Blood Request"}
          </button>

        </form>

      )}

      {activeTab === "mine" && (

        <div className="blood-request-content">

          <div className="blood-request-section-title">

            <div>

              <h3>
                My Blood Requests
              </h3>

              <p>
                Track your active and completed requests.
              </p>

            </div>

            <button
              className="refresh-blood-button"
              onClick={loadMyRequests}
              disabled={loading}
            >
              <RefreshCw size={15} />

              {loading
                ? "Loading..."
                : "Refresh"}
            </button>

          </div>

          {myRequests.length === 0 ? (

            <div className="blood-empty">

              <span>📋</span>

              <h3>
                No requests yet
              </h3>

              <p>
                Your emergency blood requests will appear
                here.
              </p>

            </div>

          ) : (

            <div className="blood-request-grid">

              {myRequests.map((request) => (

                <div
                  className="blood-request-card"
                  key={request._id}
                >

                  <div className="blood-card-top">

                    <div className="blood-group-badge">
                      {request.bloodGroup}
                    </div>

                    <span
                      className={`status-badge ${request.status}`}
                    >
                      {request.status}
                    </span>

                  </div>

                  <h3>
                    {request.hospitalName}
                  </h3>

                  <div className="blood-card-info">

                    <span>
                      <strong>
                        {request.unitsRequired}
                      </strong>{" "}
                      unit(s)
                    </span>

                    <span>
                      {request.responses?.length ||
                        0}{" "}
                      donor response(s)
                    </span>

                  </div>

                  {request.responses?.length > 0 && (

                    <div className="donor-responses">

                      <div className="donor-responses-title">
                        Donor Responses
                      </div>

                      {request.responses.map(
                        (response, index) => {

                          const donor =
                            response.donor ||
                            {};

                          const donorId =
                            donor._id ||
                            response.donor;

                          return (

                            <div
                              className="donor-response-card"
                              key={
                                donorId ||
                                index
                              }
                            >

                              <div className="donor-response-main">

                                <div className="response-avatar">

                                  {donor.name
                                    ?.charAt(0)
                                    ?.toUpperCase() ||
                                    "D"}

                                </div>

                                <div className="response-info">

                                  <h4>
                                    {donor.name ||
                                      "Blood Donor"}
                                  </h4>

                                  <div className="response-meta">

                                    {donor.bloodGroup && (
                                      <span>
                                        🩸{" "}
                                        {
                                          donor.bloodGroup
                                        }
                                      </span>
                                    )}

                                    {donor.phone && (
                                      <span>
                                        📞{" "}
                                        {donor.phone}
                                      </span>
                                    )}

                                  </div>

                                </div>

                                <span
                                  className={`response-status ${getResponseStatusClass(
                                    response.status
                                  )}`}
                                >
                                  {getResponseStatusText(
                                    response.status
                                  )}
                                </span>

                              </div>

                              {(!response.status ||
                                response.status ===
                                  "pending") && (

                                <div className="response-actions">

                                  <button
                                    className="accept-response-button"
                                    onClick={() =>
                                      handleUpdateResponse(
                                        request._id,
                                        donorId,
                                        "accepted"
                                      )
                                    }
                                    disabled={loading}
                                  >
                                    <Check size={15} />
                                    Accept Donor
                                  </button>

                                  <button
                                    className="decline-response-button"
                                    onClick={() =>
                                      handleUpdateResponse(
                                        request._id,
                                        donorId,
                                        "declined"
                                      )
                                    }
                                    disabled={loading}
                                  >
                                    <X size={15} />
                                    Decline
                                  </button>

                                </div>

                              )}

                              {response.status ===
                                "accepted" && (

                                <div className="accepted-donor-actions">

                                  <div className="accepted-message">
                                    This donor has been
                                    accepted. You can
                                    contact them directly.
                                  </div>

                                  <div className="response-actions">

                                    {donor.phone && (
                                      <a
                                        className="call-donor-response-button"
                                        href={`tel:${donor.phone}`}
                                      >
                                        <Phone size={15} />
                                        Call Donor
                                      </a>
                                    )}

                                    <button
                                      className="chat-donor-button"
                                      onClick={() =>
                                        openChat(
                                          request._id,
                                          donor.name
                                        )
                                      }
                                    >
                                      <MessageCircle
                                        size={15}
                                      />
                                      Chat
                                    </button>

                                  </div>

                                </div>

                              )}

                              {response.status ===
                                "declined" && (

                                <div className="declined-message">
                                  Donor response declined.
                                </div>

                              )}

                            </div>

                          );
                        }
                      )}

                    </div>

                  )}

                  {(request.status === "searching" ||
                    request.status === "matched") && (

                    <div className="blood-card-actions">

                      <button
                        className="fulfill-blood-button"
                        onClick={() =>
                          handleFulfill(
                            request._id
                          )
                        }
                        disabled={loading}
                      >
                        Mark Fulfilled
                      </button>

                      <button
                        className="cancel-blood-button"
                        onClick={() =>
                          handleCancel(
                            request._id
                          )
                        }
                        disabled={loading}
                      >
                        Cancel
                      </button>

                    </div>

                  )}

                </div>

              ))}

            </div>

          )}

        </div>

      )}

      {chatOpen && (
        <BloodChat
          requestId={chatRequestId}
          donorName={chatDonorName}
          onClose={closeChat}
        />
      )}

    </section>
  );
}

export default BloodRequestPanel;