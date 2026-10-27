import axios from "axios";

export const apiClient = axios.create({
  baseURL: "/api",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

export const authClient = axios.create({
  baseURL: "/api-auth",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Both data requests and auth-context requests (/me, /features, /impersonate)
// must recover expired access cookies without competing refresh rotations.
let refreshPromise: Promise<unknown> | null = null;
function installRefresh(client: typeof apiClient) {
  client.interceptors.response.use(response => response, async error => {
    const original = error.config;
    const terminalAuthRoute = /\/(login|refresh|logout)\/?$/.test(original?.url || "");
    if (error.response?.status !== 401 || !original || original._retry || terminalAuthRoute) {
      return Promise.reject(error);
    }
    original._retry = true;
    try {
      if (!refreshPromise) {
        refreshPromise = authClient.post("/refresh").finally(() => { refreshPromise = null; });
      }
      await refreshPromise;
      return client(original);
    } catch (refreshError) {
      if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) window.location.href = "/login";
      return Promise.reject(refreshError);
    }
  });
}
installRefresh(apiClient);
installRefresh(authClient);
