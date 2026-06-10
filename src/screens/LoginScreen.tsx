import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useAuth } from "../../context/AuthContext";

export default function LoginScreen() {
  const { login, requestOtp, verifyOtp, authenticateBiometrics, biometricSupported } = useAuth();
  const [loginMode, setLoginMode] = useState<"email" | "sms">("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleEmailLogin = async () => {
    if (!email || !password) {
      Alert.alert("Validation Error", "Please input email and password.");
      return;
    }
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      Alert.alert("Authentication Failed", err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestOtp = async () => {
    if (!phone) {
      Alert.alert("Validation Error", "Please input phone number starting with +234.");
      return;
    }
    setLoading(true);
    try {
      await requestOtp(phone);
      setOtpSent(true);
      Alert.alert("OTP Sent", "Verification code has been routed via SMS.");
    } catch (err: any) {
      Alert.alert("SMS Delivery Failed", err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode) {
      Alert.alert("Validation Error", "Please input the 6-digit verification code.");
      return;
    }
    setLoading(true);
    try {
      await verifyOtp(phone, otpCode);
    } catch (err: any) {
      Alert.alert("OTP Verification Failed", err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    const success = await authenticateBiometrics();
    if (success) {
      setLoading(true);
      try {
        await login("admin@constai.com", "password123");
      } catch (err: any) {
        Alert.alert("Biometrics Sync Failed", err.message);
      } finally {
        setLoading(false);
      }
    } else {
      Alert.alert("Failed", "Biometric verification failed.");
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.logo}>ConstAI</Text>
        <Text style={styles.subtitle}>Field Console</Text>

        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tab, loginMode === "email" && styles.tabActive]}
            onPress={() => setLoginMode("email")}
          >
            <Text style={[styles.tabText, loginMode === "email" && styles.tabTextActive]}>Email</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, loginMode === "sms" && styles.tabActive]}
            onPress={() => setLoginMode("sms")}
          >
            <Text style={[styles.tabText, loginMode === "sms" && styles.tabTextActive]}>SMS OTP</Text>
          </TouchableOpacity>
        </View>

        {loginMode === "email" ? (
          <>
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#6b7280"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#6b7280"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity style={styles.primaryButton} onPress={handleEmailLogin} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Sign In</Text>}
            </TouchableOpacity>
          </>
        ) : (
          <>
            {!otpSent ? (
              <>
                <TextInput
                  style={styles.input}
                  placeholder="Phone (+234...)"
                  placeholderTextColor="#6b7280"
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={setPhone}
                />
                <TouchableOpacity style={styles.primaryButton} onPress={handleRequestOtp} disabled={loading}>
                  {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Send Code</Text>}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TextInput
                  style={styles.input}
                  placeholder="6-digit code"
                  placeholderTextColor="#6b7280"
                  keyboardType="number-pad"
                  maxLength={6}
                  value={otpCode}
                  onChangeText={setOtpCode}
                />
                <TouchableOpacity style={styles.primaryButton} onPress={handleVerifyOtp} disabled={loading}>
                  {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Verify & Enter</Text>}
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setOtpSent(false)}>
                  <Text style={styles.linkText}>Change phone number</Text>
                </TouchableOpacity>
              </>
            )}
          </>
        )}

        {biometricSupported && (
          <TouchableOpacity style={styles.secondaryButton} onPress={handleBiometricLogin}>
            <Text style={styles.secondaryButtonText}>Unlock with Biometrics</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    backgroundColor: "#1e293b",
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 360,
  },
  logo: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
  },
  subtitle: {
    color: "#94a3b8",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 24,
  },
  tabRow: {
    flexDirection: "row",
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#334155",
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: "#3b82f6",
  },
  tabText: {
    color: "#64748b",
    fontSize: 14,
  },
  tabTextActive: {
    color: "#fff",
    fontWeight: "600",
  },
  input: {
    backgroundColor: "#0f172a",
    borderRadius: 8,
    padding: 12,
    color: "#fff",
    marginBottom: 12,
    fontSize: 14,
  },
  primaryButton: {
    backgroundColor: "#3b82f6",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  secondaryButton: {
    backgroundColor: "#334155",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 12,
  },
  secondaryButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  linkText: {
    color: "#3b82f6",
    marginTop: 12,
    textAlign: "center",
    fontSize: 12,
    textDecorationLine: "underline",
  },
});
