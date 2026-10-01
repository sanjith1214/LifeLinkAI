import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Droplet,
  Phone,
  MapPin,
  Navigation,
  RefreshCw,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import "./BloodDonation.css";
import {
  listDonors,
  setDonorStatus,
} from "../services/donors";

import BloodRequestPanel from "../components/BloodRequestPanel";

function BloodDonation() {
  const navigate = useNavigate();

  const [bloodGroup, setBloodGroup] = useState("");
  const [donorAvailable, setDonorAvailable] = useState(false);

  const [donors, setDonors] = useState([]);
  const [location, setLocation] = useState(null);

  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const getCurrentLocation = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(
          new Error("Geolocation is not supported by your browser.")
        );
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const currentLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };

          setLocation(currentLocation);

          resolve(currentLocation);
        },
        () => {
          reject(
            new Error(
              "Location permission is required for nearby donor matching."
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
  };

  const loadLocation = async () => {
    try {
      setLocationLoading(true);
      setError("");

      await getCurrentLocation();
    } catch (err) {
      setError(err.message);
    } finally {
      setLocationLoading(false);
    }
  };

  const loadDonors = async (currentLocation = location) => {
    try {
      setLoading(true);
      setError("");

      const data = await listDonors(
        bloodGroup,
        currentLocation
      );

      setDonors(data || []);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to load nearby donors."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLocation();
  }, []);

  useEffect(() => {
    if (location) {
      loadDonors(location);
    }
  }, [location]);

  const handleRefreshLocation = async () => {
    try {
      setLocationLoading(true);
      setError("");
      setSuccess("");

      const currentLocation = await getCurrentLocation();

      await loadDonors(currentLocation);

      setSuccess("Your location has been refreshed.");
    } catch (err) {
      setError(err.message);
    } finally {
      setLocationLoading(false);
    }
  };

  const handleSearch = async () => {
    try {
      setError("");
      setSuccess("");

      let currentLocation = location;

      if (!currentLocation) {
        currentLocation = await getCurrentLocation();
      }

      await loadDonors(currentLocation);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDonorStatus = async () => {
    try {
      setError("");
      setSuccess("");

      if (!bloodGroup) {
        setError("Please select your blood group first.");
        return;
      }

      let currentLocation = location;

      if (!currentLocation) {
        currentLocation = await getCurrentLocation();
      }

      const newStatus = !donorAvailable;

      await setDonorStatus(
        newStatus,
        bloodGroup,
        currentLocation
      );

      setDonorAvailable(newStatus);

      setSuccess(
        newStatus
          ? "You are now listed as an available donor."
          : "You are no longer listed as a donor."
      );

      await loadDonors(currentLocation);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Unable to update donor status."
      );
    }
  };

  const openNavigation = (donor) => {
    if (!location) {
      setError("Your location is required for navigation.");
      return;
    }

    /*
      Donor coordinates are intentionally not exposed by the backend.
      We therefore open a general Google Maps search instead of
      pretending we know the donor's exact location.
    */

    const query = encodeURIComponent(
      `${donor.name}, nearby blood donor`
    );

    window.open(
      `https://www.google.com/maps/search/?api=1&query=${query}`,
      "_blank"
    );
  };

  return (
    <div className="blood-donation-page">
      <div className="blood-donation-container">

        {/* Back button */}

        <button
          className="back-button"
          onClick={() => navigate("/dashboard")}
        >
          <ArrowLeft size={18} />
          Back to Dashboard
        </button>

        {/* Header */}

        <div className="blood-donation-header">
          <div className="blood-donation-title">
            <div className="blood-donation-icon">
              <Droplet size={28} />
            </div>

            <div>
              <h1>Blood Donation</h1>

              <p>
                Find nearby blood donors and help save lives.
              </p>
            </div>
          </div>

          <div className="radius-badge">
            <MapPin size={16} />
            10 km radius
          </div>
        </div>

        {/* Error */}

        {error && (
          <div className="blood-alert blood-alert-error">
            {error}
          </div>
        )}

        {/* Success */}

        {success && (
          <div className="blood-alert blood-alert-success">
            {success}
          </div>
        )}

        {/* Donor controls */}

        <div className="donor-control-card">

          <div className="donor-control-header">
            <div>
              <h2>Blood Donor Search</h2>

              <p>
                Find available donors near your current location.
              </p>
            </div>

            <button
              className="refresh-location-button"
              onClick={handleRefreshLocation}
              disabled={locationLoading}
            >
              <RefreshCw
                size={17}
                className={
                  locationLoading ? "spin-icon" : ""
                }
              />

              {locationLoading
                ? "Updating..."
                : "Refresh Location"}
            </button>
          </div>

          <div className="donor-controls">

            <div className="blood-field">
              <label>Blood Group</label>

              <select
                value={bloodGroup}
                onChange={(e) => {
                  setBloodGroup(e.target.value);
                }}
              >
                <option value="">
                  Select blood group
                </option>

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

            <button
              className="search-donor-button"
              onClick={handleSearch}
              disabled={loading}
            >
              {loading ? "Searching..." : "Find Donors"}
            </button>

          </div>

          {/* Donor availability */}

          <div className="donor-availability">

            <div>
              <h3>Become a donor</h3>

              <p>
                Make yourself visible to nearby people who
                need your blood group.
              </p>
            </div>

            <button
              className={`donor-toggle ${
                donorAvailable ? "active" : ""
              }`}
              onClick={handleDonorStatus}
            >
              <span className="toggle-circle"></span>

              {donorAvailable
                ? "Available to Donate"
                : "Not Available"}
            </button>

          </div>

          {/* Location status */}

          <div className="location-status">

            <MapPin size={17} />

            {location ? (
              <span>
                Your location is available for nearby matching.
              </span>
            ) : (
              <span>
                Location is not available yet.
              </span>
            )}

          </div>

        </div>

        {/* Donor results */}

        <div className="donor-results-section">

          <div className="donor-results-header">

            <div>
              <h2>Nearby Available Donors</h2>

              <p>
                Showing available donors within 10 km.
              </p>
            </div>

            <button
              className="small-refresh-button"
              onClick={() => loadDonors()}
              disabled={loading}
            >
              <RefreshCw size={16} />

              Refresh
            </button>

          </div>

          {loading && donors.length === 0 ? (
            <div className="blood-empty-state">
              <Droplet size={34} />

              <h3>Finding nearby donors...</h3>

              <p>
                Searching for available blood donors.
              </p>
            </div>
          ) : donors.length === 0 ? (
            <div className="blood-empty-state">
              <Droplet size={34} />

              <h3>No donors found</h3>

              <p>
                Try another blood group or refresh your
                location.
              </p>
            </div>
          ) : (
            <div className="donor-grid">

              {donors.map((donor) => (
                <div
                  className="donor-card"
                  key={donor._id}
                >

                  <div className="donor-card-header">

                    <div className="donor-avatar">
                      {donor.name
                        ?.charAt(0)
                        ?.toUpperCase() || "D"}
                    </div>

                    <div>
                      <h3>{donor.name}</h3>

                      <span>
                        Available donor
                      </span>
                    </div>

                  </div>

                  <div className="donor-blood-group">
                    {donor.bloodGroup}
                  </div>

                  {donor.distanceKm !== undefined && (
                    <div className="donor-distance">
                      <MapPin size={15} />

                      {donor.distanceKm} km away
                    </div>
                  )}

                  <div className="donor-actions">

                    {donor.phone && (
                      <a
                        className="call-donor-button"
                        href={`tel:${donor.phone}`}
                      >
                        <Phone size={16} />
                        Call
                      </a>
                    )}

                    <button
                      className="navigate-donor-button"
                      onClick={() =>
                        openNavigation(donor)
                      }
                    >
                      <Navigation size={16} />
                      Navigate
                    </button>

                  </div>

                </div>
              ))}

            </div>
          )}

        </div>

        {/* NEW: Emergency blood request system */}

        <BloodRequestPanel />

      </div>
    </div>
  );
}

export default BloodDonation;