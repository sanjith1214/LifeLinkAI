import api from "./api";

export async function listDonors(bloodGroup, location) {
  const params = {};

  if (bloodGroup) {
    params.bloodGroup = bloodGroup;
  }

  if (location) {
    params.latitude = location.latitude;
    params.longitude = location.longitude;
  }

  const { data } = await api.get("/donors", { params });

  return data.donors;
}

export async function setDonorStatus(
  donorAvailable,
  bloodGroup,
  location
) {
  const { data } = await api.put("/donors/me", {
    donorAvailable,
    bloodGroup,
    latitude: location?.latitude,
    longitude: location?.longitude,
  });

  return data;
}