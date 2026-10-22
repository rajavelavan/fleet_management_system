import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from "axios";
import { useAuthStore } from "../store/authStore";
import { RefreshResponse } from "../types/auth";

// Base URL configured from environment variable with fallback
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

// Create configured Axios instance with cross-origin credentials enabled for cookies
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// Flag to track whether a refresh request is currently active
let isRefreshing = false;

// Queue of failed requests awaiting token refresh completion
interface FailedQueueItem {
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}

let failedQueue: FailedQueueItem[] = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else if (token) {
      promise.resolve(token);
    }
  });
  failedQueue = [];
};

// Request interceptor to automatically attach Bearer token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = useAuthStore.getState().accessToken;
    if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle 401 and auto-refresh short-lived access tokens
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    if (!error.response || !originalRequest) {
      return Promise.reject(error);
    }

    const is401 = error.response.status === 401;
    const url = originalRequest.url || "";
    const isAuthRoute =
      url.includes("/api/v1/auth/login") ||
      url.includes("/api/v1/auth/refresh") ||
      url.includes("/api/v1/auth/logout");

    // Only intercept 401 errors on non-auth endpoints that haven't been retried yet
    if (is401 && !originalRequest._retry && !isAuthRoute) {
      if (isRefreshing) {
        // If already refreshing, wait for the new access token
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((newToken) => {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Make refresh request with bare axios to avoid interceptor recursion
        const refreshRes = await axios.post<RefreshResponse>(
          `${API_BASE_URL}/api/v1/auth/refresh`,
          {},
          {
            withCredentials: true,
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        const newAccessToken = refreshRes.data.access_token;
        const user = refreshRes.data.user;

        // Update auth state in store
        useAuthStore.getState().setAccessToken(newAccessToken);
        if (user) {
          useAuthStore.getState().setUser(user);
        }

        processQueue(null, newAccessToken);

        // Retry original request with newly issued token
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return apiClient(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        useAuthStore.getState().clearAuth();
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export interface HealthCheckResponse {
  status: string;
  service: string;
  version: string;
  environment: string;
  components: {
    database: {
      status: string;
      postgis_version?: string;
    };
    redis: {
      status: string;
    };
  };
}

export const fetchHealthStatus = async (): Promise<HealthCheckResponse> => {
  const response = await apiClient.get<HealthCheckResponse>("/api/v1/health");
  return response.data;
};

export default apiClient;
