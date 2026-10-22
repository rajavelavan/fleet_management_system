import apiClient from "../api/client";
import { LoginResponse, RefreshResponse, User } from "../types/auth";

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RoleTestResponse {
  message: string;
  user_id: string;
  email: string;
  role: string;
}

export const authService = {
  /**
   * Authenticate with email & password.
   * Access token is returned in response body; refresh token is set in HttpOnly cookie.
   */
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    const response = await apiClient.post<LoginResponse>(
      "/api/v1/auth/login",
      credentials
    );
    return response.data;
  },

  /**
   * Refresh the access token using the HttpOnly cookie.
   */
  async refresh(): Promise<RefreshResponse> {
    const response = await apiClient.post<RefreshResponse>(
      "/api/v1/auth/refresh",
      {}
    );
    return response.data;
  },

  /**
   * Terminate user session and clear HttpOnly cookie.
   */
  async logout(): Promise<{ message: string }> {
    const response = await apiClient.post<{ message: string }>(
      "/api/v1/auth/logout",
      {}
    );
    return response.data;
  },

  /**
   * Fetch current authenticated user profile using Bearer token.
   */
  async getMe(): Promise<User> {
    const response = await apiClient.get<User>("/api/v1/auth/me");
    return response.data;
  },

  /**
   * Test Admin-only endpoint (requires ADMIN role, rejects others with 403).
   */
  async testAdminOnly(): Promise<RoleTestResponse> {
    const response = await apiClient.get<RoleTestResponse>(
      "/api/v1/auth/admin-only"
    );
    return response.data;
  },

  /**
   * Test Dispatcher endpoint (requires ADMIN or DISPATCHER role).
   */
  async testDispatcherOnly(): Promise<RoleTestResponse> {
    const response = await apiClient.get<RoleTestResponse>(
      "/api/v1/auth/dispatcher-only"
    );
    return response.data;
  },
};

export default authService;
