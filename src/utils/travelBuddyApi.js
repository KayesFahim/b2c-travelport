import { config } from "../config";

function normalizedBaseUrl() {
    return String(config?.baseUrl || "").trim().replace(/\/+$/, "");
}

async function parseJson(response) {
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        const message = String(data?.message || response.statusText || "Request failed").trim();
        throw new Error(message || "Request failed");
    }
    return data;
}

export async function fetchTravelBuddies({ token } = {}) {
    try {
        const response = await fetch("/api/user/findAllTravelBuddy", {
            method: "GET",
            credentials: "include",
            headers: {
                "Content-Type": "application/json",
            },
        });

        return await parseJson(response);
    } catch (localError) {
        if (!token) throw localError;

        const response = await fetch(`${normalizedBaseUrl()}/user/findAllTravelBuddy`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
        });

        return parseJson(response);
    }
}

export async function saveTravelBuddy({ token, payload }) {
    const body = JSON.stringify(payload || {});

    try {
        const response = await fetch("/api/travel-buddy/saveTravelBuddy", {
            method: "POST",
            credentials: "include",
            headers: {
                "Content-Type": "application/json",
            },
            body,
        });

        return await parseJson(response);
    } catch (localError) {
        if (!token) throw localError;

        const response = await fetch(`${normalizedBaseUrl()}/travel-buddy/saveTravelBuddy`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body,
        });

        return parseJson(response);
    }
}

export async function updateTravelBuddy({ token, payload }) {
    const body = JSON.stringify(payload || {});

    try {
        const response = await fetch("/api/travel-buddy/updateTravelBuddy", {
            method: "PATCH",
            credentials: "include",
            headers: {
                "Content-Type": "application/json",
            },
            body,
        });

        return await parseJson(response);
    } catch (localError) {
        if (!token) throw localError;

        const response = await fetch(`${normalizedBaseUrl()}/travel-buddy/updateTravelBuddy`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body,
        });

        return parseJson(response);
    }
}
