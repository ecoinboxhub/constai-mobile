import React, { useRef, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  Switch,
  ScrollView,
  TouchableOpacity,
  Animated,
  Alert,
} from "react-native";
import { useAuth } from "../../context/AuthContext";

export default function SettingsScreen() {
  const { session, isGuest, biometricSupported, biometricEnabled, setBiometricPreference, logout, signup } = useAuth();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  const handleUpgradeAccount = () => {
    Alert.prompt?.(
      "Upgrade Account",
      "Enter your email to create a full account:",
      async (email: string) => {
        if (email) {
          try {
            await signup(email, "temporary123", session?.name || "Field User", "ConstAI Field");
            Alert.alert("Success", "Account created! You can now login with your credentials.");
          } catch (err: any) {
            Alert.alert("Error", err.message);
          }
        }
      },
    );
  };

  return (
    <ScrollView style={styles.container}>
      <Animated.View style={{ opacity: fadeAnim }}>
        <View style={styles.header}>
          <Text style={styles.title}>Settings</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {isGuest ? "👤 Guest Account" : "👤 Account"}
          </Text>
          {isGuest ? (
            <>
              <Text style={styles.infoText}>
                You're using ConstAI in guest mode. Create an account to save your data
                across devices and access all features.
              </Text>
              <TouchableOpacity
                style={styles.upgradeBtn}
                onPress={handleUpgradeAccount}
                activeOpacity={0.8}
              >
                <Text style={styles.upgradeBtnText}>Create Full Account</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.label}>Email</Text>
              <Text style={styles.value}>{session?.email}</Text>
              <Text style={styles.label}>Name</Text>
              <Text style={styles.value}>{session?.name || "—"}</Text>
              <Text style={styles.label}>Role</Text>
              <Text style={styles.value}>{session?.role}</Text>
              <Text style={styles.label}>Company ID</Text>
              <Text style={styles.value}>{session?.companyId ?? "—"}</Text>
            </>
          )}
        </View>

        {biometricSupported && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>🔒 Security</Text>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Biometric unlock</Text>
              <Switch
                value={biometricEnabled}
                onValueChange={setBiometricPreference}
                trackColor={{ false: "#475569", true: "#3b82f6" }}
                thumbColor="#fff"
              />
            </View>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>ℹ️ About</Text>
          <Text style={styles.label}>Version</Text>
          <Text style={styles.value}>1.1.0</Text>
          <Text style={styles.label}>Build</Text>
          <Text style={styles.value}>ConstAI Field Console</Text>
        </View>

        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={logout}
          activeOpacity={0.8}
        >
          <Text style={styles.logoutBtnText}>
            {isGuest ? "Exit Guest Mode" : "Sign Out"}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a", padding: 16 },
  header: { paddingTop: 48, marginBottom: 16 },
  title: { color: "#fff", fontSize: 22, fontWeight: "bold" },
  card: { backgroundColor: "#1e293b", borderRadius: 16, padding: 16, marginBottom: 16 },
  cardTitle: { color: "#fff", fontSize: 15, fontWeight: "600", marginBottom: 12 },
  label: { color: "#64748b", fontSize: 11, marginTop: 8, marginBottom: 2 },
  value: { color: "#fff", fontSize: 14 },
  infoText: {
    color: "#94a3b8",
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 16,
  },
  upgradeBtn: {
    backgroundColor: "#3b82f6",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  upgradeBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  switchLabel: { color: "#fff", fontSize: 14 },
  logoutBtn: {
    backgroundColor: "rgba(239,68,68,0.15)",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.3)",
    marginTop: 8,
  },
  logoutBtnText: {
    color: "#ef4444",
    fontWeight: "700",
    fontSize: 14,
  },
});
