export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  role: string;
  userId: string;
  email: string;
  companyId?: number;
  isGuest?: boolean;
  name?: string;
}

export const AUTH_KEYS = {
  TOKEN_SESSION: "constai_auth_session",
  ACCESS_TOKEN: "constai_access_token",
  REFRESH_TOKEN: "constai_refresh_token",
  GUEST_SESSION: "constai_guest_session",
  BIOMETRIC_ENABLED: "constai_biometric_enabled",
};

export function parseJwt(token: string): any {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    return null;
  }
}
