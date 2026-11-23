import { fetchWithTimeout, readApiResponse } from "./apiClient";

export async function fetchTravelBuddies() {
  return readApiResponse(await fetchWithTimeout("/api/user/findAllTravelBuddy", { credentials: "same-origin" }));
}

export async function saveTravelBuddy({ payload }) {
  return readApiResponse(await fetchWithTimeout("/api/travel-buddy/saveTravelBuddy", {
    method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload || {}),
  }));
}

export async function updateTravelBuddy({ payload }) {
  return readApiResponse(await fetchWithTimeout("/api/travel-buddy/updateTravelBuddy", {
    method: "PATCH", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload || {}),
  }));
}
