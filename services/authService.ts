import EncryptedStorage from 'react-native-encrypted-storage';
import axios from "axios";
import { AuthSession, AUTH_KEYS, parseJwt } from "../shared/auth";

import { API_BASE_URL } from "../src/config";

export async function saveAuthSession(session: AuthSession) {
  await EncryptedStorage.setItem(AUTH_KEYS.TOKEN_SESSION, JSON.stringify(session));
  await EncryptedStorage.setItem(AUTH_KEYS.ACCESS_TOKEN, session.accessToken);
  await EncryptedStorage.setItem(AUTH_KEYS.REFRESH_TOKEN, session.refreshToken);
}

export async function getAuthSession(): Promise<AuthSession | null> {
  const sessionStr = await EncryptedStorage.getItem(AUTH_KEYS.TOKEN_SESSION);
  if (!sessionStr) return null;
  try {
    return JSON.parse(sessionStr) as AuthSession;
  } catch (e) {
    return null;
  }
}

export async function clearAuthSession() {
  await EncryptedStorage.removeItem(AUTH_KEYS.TOKEN_SESSION);
  await EncryptedStorage.removeItem(AUTH_KEYS.ACCESS_TOKEN);
  await EncryptedStorage.removeItem(AUTH_KEYS.REFRESH_TOKEN);
}

export async function getAccessToken(): Promise<string | null> {
  return await EncryptedStorage.getItem(AUTH_KEYS.ACCESS_TOKEN);
}

export async function getRefreshToken(): Promise<string | null> {
  return await EncryptedStorage.getItem(AUTH_KEYS.REFRESH_TOKEN);
}

export async function refreshSession(refreshToken: string): Promise<AuthSession> {
  const response = await axios.post(
    `${API_BASE_URL}/auth/refresh`,
    {},
    {
      headers: {
        Authorization: `Bearer ${refreshToken}`,
      },
    }
  );

  const { access_token, refresh_token } = response.data;
  
  const payload = parseJwt(access_token);
  if (!payload) {
    throw new Error("Invalid JWT token during refresh");
  }

  const newSession: AuthSession = {
    accessToken: access_token,
    refreshToken: refresh_token,
    role: payload.role || "analyst",
    userId: payload.sub,
    email: payload.email || "",
    companyId: payload.company_id,
  };

  await saveAuthSession(newSession);
  return newSession;
}
