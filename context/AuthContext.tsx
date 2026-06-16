import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import ReactNativeBiometrics from "react-native-biometrics";
import { Animated, Platform } from "react-native";
import axios from "axios";
import { AuthSession, parseJwt, AUTH_KEYS } from "../shared/auth";
import { getAuthSession, saveAuthSession, clearAuthSession, saveGuestSession, getGuestSession, clearGuestSession, getBiometricPreference, saveBiometricPreference } from "../services/authService";
import { API_BASE_URL } from "../src/config";
import NetInfo from "@react-native-community/netinfo";

const rnBiometrics = new ReactNativeBiometrics();

interface AuthContextType {
  session: AuthSession | null;
  loading: boolean;
  biometricSupported: boolean;
  biometricEnabled: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string, companyName: string) => Promise<void>;
  guestLogin: () => Promise<void>;
  logout: () => Promise<void>;
  authenticateBiometrics: () => Promise<boolean>;
  setBiometricPreference: (enabled: boolean) => Promise<void>;
  requestOtp: (phone_number: string) => Promise<void>;
  verifyOtp: (phone_number: string, code: string) => Promise<void>;
  isGuest: boolean;
  isOnline: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const sessionRef = useRef(session);
  sessionRef.current = session;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    async function bootstrapSession() {
      try {
        const cached = await getAuthSession();
        const guest = await getGuestSession();
        const pref = await getBiometricPreference();
        const { available } = await rnBiometrics.isSensorAvailable();
        setBiometricSupported(available);
        setBiometricEnabled(pref && available);
        if (cached) {
          setSession(cached);
        } else if (guest) {
          setSession(guest);
        }
      } catch (err) {
        console.error("Session bootstrap failed", err);
      } finally {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }).start(() => setLoading(false));
      }
    }
    bootstrapSession();

    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOnline(state.isConnected ?? true);
    });
    return () => unsubscribe();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/login`, { email, password });
      const { access_token, refresh_token } = response.data;
      const payload = parseJwt(access_token);
      if (!payload) throw new Error("Invalid JWT token payload format.");
      const userSession: AuthSession = {
        accessToken: access_token,
        refreshToken: refresh_token,
        role: payload.role || "analyst",
        userId: payload.sub,
        email,
        companyId: payload.company_id,
        isGuest: false,
      };
      await saveAuthSession(userSession);
      await clearGuestSession();
      setSession(userSession);
    } catch (err: any) {
      const errMsg = err?.response?.data?.detail || err?.message || "Authentication failed.";
      throw new Error(errMsg);
    } finally {
      setLoading(false);
    }
  }, []);

  const signup = useCallback(async (email: string, password: string, name: string, companyName: string) => {
    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/register`, {
        email,
        username: name,
        password,
        company_name: companyName,
        role: "analyst",
      });
      const userSession: AuthSession = {
        accessToken: "",
        refreshToken: "",
        role: response.data.role || "analyst",
        userId: response.data.id,
        email,
        name,
        isGuest: false,
      };
      const loginRes = await axios.post(`${API_BASE_URL}/auth/login`, { email, password });
      const { access_token, refresh_token } = loginRes.data;
      userSession.accessToken = access_token;
      userSession.refreshToken = refresh_token;
      await saveAuthSession(userSession);
      await clearGuestSession();
      setSession(userSession);
    } catch (err: any) {
      const errMsg = err?.response?.data?.detail || err?.message || "Registration failed.";
      throw new Error(errMsg);
    } finally {
      setLoading(false);
    }
  }, []);

  const guestLogin = useCallback(async () => {
    setLoading(true);
    try {
      const guestSession: AuthSession = {
        accessToken: "",
        refreshToken: "",
        role: "guest",
        userId: `guest-${Date.now()}`,
        email: "guest@constai.app",
        isGuest: true,
        name: "Field User",
      };
      await saveGuestSession(guestSession);
      setSession(guestSession);
    } catch (err) {
      console.error("Guest login failed", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setLoading(true);
    try {
      await clearAuthSession();
      await clearGuestSession();
      setSession(null);
    } catch (err) {
      console.error("Logout error", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const authenticateBiometrics = useCallback(async (): Promise<boolean> => {
    if (!biometricSupported) return false;
    try {
      const { success } = await rnBiometrics.simplePrompt({
        promptMessage: "Unlock ConstAI Field Console",
      });
      return success;
    } catch {
      return false;
    }
  }, [biometricSupported]);

  const setBiometricPreference = useCallback(async (enabled: boolean) => {
    setBiometricEnabled(enabled);
    await saveBiometricPreference(enabled);
  }, []);

  const refreshSession = useCallback(async () => {
    const currentSession = sessionRef.current;
    if (!currentSession || currentSession.isGuest || !currentSession.refreshToken) return;
    try {
      const res = await axios.post(`${API_BASE_URL}/auth/refresh`, {
        refresh_token: currentSession.refreshToken,
      });
      const { access_token, refresh_token } = res.data;
      const updated: AuthSession = {
        ...currentSession,
        accessToken: access_token,
        refreshToken: refresh_token || currentSession.refreshToken,
      };
      await saveAuthSession(updated);
      setSession(updated);
    } catch (err: any) {
      if (err?.response?.status === 401) {
        await clearAuthSession();
        await clearGuestSession();
        setSession(null);
      }
    }
  }, []);

  useEffect(() => {
    if (!isOnline || !session) return;
    const interval = setInterval(refreshSession, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [isOnline, session, refreshSession]);

  const requestOtp = useCallback(async (phone_number: string) => {
    setLoading(true);
    try {
      await axios.post(`${API_BASE_URL}/auth/request-otp`, { phone_number });
    } catch (err: any) {
      const errMsg = err?.response?.data?.detail || err?.message || "Failed to send OTP.";
      throw new Error(errMsg);
    } finally {
      setLoading(false);
    }
  }, []);

  const verifyOtp = useCallback(async (phone_number: string, code: string) => {
    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/verify-otp`, { phone_number, code });
      const { access_token, refresh_token } = response.data;
      const payload = parseJwt(access_token);
      if (!payload) throw new Error("Invalid JWT token format.");
      const userSession: AuthSession = {
        accessToken: access_token,
        refreshToken: refresh_token,
        role: payload.role || "artisan",
        userId: payload.sub,
        email: payload.email || `user_${phone_number}`,
        companyId: payload.company_id,
        isGuest: false,
      };
      await saveAuthSession(userSession);
      await clearGuestSession();
      setSession(userSession);
    } catch (err: any) {
      const errMsg = err?.response?.data?.detail || err?.message || "Invalid code.";
      throw new Error(errMsg);
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        session,
        loading,
        biometricSupported,
        biometricEnabled,
        login,
        signup,
        guestLogin,
        logout,
        authenticateBiometrics,
        setBiometricPreference,
        requestOtp,
        verifyOtp,
        isGuest: session?.isGuest ?? false,
        isOnline,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
