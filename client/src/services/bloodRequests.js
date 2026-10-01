import api from "./api";

export async function createBloodRequest(requestData) {
  const { data } = await api.post(
    "/blood-requests",
    requestData
  );

  return data;
}

export async function getNearbyBloodRequests(
  latitude,
  longitude
) {
  const { data } = await api.get(
    "/blood-requests/nearby",
    {
      params: {
        latitude,
        longitude,
      },
    }
  );

  return data;
}

export async function getMyBloodRequests() {
  const { data } = await api.get(
    "/blood-requests/mine"
  );

  return data;
}

export async function getMyBloodDonations() {
  const { data } = await api.get(
    "/blood-requests/my-donations"
  );

  return data;
}

export async function respondToBloodRequest(
  requestId
) {
  const { data } = await api.post(
    `/blood-requests/${requestId}/respond`
  );

  return data;
}

export async function updateBloodRequestResponse(
  requestId,
  donorId,
  status
) {
  const { data } = await api.put(
    `/blood-requests/${requestId}/responses/${donorId}`,
    { status }
  );

  return data;
}

export async function cancelBloodRequest(
  requestId
) {
  const { data } = await api.put(
    `/blood-requests/${requestId}/cancel`
  );

  return data;
}

export async function fulfillBloodRequest(
  requestId
) {
  const { data } = await api.put(
    `/blood-requests/${requestId}/fulfill`
  );

  return data;
}