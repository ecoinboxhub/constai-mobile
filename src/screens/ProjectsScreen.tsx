import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
} from "react-native";
import { getDbConnection, getAllAsync } from "../../services/dbService";
import { performOfflineWrite } from "../../services/syncService";
import { ProjectDTO } from "../../shared/types";

export default function ProjectsScreen() {
  const [projects, setProjects] = useState<ProjectDTO[]>([]);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [state, setState] = useState("Lagos");

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const db = await getDbConnection();
      const rows = await getAllAsync<ProjectDTO>(db, "SELECT * FROM projects ORDER BY id DESC;");
      setProjects(rows);
    } catch (err) {
      console.error("Failed to load projects", err);
    }
  };

  const handleCreate = async () => {
    if (!name || !location) {
      Alert.alert("Validation", "Project name and location required.");
      return;
    }
    const clientUuid = `proj-${Date.now()}`;
    const newId = Math.floor(Math.random() * 100000) + 1000;
    await performOfflineWrite("projects", "INSERT", clientUuid, {
      id: newId, name, contractor_name: "Local Contractor", location,
      state, lga: "", project_type: "Infrastructure", project_status: "active",
      budget_allocated: 0, budget_spent: 0, workforce_count: 0,
      equipment_count: 0, material_cost: 0, completion_percentage: 0,
      weather_delay_days: 0, safety_incidents: 0, inspection_score: 100,
      task_completion_rate: 1, daily_progress_rate: 0,
      delay_status: "on_time", risk_level: "low",
      created_at: new Date().toISOString(),
    });
    setName("");
    setLocation("");
    await loadProjects();
    Alert.alert("Success", "Project saved offline.");
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>New Project</Text>
      </View>
      <View style={styles.card}>
        <TextInput style={styles.input} placeholder="Project name" placeholderTextColor="#64748b" value={name} onChangeText={setName} />
        <TextInput style={styles.input} placeholder="Location" placeholderTextColor="#64748b" value={location} onChangeText={setLocation} />
        <TextInput style={styles.input} placeholder="State" placeholderTextColor="#64748b" value={state} onChangeText={setState} />
        <TouchableOpacity style={styles.button} onPress={handleCreate}>
          <Text style={styles.buttonText}>Save Offline</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.card}>
        <Text style={styles.title}>Cached Projects ({projects.length})</Text>
        {projects.length === 0 ? (
          <Text style={styles.empty}>No projects yet</Text>
        ) : (
          projects.map((p) => (
            <View key={p.id} style={styles.row}>
              <View>
                <Text style={styles.rowName}>{p.name}</Text>
                <Text style={styles.rowDetail}>{p.location} &middot; {p.project_status}</Text>
              </View>
              <View style={[styles.pill, p.risk_level === "high" ? styles.pillHigh : styles.pillLow]}>
                <Text style={styles.pillText}>{p.risk_level}</Text>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a", padding: 16 },
  header: { paddingTop: 48, marginBottom: 16 },
  title: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  card: { backgroundColor: "#1e293b", borderRadius: 12, padding: 16, marginBottom: 16 },
  input: { backgroundColor: "#0f172a", borderRadius: 8, padding: 12, color: "#fff", marginBottom: 10, fontSize: 14 },
  button: { backgroundColor: "#3b82f6", borderRadius: 8, paddingVertical: 12, alignItems: "center", marginTop: 4 },
  buttonText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  empty: { color: "#64748b", fontSize: 12, textAlign: "center", paddingVertical: 8 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#334155" },
  rowName: { color: "#fff", fontSize: 13, fontWeight: "500" },
  rowDetail: { color: "#64748b", fontSize: 11, marginTop: 1 },
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  pillHigh: { backgroundColor: "rgba(239,68,68,0.2)" },
  pillLow: { backgroundColor: "rgba(34,197,94,0.2)" },
  pillText: { color: "#fff", fontSize: 9, fontWeight: "bold" },
});
