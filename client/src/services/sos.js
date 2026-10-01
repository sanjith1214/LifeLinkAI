import api from "./api";

export async function listSOS() {
  const { data } = await api.get("/sos");

  return data.requests || [];
}

export async function acceptSOS(
  id,
  etaMinutes,
  latitude,
  longitude
) {
  const body = {};

  if (etaMinutes !== undefined) {
    body.etaMinutes = etaMinutes;
  }

  if (
    latitude !== undefined &&
    longitude !== undefined
  ) {
    body.latitude = latitude;
    body.longitude = longitude;
  }

  const { data } = await api.patch(
    `/sos/${id}/accept`,
    body
  );

  return data.request;
}

export async function declineSOS(id) {
  const { data } = await api.patch(
    `/sos/${id}/decline`
  );

  return data.request;
}

export async function resolveSOS(id) {
  const { data } = await api.patch(
    `/sos/${id}/resolve`
  );

  return data.request;
}

export async function updateResponderLocation(
  id,
  latitude,
  longitude
) {
  const { data } = await api.patch(
    `/sos/${id}/location`,
    {
      latitude,
      longitude,
    }
  );

  return data.request;
}

export async function myRequests() {
  const { data } = await api.get(
    "/sos/mine"
  );

  return data.requests || [];
}

export async function cancelSOS(id) {
  const { data } = await api.patch(
    `/sos/${id}/cancel`
  );

  return data.request;
}