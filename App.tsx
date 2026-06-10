import React, { useEffect } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { AuthProvider, useAuth } from "./context/AuthContext";
import LoginScreen from "./src/screens/LoginScreen";
import DashboardScreen from "./src/screens/DashboardScreen";
import ProjectsScreen from "./src/screens/ProjectsScreen";
import MediaScreen from "./src/screens/MediaScreen";
import SettingsScreen from "./src/screens/SettingsScreen";
import TabNavigator from "./src/navigation/TabNavigator";
import { getPendingSyncItems } from "./services/dbService";
import { registerBackgroundTelemetryTask } from "./services/telemetryService";

const TABS = [
  { key: "dashboard", label: "Dashboard", icon: "\u2302" },
  { key: "projects", label: "Projects", icon: "\u2630" },
  { key: "media", label: "Media", icon: "\u2601" },
  { key: "settings", label: "Settings", icon: "\u2699" },
];

const SCREENS: Record<string, React.FC> = {
  dashboard: DashboardScreen,
  projects: ProjectsScreen,
  media: MediaScreen,
  settings: SettingsScreen,
};

function LoadingScreen() {
  return (
    <View style={styles.loading}>
      <ActivityIndicator size="large" color="#3b82f6" />
      <Text style={styles.loadingText}>ConstAI</Text>
    </View>
  );
}

function AppNavigator() {
  const { session, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!session) return <LoginScreen />;
  return <TabNavigator tabs={TABS} screens={SCREENS} />;
}

export default function App() {
  useEffect(() => {
    registerBackgroundTelemetryTask(async () => {
      try {
        const items = await getPendingSyncItems();
        return items.length;
      } catch {
        return 0;
      }
    });
  }, []);

  return (
    <AuthProvider>
      <AppNavigator />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: "#0f172a",
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    color: "#fff",
    marginTop: 12,
    fontSize: 16,
    fontWeight: "bold",
  },
});
