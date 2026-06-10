import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  StatusBar,
} from "react-native";
import { useAuth } from "../../context/AuthContext";

const { width, height } = Dimensions.get("window");
const TAB = { EMAIL: 0, SMS: 1, SIGNUP: 2 } as const;

type AuthMode = (typeof TAB)[keyof typeof TAB];

export default function LoginScreen() {
  const { login, signup, guestLogin, requestOtp, verifyOtp, authenticateBiometrics, biometricSupported, loading } = useAuth();

  const [mode, setMode] = useState<AuthMode>(TAB.EMAIL);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupCompany, setSignupCompany] = useState("");

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const logoScale = useRef(new Animated.Value(0.8)).current;
  const bgAnim = useRef(new Animated.Value(0)).current;
  const tabIndicatorAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(logoScale, { toValue: 1, friction: 4, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
    pulseBg();
  }, []);

  const pulseBg = () => {
    Animated.sequence([
      Animated.timing(bgAnim, { toValue: 1, duration: 4000, useNativeDriver: false }),
      Animated.timing(bgAnim, { toValue: 0, duration: 4000, useNativeDriver: false }),
    ]).start(() => pulseBg());
  };

  useEffect(() => {
    Animated.spring(tabIndicatorAnim, {
      toValue: mode,
      friction: 8,
      tension: 60,
      useNativeDriver: true,
    }).start();
  }, [mode]);

  const bgColor = bgAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["rgb(15, 23, 42)", "rgb(17, 24, 39)"],
  });

  const tabOffset = tabIndicatorAnim.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [0, width / 3, (width / 3) * 2],
  });

  const handleEmailLogin = useCallback(async () => {
    if (!email || !password) {
      Alert.alert("Validation", "Enter email and password.");
      return;
    }
    try {
      await login(email, password);
    } catch (err: any) {
      Alert.alert("Login Failed", err.message);
    }
  }, [email, password, login]);

  const handleRequestOtp = useCallback(async () => {
    if (!phone) {
      Alert.alert("Validation", "Enter phone number starting with +234.");
      return;
    }
    try {
      await requestOtp(phone);
      setOtpSent(true);
    } catch (err: any) {
      Alert.alert("OTP Failed", err.message);
    }
  }, [phone, requestOtp]);

  const handleVerifyOtp = useCallback(async () => {
    if (!otpCode) {
      Alert.alert("Validation", "Enter the 6-digit code.");
      return;
    }
    try {
      await verifyOtp(phone, otpCode);
    } catch (err: any) {
      Alert.alert("Verification Failed", err.message);
    }
  }, [otpCode, phone, verifyOtp]);

  const handleSignup = useCallback(async () => {
    if (!signupName || !signupEmail || !signupPassword || !signupCompany) {
      Alert.alert("Validation", "Fill all fields.");
      return;
    }
    if (signupPassword.length < 8) {
      Alert.alert("Validation", "Password must be at least 8 characters.");
      return;
    }
    try {
      await signup(signupEmail, signupPassword, signupName, signupCompany);
    } catch (err: any) {
      Alert.alert("Signup Failed", err.message);
    }
  }, [signupName, signupEmail, signupPassword, signupCompany, signup]);

  const handleBiometric = useCallback(async () => {
    const ok = await authenticateBiometrics();
    if (ok) {
      try {
        await login("admin@constai.com", "password123");
      } catch (err: any) {
        Alert.alert("Biometric Login Failed", err.message);
      }
    }
  }, [authenticateBiometrics, login]);

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
      <ScrollView contentContainerStyle={styles.scroll} bounces={false}>
        <Animated.View style={[styles.container, { backgroundColor: bgColor }]}>
          <Animated.View
            style={[styles.logoWrap, { transform: [{ scale: logoScale }] }]}
          >
            <View style={styles.logoIcon}>
              <Text style={styles.logoLetter}>C</Text>
            </View>
            <Text style={styles.logoText}>ConstAI</Text>
            <Text style={styles.logoSub}>Field Console</Text>
          </Animated.View>

          <Animated.View
            style={[
              styles.card,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
            ]}
          >
            <View style={styles.tabBar}>
              {["Email", "SMS OTP", "Sign Up"].map((label, i) => (
                <TouchableOpacity
                  key={label}
                  style={styles.tab}
                  onPress={() => setMode(i as AuthMode)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.tabText,
                      mode === i && styles.tabTextActive,
                    ]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
              <Animated.View
                style={[
                  styles.tabIndicator,
                  { transform: [{ translateX: tabOffset }] },
                ]}
              />
            </View>

            {mode === TAB.EMAIL && (
              <Animated.View>
                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  placeholderTextColor="#475569"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor="#475569"
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                />
                <TouchableOpacity
                  style={[styles.btn, styles.btnPrimary]}
                  onPress={handleEmailLogin}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.btnPrimaryText}>Sign In</Text>
                  )}
                </TouchableOpacity>
              </Animated.View>
            )}

            {mode === TAB.SMS && (
              <Animated.View>
                {!otpSent ? (
                  <>
                    <TextInput
                      style={styles.input}
                      placeholder="Phone (+234...)"
                      placeholderTextColor="#475569"
                      keyboardType="phone-pad"
                      value={phone}
                      onChangeText={setPhone}
                    />
                    <TouchableOpacity
                      style={[styles.btn, styles.btnPrimary]}
                      onPress={handleRequestOtp}
                      disabled={loading}
                      activeOpacity={0.8}
                    >
                      {loading ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text style={styles.btnPrimaryText}>Send Code</Text>
                      )}
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <TextInput
                      style={styles.input}
                      placeholder="6-digit code"
                      placeholderTextColor="#475569"
                      keyboardType="number-pad"
                      maxLength={6}
                      value={otpCode}
                      onChangeText={setOtpCode}
                    />
                    <TouchableOpacity
                      style={[styles.btn, styles.btnPrimary]}
                      onPress={handleVerifyOtp}
                      disabled={loading}
                      activeOpacity={0.8}
                    >
                      {loading ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text style={styles.btnPrimaryText}>Verify & Enter</Text>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setOtpSent(false)}
                      style={styles.linkWrap}
                    >
                      <Text style={styles.link}>Change phone number</Text>
                    </TouchableOpacity>
                  </>
                )}
              </Animated.View>
            )}

            {mode === TAB.SIGNUP && (
              <Animated.View>
                <TextInput
                  style={styles.input}
                  placeholder="Full Name"
                  placeholderTextColor="#475569"
                  value={signupName}
                  onChangeText={setSignupName}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  placeholderTextColor="#475569"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={signupEmail}
                  onChangeText={setSignupEmail}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Password (min 8 chars)"
                  placeholderTextColor="#475569"
                  secureTextEntry
                  value={signupPassword}
                  onChangeText={setSignupPassword}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Company Name"
                  placeholderTextColor="#475569"
                  value={signupCompany}
                  onChangeText={setSignupCompany}
                />
                <TouchableOpacity
                  style={[styles.btn, styles.btnPrimary]}
                  onPress={handleSignup}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.btnPrimaryText}>Create Account</Text>
                  )}
                </TouchableOpacity>
              </Animated.View>
            )}

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
              style={[styles.btn, styles.btnGuest]}
              onPress={guestLogin}
              activeOpacity={0.8}
            >
              <Text style={styles.btnGuestIcon}>👤</Text>
              <Text style={styles.btnGuestText}>Continue as Guest</Text>
            </TouchableOpacity>

            {biometricSupported && (
              <TouchableOpacity
                style={[styles.btn, styles.btnBio]}
                onPress={handleBiometric}
                activeOpacity={0.8}
              >
                <Text style={styles.btnBioIcon}>🔒</Text>
                <Text style={styles.btnBioText}>Unlock with Biometrics</Text>
              </TouchableOpacity>
            )}
          </Animated.View>

          <Text style={styles.footer}>ConstAI © {new Date().getFullYear()}</Text>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { flexGrow: 1 },
  container: {
    flex: 1,
    minHeight: height,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  logoWrap: {
    alignItems: "center",
    marginBottom: 32,
  },
  logoIcon: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: "#3b82f6",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    shadowColor: "#3b82f6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  logoLetter: {
    color: "#fff",
    fontSize: 32,
    fontWeight: "800",
  },
  logoText: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  logoSub: {
    color: "#64748b",
    fontSize: 13,
    marginTop: 2,
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  card: {
    backgroundColor: "#1e293b",
    borderRadius: 20,
    padding: 24,
    width: "100%",
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 12,
  },
  tabBar: {
    flexDirection: "row",
    marginBottom: 24,
    position: "relative",
    backgroundColor: "#0f172a",
    borderRadius: 12,
    padding: 3,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    zIndex: 2,
  },
  tabText: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: "600",
  },
  tabTextActive: {
    color: "#fff",
  },
  tabIndicator: {
    position: "absolute",
    width: "33.33%",
    height: "100%",
    backgroundColor: "#3b82f6",
    borderRadius: 10,
    top: 3,
    zIndex: 1,
  },
  input: {
    backgroundColor: "#0f172a",
    borderRadius: 12,
    padding: 14,
    color: "#fff",
    marginBottom: 12,
    fontSize: 14,
    borderWidth: 1,
    borderColor: "#334155",
  },
  btn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
    flexDirection: "row",
  },
  btnPrimary: {
    backgroundColor: "#3b82f6",
  },
  btnPrimaryText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
  btnGuest: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  btnGuestIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  btnGuestText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  btnBio: {
    backgroundColor: "rgba(99,102,241,0.15)",
    borderWidth: 1,
    borderColor: "rgba(99,102,241,0.3)",
  },
  btnBioIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  btnBioText: {
    color: "#818cf8",
    fontWeight: "600",
    fontSize: 14,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#334155",
  },
  dividerText: {
    color: "#64748b",
    marginHorizontal: 12,
    fontSize: 12,
  },
  linkWrap: {
    alignItems: "center",
    marginTop: 12,
  },
  link: {
    color: "#3b82f6",
    fontSize: 12,
    textDecorationLine: "underline",
  },
  footer: {
    color: "#475569",
    fontSize: 11,
    marginTop: 32,
  },
});
