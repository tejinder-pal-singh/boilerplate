import { api } from './api';
import { TokenResponse } from '@/types/auth';

export async function login(
  email: string,
  password: string,
  mfaCode?: string,
): Promise<TokenResponse> {
  const response = await api.post('/auth/login', {
    email,
    password,
    mfaCode,
  });
  return response.data;
}

export async function register(
  email: string,
  password: string,
  firstName?: string,
  lastName?: string,
): Promise<void> {
  await api.post('/auth/register', {
    email,
    password,
    firstName,
    lastName,
  });
}

export async function logout(): Promise<void> {
  await api.post('/auth/logout');
}

export async function refreshToken(token: string): Promise<TokenResponse> {
  const response = await api.post('/auth/refresh', { refreshToken: token });
  return response.data;
}

export async function requestPasswordReset(email: string): Promise<void> {
  await api.post('/auth/password/reset-request', { email });
}

export async function resetPassword(
  token: string,
  password: string,
): Promise<void> {
  await api.post('/auth/password/reset', { token, password });
}

export async function generateMfaSecret(): Promise<{ qrCode: string }> {
  const response = await api.post('/auth/mfa/generate');
  return response.data;
}

export async function verifyAndEnableMfa(token: string): Promise<void> {
  await api.post('/auth/mfa/verify', { token });
}

export async function disableMfa(): Promise<void> {
  await api.post('/auth/mfa/disable');
}
