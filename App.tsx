import React, { useRef, useEffect } from "react";
import { Animated, StyleSheet, Text, View, StatusBar } from "react-native";
import { AuthProvider, useAuth } from "./context/AuthContext";
import LoginScreen from "./src/screens/LoginScreen";
import TabNavigator from "./src/navigation/TabNavigator";
import DashboardScreen from "./src/screens/DashboardScreen";
import ProjectsScreen from "./src/screens/ProjectsScreen";
import WorkforceScreen from "./src/screens/WorkforceScreen";
import InsightsScreen from "./src/screens/InsightsScreen";
import MoreScreen from "./src/screens/MoreScreen";
import { initErrorMonitor } from "./src/lib/errorMonitor";
import { registerForPushNotifications } from "./src/lib/notifications";
initErrorMonitor();

const TABS = [
  { key: "dashboard", label: "Dashboard", icon: "📊" },
  { key: "projects", label: "Projects", icon: "📋" },
  { key: "workforce", label: "Workforce", icon: "👥" },
  { key: "insights", label: "Insights", icon: "🤖" },
  { key: "more", label: "More", icon: "⚡" },
];

const SCREENS: Record<string, React.FC> = {
  dashboard: DashboardScreen,
  projects: ProjectsScreen,
  workforce: WorkforceScreen,
  insights: InsightsScreen,
  more: MoreScreen,
};

function SplashScreen() {
  const scale = useRef(new Animated.Value(0.6)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, friction: 3, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 600, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <View style={splash.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
      <Animated.View style={[splash.icon, { transform: [{ scale }], opacity }]}>
        <Text style={splash.iconText}>C</Text>
      </Animated.View>
      <Animated.Text style={[splash.title, { opacity }]}>ConstAI</Animated.Text>
      <Animated.Text style={[splash.subtitle, { opacity }]}>Field Console</Animated.Text>
    </View>
  );
}

function AppNavigator() {
  const { session, loading } = useAuth();
  useEffect(() => {
    if (session) {
      registerForPushNotifications(() => Promise.resolve(session.accessToken));
    }
  }, [session]);
  if (loading) return <SplashScreen />;
  if (!session) return <LoginScreen />;
  return <TabNavigator tabs={TABS} screens={SCREENS} />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppNavigator />
    </AuthProvider>
  );
}

const splash = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a", alignItems: "center", justifyContent: "center" },
  icon: { width: 80, height: 80, borderRadius: 22, backgroundColor: "#3b82f6", alignItems: "center", justifyContent: "center", marginBottom: 16, shadowColor: "#3b82f6", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.5, shadowRadius: 16, elevation: 10 },
  iconText: { color: "#fff", fontSize: 36, fontWeight: "800" },
  title: { color: "#fff", fontSize: 28, fontWeight: "800", letterSpacing: -0.5 },
  subtitle: { color: "#64748b", fontSize: 13, marginTop: 4, letterSpacing: 1.5, textTransform: "uppercase" },
});
