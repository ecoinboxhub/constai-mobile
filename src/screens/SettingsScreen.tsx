import React from "react";
import {
  StyleSheet,
  Text,
  View,
  Switch,
  ScrollView,
} from "react-native";
import { useAuth } from "../../context/AuthContext";

export default function SettingsScreen() {
  const { session, biometricSupported, biometricEnabled, setBiometricPreference } = useAuth();
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Account</Text>
        <Text style={styles.label}>Email</Text>
        <Text style={styles.value}>{session?.email}</Text>
        <Text style={styles.label}>Role</Text>
        <Text style={styles.value}>{session?.role}</Text>
        <Text style={styles.label}>Company ID</Text>
        <Text style={styles.value}>{session?.companyId ?? "—"}</Text>
      </View>

      {biometricSupported && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Security</Text>
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a", padding: 16 },
  header: { paddingTop: 48, marginBottom: 16 },
  title: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  card: { backgroundColor: "#1e293b", borderRadius: 12, padding: 16, marginBottom: 16 },
  cardTitle: { color: "#fff", fontSize: 14, fontWeight: "600", marginBottom: 12 },
  label: { color: "#64748b", fontSize: 11, marginTop: 8, marginBottom: 2 },
  value: { color: "#fff", fontSize: 14 },
  switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  switchLabel: { color: "#fff", fontSize: 14 },
});
