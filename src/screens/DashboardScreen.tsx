import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import {
  initOfflineDatabase,
  getPendingSyncItems,
  getDbConnection,
  getAllAsync,
} from "../../services/dbService";
import {
  processSyncQueue,
  startSyncListener,
  checkInternetConnection,
} from "../../services/syncService";
import { processPendingUploads, getUploadQueueSummary } from "../../services/uploadService";
import { ProjectDTO, MobileTaskDTO } from "../../shared/types";

export default function DashboardScreen() {
  const { session, logout } = useAuth();
  const [dbReady, setDbReady] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [uploadSummary, setUploadSummary] = useState({ pending: 0, uploading: 0, synced: 0, failed: 0 });
  const [projects, setProjects] = useState<ProjectDTO[]>([]);
  const [tasks, setTasks] = useState<MobileTaskDTO[]>([]);

  useEffect(() => {
    (async () => {
      try {
        await initOfflineDatabase();
        setDbReady(true);
        const online = await checkInternetConnection();
        setIsOnline(online);
        await refreshLocalData();
        startSyncListener(async () => session?.accessToken || null);
      } catch (err) {
        console.error("Dashboard init failed", err);
      }
    })();
  }, [session]);

  const refreshLocalData = async () => {
    try {
      const db = await getDbConnection();
      const cachedProjects = await getAllAsync<ProjectDTO>(db, "SELECT * FROM projects ORDER BY id DESC;");
      const cachedTasks = await getAllAsync<MobileTaskDTO>(db, "SELECT * FROM tasks ORDER BY created_at DESC;");
      setProjects(cachedProjects);
      setTasks(cachedTasks);
      const pending = await getPendingSyncItems();
      setPendingCount(pending.length);
      const uploads = await getUploadQueueSummary();
      setUploadSummary(uploads);
    } catch (err) {
      console.error("Failed to load local data", err);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      await processSyncQueue(async () => session?.accessToken || null);
      await processPendingUploads(async () => session?.accessToken || null);
      await refreshLocalData();
      Alert.alert("Sync Complete", "Offline data synchronized with server.");
    } catch {
      Alert.alert("Sync Error", "Synchronization failed. Check network connection.");
    } finally {
      setSyncing(false);
    }
  };

  if (!dbReady) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Initializing...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>ConstAI</Text>
          <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.email}>{session?.email}</Text>
        <View style={styles.badgeRow}>
          <View style={[styles.badge, isOnline ? styles.badgeOnline : styles.badgeOffline]}>
            <Text style={styles.badgeText}>{isOnline ? "Online" : "Offline"}</Text>
          </View>
          {pendingCount > 0 && (
            <View style={[styles.badge, styles.badgePending]}>
              <Text style={styles.badgeText}>{pendingCount} pending</Text>
            </View>
          )}
        </View>
      </View>

      <ScrollView style={styles.body}>
        <TouchableOpacity
          style={[styles.syncBtn, syncing && styles.syncBtnDisabled]}
          onPress={handleSync}
          disabled={syncing}
        >
          {syncing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.syncBtnText}>Sync Now</Text>
          )}
        </TouchableOpacity>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Projects ({projects.length})</Text>
          {projects.length === 0 ? (
            <Text style={styles.empty}>No cached projects</Text>
          ) : (
            projects.map((p) => (
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

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Tasks ({tasks.length})</Text>
          {tasks.length === 0 ? (
            <Text style={styles.empty}>No cached tasks</Text>
          ) : (
            tasks.map((t) => (
              <View key={t.id} style={styles.row}>
                <Text style={styles.rowTitle}>{t.name}</Text>
                <Text style={styles.statusText}>{t.status}</Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
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
  logoutBtn: { backgroundColor: "#ef4444", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 },
  logoutText: { color: "#fff", fontSize: 10, fontWeight: "600" },
  badgeRow: { flexDirection: "row", marginTop: 8, flexWrap: "wrap" },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, marginRight: 6, marginBottom: 4 },
  badgeOnline: { backgroundColor: "#22c55e" },
  badgeOffline: { backgroundColor: "#ef4444" },
  badgePending: { backgroundColor: "#f59e0b" },
  badgeText: { color: "#fff", fontSize: 9, fontWeight: "bold" },
  body: { flex: 1, padding: 16 },
  syncBtn: { backgroundColor: "#3b82f6", borderRadius: 8, paddingVertical: 12, alignItems: "center", marginBottom: 16 },
  syncBtnDisabled: { backgroundColor: "#475569" },
  syncBtnText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  card: { backgroundColor: "#1e293b", borderRadius: 12, padding: 16, marginBottom: 16 },
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
  statusText: { color: "#94a3b8", fontSize: 11, textTransform: "uppercase" },
});
