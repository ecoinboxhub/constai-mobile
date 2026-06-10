import React, { useCallback, useEffect, useState, useRef } from "react";
import {
  StyleSheet, Text, View, TouchableOpacity, ScrollView, Animated,
  ActivityIndicator, Alert, RefreshControl,
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import { useNav } from "../navigation/NavContext";
import { initOfflineDatabase, getPendingSyncItems, getDbConnection, getAllAsync } from "../../services/dbService";
import { processSyncQueue, startSyncListener, checkInternetConnection } from "../../services/syncService";
import { processPendingUploads, getUploadQueueSummary } from "../../services/uploadService";
import { ProjectDTO } from "../../shared/types";
import axios from "axios";
import { API_BASE_URL } from "../config";

const QUICK_ACTIONS = [
  { key: "newLog", label: "New Log", icon: "📝", color: "#3b82f6" },
  { key: "weather", label: "Weather", icon: "🌤️", color: "#f59e0b" },
  { key: "findSite", label: "Find Site", icon: "📍", color: "#10b981" },
  { key: "ingest", label: "Ingest Doc", icon: "📄", color: "#8b5cf6" },
];

export default function DashboardScreen() {
  const { session, logout, isGuest } = useAuth();
  const { navigate } = useNav();
  const [dbReady, setDbReady] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [uploadSummary, setUploadSummary] = useState({ pending: 0, uploading: 0, synced: 0, failed: 0 });
  const [projects, setProjects] = useState<ProjectDTO[]>([]);
  const [portfolioRisk, setPortfolioRisk] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        await initOfflineDatabase();
        setDbReady(true);
        const online = await checkInternetConnection();
        setIsOnline(online);
        await refreshLocalData();
        if (online && session?.accessToken) fetchPortfolioRisk();
        startSyncListener(async () => session?.accessToken || null);
      } catch (err) {
        console.error("Dashboard init failed", err);
      }
    })();
  }, [session]);

  const fetchPortfolioRisk = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/project-tracker/analytics`, {
        headers: { Authorization: `Bearer ${session?.accessToken}` },
      });
      setPortfolioRisk(res.data);
    } catch {}
  };

  const refreshLocalData = async () => {
    try {
      const db = await getDbConnection();
      const cachedProjects = await getAllAsync<ProjectDTO>(db, "SELECT * FROM projects ORDER BY id DESC;");
      setProjects(cachedProjects);
      const pending = await getPendingSyncItems();
      setPendingCount(pending.length);
      const uploads = await getUploadQueueSummary();
      setUploadSummary(uploads);
    } catch {}
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      await processSyncQueue(async () => session?.accessToken || null);
      await processPendingUploads(async () => session?.accessToken || null);
      await refreshLocalData();
      if (isOnline && session?.accessToken) fetchPortfolioRisk();
      Alert.alert("Sync Complete", "All offline data synchronized.");
    } catch {
      Alert.alert("Sync Error", "Check network connection.");
    } finally {
      setSyncing(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshLocalData();
    setRefreshing(false);
  };

  const handleQuickAction = useCallback((key: string) => {
    navigate(key === "newLog" ? "more" : key === "weather" ? "more" : key === "findSite" ? "more" : key === "ingest" ? "more" : key);
  }, [navigate]);

  if (!dbReady) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Initializing...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />}
    >
      <Animated.View style={{ opacity: fadeAnim }}>
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.title}>ConstAI</Text>
              <Text style={styles.email}>{session?.email} {isGuest ? "(Guest)" : ""}</Text>
            </View>
            <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
              <Text style={styles.logoutText}>Exit</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.badgeRow}>
            <View style={[styles.badge, isOnline ? styles.badgeOnline : styles.badgeOffline]}>
              <Text style={styles.badgeText}>{isOnline ? "Online" : "Offline"}</Text>
            </View>
            {pendingCount > 0 && (
              <View style={[styles.badge, styles.badgePending]}>
                <Text style={styles.badgeText}>{pendingCount} pending</Text>
              </View>
            )}
            {uploadSummary.pending > 0 && (
              <View style={[styles.badge, styles.badgeUpload]}>
                <Text style={styles.badgeText}>{uploadSummary.pending} uploads</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.quickGrid}>
          {QUICK_ACTIONS.map((a) => (
            <TouchableOpacity key={a.key} style={[styles.quickItem, { borderColor: a.color }]} onPress={() => handleQuickAction(a.key)} activeOpacity={0.7}>
              <Text style={styles.quickIcon}>{a.icon}</Text>
              <Text style={styles.quickLabel}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={[styles.syncBtn, syncing && styles.syncBtnDisabled]} onPress={handleSync} disabled={syncing}>
          {syncing ? <ActivityIndicator color="#fff" /> : <Text style={styles.syncBtnText}>Sync Now</Text>}
        </TouchableOpacity>

        {portfolioRisk && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Portfolio Risk</Text>
            <View style={styles.riskRow}>
              <Text style={styles.riskLabel}>At Risk</Text>
              <Text style={[styles.riskValue, { color: "#ef4444" }]}>{portfolioRisk.at_risk || 0}</Text>
            </View>
            <View style={styles.riskRow}>
              <Text style={styles.riskLabel}>On Track</Text>
              <Text style={[styles.riskValue, { color: "#22c55e" }]}>{portfolioRisk.on_track || 0}</Text>
            </View>
            <View style={styles.riskRow}>
              <Text style={styles.riskLabel}>Avg Delay</Text>
              <Text style={styles.riskValue}>{portfolioRisk.avg_delay_days || 0} days</Text>
            </View>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Projects ({projects.length})</Text>
          {projects.length === 0 ? (
            <Text style={styles.empty}>No cached projects. Create one in Projects tab.</Text>
          ) : (
            projects.slice(0, 5).map((p) => (
              <View key={p.id} style={styles.row}>
                <View style={styles.rowLeft}>
                  <Text style={styles.rowTitle}>{p.name}</Text>
                  <Text style={styles.rowSub}>{p.location}</Text>
                </View>
                <View style={[styles.riskPill, p.risk_level === "high" ? styles.riskHigh : styles.riskLow]}>
                  <Text style={styles.riskText}>{p.risk_level}</Text>
                </View>
              </View>
            ))
          )}
        </View>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a" },
  center: { flex: 1, backgroundColor: "#0f172a", alignItems: "center", justifyContent: "center" },
  loadingText: { color: "#94a3b8", marginTop: 12, fontSize: 14 },
  header: { paddingHorizontal: 16, paddingTop: 56, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: "#1e293b" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { color: "#fff", fontSize: 22, fontWeight: "bold" },
  email: { color: "#64748b", fontSize: 11, marginTop: 2 },
  logoutBtn: { backgroundColor: "#ef4444", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  logoutText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  badgeRow: { flexDirection: "row", marginTop: 8, flexWrap: "wrap" },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, marginRight: 6, marginBottom: 4 },
  badgeOnline: { backgroundColor: "#22c55e" },
  badgeOffline: { backgroundColor: "#ef4444" },
  badgePending: { backgroundColor: "#f59e0b" },
  badgeUpload: { backgroundColor: "#3b82f6" },
  badgeText: { color: "#fff", fontSize: 9, fontWeight: "bold" },
  quickGrid: { flexDirection: "row", flexWrap: "wrap", padding: 12, gap: 8 },
  quickItem: { width: "47%", backgroundColor: "#1e293b", borderRadius: 14, padding: 16, alignItems: "center", borderWidth: 1, marginBottom: 8 },
  quickIcon: { fontSize: 28, marginBottom: 6 },
  quickLabel: { color: "#fff", fontSize: 12, fontWeight: "600" },
  syncBtn: { backgroundColor: "#3b82f6", borderRadius: 10, paddingVertical: 12, alignItems: "center", marginHorizontal: 12, marginBottom: 12 },
  syncBtnDisabled: { backgroundColor: "#475569" },
  syncBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  card: { backgroundColor: "#1e293b", borderRadius: 14, padding: 16, marginHorizontal: 12, marginBottom: 12 },
  cardTitle: { color: "#fff", fontSize: 15, fontWeight: "600", marginBottom: 12 },
  empty: { color: "#64748b", fontSize: 12, textAlign: "center", paddingVertical: 8 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#334155" },
  rowLeft: { flex: 1 },
  rowTitle: { color: "#fff", fontSize: 13, fontWeight: "500" },
  rowSub: { color: "#64748b", fontSize: 11, marginTop: 1 },
  riskPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  riskHigh: { backgroundColor: "rgba(239,68,68,0.2)" },
  riskLow: { backgroundColor: "rgba(34,197,94,0.2)" },
  riskText: { color: "#fff", fontSize: 9, fontWeight: "bold" },
  riskRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: "#334155" },
  riskLabel: { color: "#94a3b8", fontSize: 13 },
  riskValue: { color: "#fff", fontSize: 13, fontWeight: "600" },
});
