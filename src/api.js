const API_URL = import.meta.env.VITE_API_URL || "https://zura-brain-api.fly.dev";
const CODE_KEY = "zura_admin_code";

export function getAdminCode() {
  return sessionStorage.getItem(CODE_KEY) || "";
}

export function setAdminCode(code) {
  sessionStorage.setItem(CODE_KEY, code);
}

export function clearAdminCode() {
  sessionStorage.removeItem(CODE_KEY);
}

export async function api(path, { method = "GET", body } = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data.error || (Array.isArray(data.errors) ? data.errors.join(", ") : "") || `Request failed (${response.status})`;
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }
  return data;
}

export async function verifyAdminCode(code) {
  try {
    await api("/admin/therapists/__admin_check__/status", {
      method: "PATCH",
      body: { tc: code, active: true }
    });
    return true;
  } catch (error) {
    if (error.status === 404) return true;
    throw error;
  }
}
