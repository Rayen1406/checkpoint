const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api";

async function request(path, options = {}) {
  const { headers: customHeaders, ...restOptions } = options;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...restOptions,
    headers: {
      "Content-Type": "application/json",
      ...(customHeaders || {}),
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Request failed");
  }

  return data;
}

export const api = {
  startTeam(teamName) {
    return request("/team/start", {
      method: "POST",
      body: JSON.stringify({ teamName }),
    });
  },

  getTeamDashboard(teamId) {
    return request(`/team/${teamId}/dashboard`);
  },

  submitCheckpoint(teamId, payload) {
    return request(`/team/${teamId}/submit`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  adminLogin(username, password) {
    return request("/admin/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
  },

  getAdminDashboard(token) {
    return request("/admin/dashboard", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },

  getAdminConfig(token) {
    return request("/admin/config", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },

  updateAdminStartTime(startTime, token) {
    return request("/admin/config/start-time", {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ startTime }),
    });
  },

  getAdminTeamDetails(teamId, token) {
    return request(`/admin/team/${teamId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },
};
