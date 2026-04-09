const DEFAULT_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

async function request(path, options = {}, baseUrl = DEFAULT_BASE_URL) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const message = payload?.error || `Request failed: ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  return payload;
}

export const api = {
  baseUrl: DEFAULT_BASE_URL,
  health: () => request("/api/health"),
  listSongs: (params = {}) => {
    const query = new URLSearchParams(
      Object.entries(params).filter(([, value]) => value !== "" && value != null)
    );
    return request(`/api/songs${query.toString() ? `?${query.toString()}` : ""}`);
  },
  getSongDetail: (songId) => request(`/api/songs/${songId}`),
  getSubtitleByLanguage: (songId, language) =>
    request(`/api/songs/${songId}/subtitles/${language}`),
  updateSubtitleLine: (subtitleId, body) =>
    request(`/api/subtitles/${subtitleId}/lines`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
};

export function mapErrorToToast(error) {
  if (!error || typeof error !== "object") {
    return "Unexpected error";
  }

  if (error.status === 400) {
    return `Validation error: ${error.message}`;
  }

  if (error.status === 404) {
    return `Not found: ${error.message}`;
  }

  if (error.status === 409) {
    return `Conflict: ${error.message}`;
  }

  return error.message || "Unexpected error";
}
