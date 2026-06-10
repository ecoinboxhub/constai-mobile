import React, { createContext, useContext, useState, useEffect } from "react";
import ReactNativeBiometrics from "react-native-biometrics";
import axios from "axios";
import { AuthSession, parseJwt } from "../shared/auth";
import { getAuthSession, saveAuthSession, clearAuthSession } from "../services/authService";

const rnBiometrics = new ReactNativeBiometrics();

interface AuthContextType {
  session: AuthSession | null;
  loading: boolean;
  biometricSupported: boolean;
  biometricEnabled: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  authenticateBiometrics: () => Promise<boolean>;
  setBiometricPreference: (enabled: boolean) => Promise<void>;
  requestOtp: (phone_number: string) => Promise<void>;
  verifyOtp: (phone_number: string, code: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

import { API_BASE_URL } from "../src/config";

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);

  useEffect(() => {
    async function bootstrapSession() {
      try {
        const cached = await getAuthSession();
        
        const { available } = await rnBiometrics.isSensorAvailable();
        setBiometricSupported(available);

        if (cached) {
          setSession(cached);
        }
      } catch (err) {
        console.error("Session bootstrap failed", err);
      } finally {
        setLoading(false);
      }
    }
    bootstrapSession();
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/login`, {
        email,
        password,
      });

      const { access_token, refresh_token } = response.data;

      const payload = parseJwt(access_token);
      if (!payload) {
        throw new Error("Invalid JWT token payload format.");
      }

      const userSession: AuthSession = {
        accessToken: access_token,
        refreshToken: refresh_token,
        role: payload.role || "analyst",
        userId: payload.sub,
        email: email,
        companyId: payload.company_id,
      };

      await saveAuthSession(userSession);
      setSession(userSession);
    } catch (err: any) {
      const errMsg = err?.response?.data?.detail || err?.message || "Authentication failed. Please verify credentials.";
      throw new Error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const requestOtp = async (phone_number: string) => {
    setLoading(true);
    try {
      await axios.post(`${API_BASE_URL}/auth/request-otp`, { phone_number });
    } catch (err: any) {
      const errMsg = err?.response?.data?.detail || err?.message || "Failed to dispatch SMS verification code.";
      throw new Error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (phone_number: string, code: string) => {
    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/verify-otp`, { phone_number, code });
      const { access_token, refresh_token } = response.data;

      const payload = parseJwt(access_token);
      if (!payload) {
        throw new Error("Invalid JWT token format.");
      }

      const userSession: AuthSession = {
        accessToken: access_token,
        refreshToken: refresh_token,
        role: payload.role || "artisan",
        userId: payload.sub,
        email: payload.email || `artisan_${phone_number}`,
        companyId: payload.company_id,
      };

      await saveAuthSession(userSession);
      setSession(userSession);
    } catch (err: any) {
      const errMsg = err?.response?.data?.detail || err?.message || "Verification code invalid or expired.";
      throw new Error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await clearAuthSession();
      setSession(null);
    } catch (err) {
      console.error("Logout session clearing error", err);
    } finally {
      setLoading(false);
    }
  };

  const authenticateBiometrics = async (): Promise<boolean> => {
    if (!biometricSupported) return false;
    
    try {
      const { success } = await rnBiometrics.simplePrompt({
        promptMessage: "Authenticate to unlock ConstAI Field Console",
      });
      
      return success;
    } catch (err) {
      console.error("Biometric authentication error", err);
      return false;
    }
  };

  const setBiometricPreference = async (enabled: boolean) => {
    setBiometricEnabled(enabled);
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        loading,
        biometricSupported,
        biometricEnabled,
        login,
        logout,
        authenticateBiometrics,
        setBiometricPreference,
        requestOtp,
        verifyOtp,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be utilized within an AuthProvider");
  }
  return context;
};
