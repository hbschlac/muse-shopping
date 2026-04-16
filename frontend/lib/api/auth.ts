/**
 * Authentication API Service
 */

import { api, saveAuthToken, clearAuthToken } from './client';
import type { AuthResponse, User } from '../types/api';

export interface RegisterData {
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface ChangePasswordData {
  current_password: string;
  new_password: string;
}

/**
 * Unwrap backend envelope { success, data: { user, tokens: { access_token, refresh_token } } }
 * and persist tokens the same way completeGoogleAuth does. Returns the legacy-shaped
 * AuthResponse ({ user, token, refreshToken }) so existing callers keep working.
 */
function persistAuthResponse(raw: any): AuthResponse {
  // Backend wraps in { success, data: { user, tokens } }. Tolerate the unwrapped
  // shape too, since /auth/register historically spreads user+tokens at top level.
  const user = raw?.data?.user ?? raw?.user;
  const tokens = raw?.data?.tokens ?? raw?.tokens;
  const accessToken = tokens?.access_token ?? raw?.token;
  const refreshTokenVal = tokens?.refresh_token ?? raw?.refreshToken;

  if (accessToken) {
    saveAuthToken(accessToken);
    if (refreshTokenVal) {
      localStorage.setItem('refresh_token', refreshTokenVal);
    }
  }

  return {
    user,
    token: accessToken,
    refreshToken: refreshTokenVal,
  } as AuthResponse;
}

/**
 * Register a new user
 */
export async function register(data: RegisterData): Promise<AuthResponse> {
  const response = await api.post<any>('/auth/register', data);
  return persistAuthResponse(response);
}

/**
 * Login user
 */
export async function login(data: LoginData): Promise<AuthResponse> {
  const response = await api.post<any>('/auth/login', data);
  return persistAuthResponse(response);
}

/**
 * Logout user
 */
export async function logout(): Promise<void> {
  try {
    await api.post('/auth/logout', {}, { requiresAuth: true });
  } finally {
    clearAuthToken();
  }
}

/**
 * Refresh authentication token
 */
export async function refreshToken(): Promise<AuthResponse> {
  const refreshToken = localStorage.getItem('refresh_token');
  if (!refreshToken) {
    throw new Error('No refresh token available');
  }

  const response = await api.post<AuthResponse>('/auth/refresh-token', {
    refreshToken,
  });

  if (response.token) {
    saveAuthToken(response.token);
    if (response.refreshToken) {
      localStorage.setItem('refresh_token', response.refreshToken);
    }
  }

  return response;
}

/**
 * Change user password
 */
export async function changePassword(data: ChangePasswordData): Promise<void> {
  await api.post('/auth/change-password', data, { requiresAuth: true });
}

/**
 * Get current authenticated user
 */
export async function getCurrentUser(): Promise<User> {
  return api.get<User>('/users/me', { requiresAuth: true });
}

/**
 * Initiate Google OAuth flow
 */
export async function initiateGoogleAuth(): Promise<void> {
  try {
    // Get the auth URL from backend
    const response = await api.get<{ success: boolean; data: { authUrl: string; state: string } }>('/auth/google');

    if (response.data?.authUrl) {
      // Redirect to Google's authorization page
      window.location.href = response.data.authUrl;
    } else {
      throw new Error('No authorization URL received from server');
    }
  } catch (error) {
    console.error('Failed to initiate Google auth:', error);
    throw error;
  }
}

/**
 * Complete Google OAuth flow
 */
export async function completeGoogleAuth(code: string): Promise<AuthResponse> {
  const response = await api.post<{
    success: boolean;
    data: {
      user: User;
      tokens: {
        access_token: string;
        refresh_token: string;
        expires_in: number;
      };
    };
  }>('/auth/google/callback', { code });

  // Backend wraps response in { success: true, data: {...} }
  const authData = response.data;

  console.log('completeGoogleAuth - response:', response);
  console.log('completeGoogleAuth - user:', authData.user);
  console.log('completeGoogleAuth - onboarding_completed:', authData.user.onboarding_completed);

  // Save tokens
  if (authData.tokens?.access_token) {
    saveAuthToken(authData.tokens.access_token);
    if (authData.tokens.refresh_token) {
      localStorage.setItem('refresh_token', authData.tokens.refresh_token);
    }
  }

  // Return normalized format
  return {
    user: authData.user,
    token: authData.tokens.access_token,
    refreshToken: authData.tokens.refresh_token,
  };
}

/**
 * Request password reset
 */
export async function requestPasswordReset(email: string): Promise<void> {
  await api.post('/auth/forgot-password', { email });
}

/**
 * Request password reset (alias for requestPasswordReset)
 */
export async function forgotPassword(email: string): Promise<void> {
  return requestPasswordReset(email);
}

/**
 * Verify password reset token
 */
export async function verifyResetToken(token: string): Promise<{ valid: boolean }> {
  return api.get<{ valid: boolean }>(`/auth/verify-reset-token?token=${token}`);
}

/**
 * Reset password with token
 */
export async function resetPassword(token: string, newPassword: string): Promise<void> {
  await api.post('/auth/reset-password', { token, new_password: newPassword });
}

/**
 * Initiate Apple OAuth flow
 */
export async function initiateAppleAuth(): Promise<void> {
  try {
    // Get the auth URL from backend
    const response = await api.get<{ success: boolean; data: { authUrl: string; state: string; nonce: string } }>('/auth/apple');

    if (response.data?.authUrl) {
      // Redirect to Apple's authorization page
      window.location.href = response.data.authUrl;
    } else {
      throw new Error('No authorization URL received from server');
    }
  } catch (error) {
    console.error('Failed to initiate Apple auth:', error);
    throw error;
  }
}

/**
 * Complete Apple OAuth flow
 */
export async function completeAppleAuth(data: { code?: string; id_token?: string; state?: string; user?: string }): Promise<AuthResponse> {
  const response = await api.post<{
    success: boolean;
    data: {
      user: User;
      tokens: {
        access_token: string;
        refresh_token: string;
        expires_in: number;
      };
    };
  }>('/auth/apple/callback', data);

  // Backend wraps response in { success: true, data: {...} }
  const authData = response.data;

  console.log('completeAppleAuth - response:', response);
  console.log('completeAppleAuth - user:', authData.user);
  console.log('completeAppleAuth - onboarding_completed:', authData.user.onboarding_completed);

  // Save tokens
  if (authData.tokens?.access_token) {
    saveAuthToken(authData.tokens.access_token);
    if (authData.tokens.refresh_token) {
      localStorage.setItem('refresh_token', authData.tokens.refresh_token);
    }
  }

  // Return normalized format
  return {
    user: authData.user,
    token: authData.tokens.access_token,
    refreshToken: authData.tokens.refresh_token,
  };
}

/**
 * Auth API object (legacy export for compatibility)
 */
export const authApi = {
  register,
  login,
  logout,
  refreshToken,
  changePassword,
  getCurrentUser,
  initiateGoogleAuth,
  completeGoogleAuth,
  requestPasswordReset,
  forgotPassword,
  verifyResetToken,
  resetPassword,
  completeAppleAuth,
};
