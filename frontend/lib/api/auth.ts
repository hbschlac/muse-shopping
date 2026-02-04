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
 * Register a new user
 */
export async function register(data: RegisterData): Promise<AuthResponse> {
  const response = await api.post<AuthResponse>('/auth/register', data);
  if (response.token) {
    saveAuthToken(response.token);
    if (response.refreshToken) {
      localStorage.setItem('refresh_token', response.refreshToken);
    }
  }
  return response;
}

/**
 * Login user
 */
export async function login(data: LoginData): Promise<AuthResponse> {
  const response = await api.post<AuthResponse>('/auth/login', data);
  if (response.token) {
    saveAuthToken(response.token);
    if (response.refreshToken) {
      localStorage.setItem('refresh_token', response.refreshToken);
    }
  }
  return response;
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
export function initiateGoogleAuth(): void {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const redirectUri = `${window.location.origin}/auth/google/callback`;
  const scope = 'email profile';

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${clientId}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `response_type=code&` +
    `scope=${encodeURIComponent(scope)}`;

  window.location.href = authUrl;
}

/**
 * Complete Google OAuth flow
 */
export async function completeGoogleAuth(code: string): Promise<AuthResponse> {
  const response = await api.post<AuthResponse>('/auth/google/callback', { code });
  if (response.token) {
    saveAuthToken(response.token);
    if (response.refreshToken) {
      localStorage.setItem('refresh_token', response.refreshToken);
    }
  }
  return response;
}
