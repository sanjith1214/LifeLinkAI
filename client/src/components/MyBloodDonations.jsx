import { useEffect, useState } from "react";
import {
  Droplet,
  MapPin,
  Phone,
  RefreshCw,
  Clock,
  CheckCircle,
  XCircle,
  MessageCircle,
} from "lucide-react";

import { getMyBloodDonations } from "../services/bloodRequests";
import "./MyBloodDonations.css";
import BloodChat from "./BloodChat";

function MyBloodDonations() {
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [chatOpen, setChatOpen] = useState(false);
  const [chatRequestId, setChatRequestId] = useState("");
  const [chatUserName, setChatUserName] = useState("");

  const loadDonations = async () => {
    try {
      setLoading(true);
      setError("");

      const data = await getMyBloodDonations();

      setDonations(data.requests || []);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to load your donations."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDonations();
  }, []);

  const getCurrentUserId = () => {
    const currentUser =
      localStorage.getItem("user");

    try {
      const user = JSON.parse(
        currentUser || "{}"
      );

      return user._id || user.id || "";
    } catch {
      return "";
    }
  };

  const getDonationResponse = (request) => {
    const currentUserId =
      getCurrentUserId();

    return request.responses?.find(
      (item) =>
        String(
          item.donor?._id || item.donor
        ) === String(currentUserId)
    );
  };

  const getDonationStatus = (request) => {
    const response =
      getDonationResponse(request);

    return response?.status || "pending";
  };

  const getStatusLabel = (status) => {
    if (status === "accepted") {
      return "Accepted";
    }

    if (status === "declined") {
      return "Declined";
    }

    return "Pending";
  };

  const getStatusIcon = (status) => {
    if (status === "accepted") {
      return <CheckCircle size={16} />;
    }

    if (status === "declined") {
      return <XCircle size={16} />;
    }

    return <Clock size={16} />;
  };

  const openChat = (request) => {
    setChatRequestId(request._id);

    setChatUserName(
      request.requester?.name ||
        "Blood Requester"
    );

    setChatOpen(true);
  };

  const closeChat = () => {
    setChatOpen(false);
    setChatRequestId("");
    setChatUserName("");
  };

  if (loading) {
    return (
      <div className="my-donations-card">
        <div className="my-donations-loading">
          <RefreshCw
            size={24}
            className="spin-icon"
          />

          <p>
            Loading your donations...
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="my-donations-card">

        <div className="my-donations-header">

          <div>
            <h2>
              <Droplet size={22} />
              My Donations
            </h2>

            <p>
              Blood requests where you offered to
              donate.
            </p>
          </div>

          <button
            className="my-donations-refresh"
            onClick={loadDonations}
            disabled={loading}
          >
            <RefreshCw size={16} />
            Refresh
          </button>

        </div>

        {error && (
          <div className="my-donations-error">
            {error}
          </div>
        )}

        {!error &&
          donations.length === 0 && (
            <div className="my-donations-empty">

              <Droplet size={40} />

              <h3>
                No donations yet
              </h3>

              <p>
                When you respond to a nearby blood
                request, it will appear here.
              </p>

            </div>
          )}

        {donations.length > 0 && (
          <div className="my-donations-list">

            {donations.map((request) => {

              const response =
                getDonationResponse(request);

              const status =
                response?.status || "pending";

              const requester =
                request.requester || {};

              return (
                <div
                  className="my-donation-item"
                  key={request._id}
                >

                  <div className="my-donation-top">

                    <div className="my-donation-blood">
                      <Droplet size={20} />
                      <strong>
                        {request.bloodGroup}
                      </strong>
                    </div>

                    <div
                      className={`my-donation-status ${status}`}
                    >
                      {getStatusIcon(status)}

                      {getStatusLabel(status)}
                    </div>

                  </div>

                  <div className="my-donation-details">

                    <div className="my-donation-detail">

                      <MapPin size={16} />

                      <div>
                        <span>
                          Hospital
                        </span>

                        <strong>
                          {request.hospitalName ||
                            "Hospital not provided"}
                        </strong>
                      </div>

                    </div>

                    {request.hospitalPhone && (
                      <div className="my-donation-detail">

                        <Phone size={16} />

                        <div>
                          <span>
                            Hospital Phone
                          </span>

                          <a
                            href={`tel:${request.hospitalPhone}`}
                          >
                            {request.hospitalPhone}
                          </a>
                        </div>

                      </div>
                    )}

                    <div className="my-donation-detail">

                      <div>
                        <span>
                          Requested by
                        </span>

                        <strong>
                          {requester.name ||
                            "User"}
                        </strong>
                      </div>

                    </div>

                  </div>

                  <div className="my-donation-bottom">

                    <div>
                      <span>
                        Units Required
                      </span>

                      <strong>
                        {request.unitsRequired}
                      </strong>
                    </div>

                    <div>
                      <span>
                        Urgency
                      </span>

                      <strong>
                        {request.urgency ||
                          "Urgent"}
                      </strong>
                    </div>

                    <div>
                      <span>
                        Request Status
                      </span>

                      <strong>
                        {request.status}
                      </strong>
                    </div>

                  </div>

                  {request.message && (
                    <div className="my-donation-message">

                      <span>
                        Message
                      </span>

                      <p>
                        {request.message}
                      </p>

                    </div>
                  )}

                  {status === "accepted" && (
                    <div className="my-donation-actions">

                      {requester.phone && (
                        <a
                          className="my-donation-call"
                          href={`tel:${requester.phone}`}
                        >
                          <Phone size={16} />
                          Call Requester
                        </a>
                      )}

                      <button
                        className="my-donation-chat"
                        onClick={() =>
                          openChat(request)
                        }
                      >
                        <MessageCircle
                          size={16}
                        />
                        Chat
                      </button>

                    </div>
                  )}

                </div>
              );
            })}

          </div>
        )}

      </div>

      {chatOpen && (
        <BloodChat
          requestId={chatRequestId}
          donorName={chatUserName}
          onClose={closeChat}
        />
      )}
    </>
  );
}

export default MyBloodDonations;