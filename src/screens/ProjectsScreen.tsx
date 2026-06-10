import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput,
  Animated, ActivityIndicator, Alert,
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import { initOfflineDatabase, getDbConnection, getAllAsync, queueSyncItem } from "../../services/dbService";
import { ProjectDTO } from "../../shared/types";
import axios from "axios";
import { API_BASE_URL } from "../config";

export default function ProjectsScreen() {
  const { session } = useAuth();
  const [projects, setProjects] = useState<ProjectDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedProject, setSelectedProject] = useState<ProjectDTO | null>(null);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    loadProjects();
  }, []);

  const loadProjects = async () => {
    setLoading(true);
    try {
      await initOfflineDatabase();
      const db = await getDbConnection();
      let cached = await getAllAsync<ProjectDTO>(db, "SELECT * FROM projects ORDER BY id DESC;");
      if (cached.length === 0 && session?.accessToken) {
        try {
          const res = await axios.get(`${API_BASE_URL}/project-tracker/projects`, {
            headers: { Authorization: `Bearer ${session?.accessToken}` },
          });
          const online = Array.isArray(res.data) ? res.data : res.data?.projects || [];
          cached = online;
        } catch {}
      }
      setProjects(cached);
    } catch {
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  const createProject = async () => {
    if (!name || !location) { Alert.alert("Validation", "Name and location required."); return; }
    try {
      const db = await getDbConnection();
      const id = `proj-${Date.now()}`;
      await db.executeSql(
        "INSERT INTO projects (id, name, location, description, risk_level, status, created_at) VALUES (?, ?, ?, ?, ?, ?, datetime('now'));",
        [id, name, location, description || "", "low", "active"],
      );
      await queueSyncItem({ entity_type: "projects", entity_id: id, operation: "create", payload: JSON.stringify({ name, location, description }) });
      Alert.alert("Success", "Project created (offline). Sync when online.");
      setName(""); setLocation(""); setDescription("");
      setShowForm(false);
      loadProjects();
    } catch {
      Alert.alert("Error", "Failed to create project.");
    }
  };

  const fetchProjectDetails = async (p: ProjectDTO) => {
    setSelectedProject(p);
    if (session?.accessToken) {
      try {
        const res = await axios.get(`${API_BASE_URL}/project-tracker/projects/${p.id}`, {
          headers: { Authorization: `Bearer ${session?.accessToken}` },
        });
        setSelectedProject({ ...p, ...res.data });
      } catch {}
    }
  };

  if (selectedProject) {
    return (
      <ProjectDetailView
        project={selectedProject}
        session={session}
        onBack={() => setSelectedProject(null)}
        onRefresh={loadProjects}
      />
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Animated.View style={{ opacity: fadeAnim, padding: 16 }}>
        <View style={styles.header}>
          <Text style={styles.title}>Projects</Text>
          <TouchableOpacity style={styles.addBtn} onPress={() => setShowForm(!showForm)}>
            <Text style={styles.addBtnText}>{showForm ? "Cancel" : "+ New"}</Text>
          </TouchableOpacity>
        </View>

        {showForm && (
          <View style={styles.formCard}>
            <TextInput style={styles.input} placeholder="Project Name" placeholderTextColor="#475569" value={name} onChangeText={setName} />
            <TextInput style={styles.input} placeholder="Location" placeholderTextColor="#475569" value={location} onChangeText={setLocation} />
            <TextInput style={[styles.input, styles.textArea]} placeholder="Description (optional)" placeholderTextColor="#475569" multiline numberOfLines={3} value={description} onChangeText={setDescription} />
            <TouchableOpacity style={styles.btn} onPress={createProject}>
              <Text style={styles.btnText}>Create Project</Text>
            </TouchableOpacity>
          </View>
        )}

        {loading ? (
          <ActivityIndicator color="#3b82f6" style={{ marginTop: 40 }} />
        ) : projects.length === 0 ? (
          <Text style={styles.empty}>No projects yet. Create your first project above.</Text>
        ) : (
          projects.map((p) => (
            <TouchableOpacity key={p.id} style={styles.card} onPress={() => fetchProjectDetails(p)} activeOpacity={0.7}>
              <View style={styles.cardRow}>
                <View style={styles.cardLeft}>
                  <Text style={styles.cardName}>{p.name}</Text>
                  <Text style={styles.cardLoc}>{p.location}</Text>
                </View>
                <View style={[styles.riskPill, p.risk_level === "high" ? styles.riskHigh : styles.riskLow]}>
                  <Text style={styles.riskText}>{p.risk_level}</Text>
                </View>
              </View>
              {p.description ? <Text style={styles.cardDesc}>{p.description}</Text> : null}
            </TouchableOpacity>
          ))
        )}
      </Animated.View>
    </ScrollView>
  );
}

function ProjectDetailView({ project, session, onBack, onRefresh }: {
  project: ProjectDTO;
  session: any;
  onBack: () => void;
  onRefresh: () => void;
}) {
  const [weather, setWeather] = useState<any>(null);
  const [chatInput, setChatInput] = useState("");
  const [chatResponse, setChatResponse] = useState("");

  const fetchWeather = async () => {
    if (!project.location || !session?.accessToken) return;
    try {
      const res = await axios.get(`${API_BASE_URL}/project-tracker/projects/${project.id}/weather`, {
        headers: { Authorization: `Bearer ${session?.accessToken}` },
      });
      setWeather(res.data);
    } catch {}
  };

  const askAI = async () => {
    if (!chatInput.trim()) return;
    setChatResponse("Thinking...");
    try {
      const res = await axios.post(`${API_BASE_URL}/project-tracker/projects/${project.id}/chat`,
        { message: chatInput },
        { headers: { Authorization: `Bearer ${session?.accessToken}` } },
      );
      setChatResponse(res.data?.response || res.data?.answer || "No response.");
    } catch {
      setChatResponse("Failed to get AI response.");
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.detailContainer}>
        <TouchableOpacity onPress={onBack} style={styles.backRow}>
          <Text style={styles.backText}>← Back to Projects</Text>
        </TouchableOpacity>

        <Text style={styles.detailTitle}>{project.name}</Text>
        <Text style={styles.detailLoc}>{project.location}</Text>
        <Text style={styles.detailDesc}>{project.description || "No description"}</Text>

        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionChip} onPress={fetchWeather}>
            <Text style={styles.actionChipText}>🌤️ Weather</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionChip} onPress={() => Alert.alert("Upload", "Use 'Ingest Doc' in More tab")}>
            <Text style={styles.actionChipText}>📄 Upload Doc</Text>
          </TouchableOpacity>
        </View>

        {weather && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Weather</Text>
            <Text style={styles.weatherTemp}>{weather.temp_c ?? weather.temperature ?? "N/A"}°C</Text>
            <Text style={styles.weatherDesc}>{weather.description ?? weather.condition ?? ""}</Text>
            {weather.concrete_advisory && (
              <View style={styles.advisory}><Text style={styles.advisoryText}>🧊 {weather.concrete_advisory}</Text></View>
            )}
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>AI Strategy Chat</Text>
          <TextInput style={styles.chatInput} placeholder="Ask about this project..." placeholderTextColor="#475569" value={chatInput} onChangeText={setChatInput} />
          <TouchableOpacity style={styles.chatBtn} onPress={askAI}>
            <Text style={styles.chatBtnText}>Ask AI</Text>
          </TouchableOpacity>
          {chatResponse ? <Text style={styles.chatResponse}>{chatResponse}</Text> : null}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 48, marginBottom: 16 },
  title: { color: "#fff", fontSize: 22, fontWeight: "bold" },
  addBtn: { backgroundColor: "#3b82f6", paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8 },
  addBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  formCard: { backgroundColor: "#1e293b", borderRadius: 14, padding: 16, marginBottom: 16 },
  input: { backgroundColor: "#0f172a", borderRadius: 10, padding: 12, color: "#fff", marginBottom: 10, fontSize: 14, borderWidth: 1, borderColor: "#334155" },
  textArea: { minHeight: 80, textAlignVertical: "top" },
  btn: { backgroundColor: "#3b82f6", borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  card: { backgroundColor: "#1e293b", borderRadius: 12, padding: 14, marginBottom: 12 },
  cardRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardLeft: { flex: 1 },
  cardName: { color: "#fff", fontSize: 15, fontWeight: "600" },
  cardLoc: { color: "#94a3b8", fontSize: 12, marginTop: 2 },
  cardDesc: { color: "#64748b", fontSize: 12, marginTop: 6 },
  riskPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  riskHigh: { backgroundColor: "rgba(239,68,68,0.2)" },
  riskLow: { backgroundColor: "rgba(34,197,94,0.2)" },
  riskText: { color: "#fff", fontSize: 9, fontWeight: "bold" },
  empty: { color: "#64748b", fontSize: 13, textAlign: "center", marginTop: 40 },
  detailContainer: { padding: 16 },
  backRow: { marginBottom: 16 },
  backText: { color: "#3b82f6", fontSize: 14, fontWeight: "600" },
  detailTitle: { color: "#fff", fontSize: 24, fontWeight: "bold" },
  detailLoc: { color: "#94a3b8", fontSize: 13, marginTop: 4 },
  detailDesc: { color: "#64748b", fontSize: 13, marginTop: 8, lineHeight: 20 },
  actionsRow: { flexDirection: "row", marginVertical: 16, gap: 8 },
  actionChip: { backgroundColor: "#1e293b", borderRadius: 10, paddingVertical: 8, paddingHorizontal: 14, borderWidth: 1, borderColor: "#334155" },
  actionChipText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  cardTitle: { color: "#fff", fontSize: 14, fontWeight: "600", marginBottom: 8 },
  weatherTemp: { color: "#fff", fontSize: 28, fontWeight: "700" },
  weatherDesc: { color: "#94a3b8", fontSize: 13 },
  advisory: { backgroundColor: "rgba(59,130,246,0.15)", borderRadius: 8, padding: 10, marginTop: 8 },
  advisoryText: { color: "#93c5fd", fontSize: 12 },
  chatInput: { backgroundColor: "#0f172a", borderRadius: 10, padding: 12, color: "#fff", fontSize: 13, borderWidth: 1, borderColor: "#334155", marginBottom: 8 },
  chatBtn: { backgroundColor: "#3b82f6", borderRadius: 8, paddingVertical: 10, alignItems: "center", width: 100 },
  chatBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  chatResponse: { color: "#e2e8f0", fontSize: 14, marginTop: 10, lineHeight: 20, backgroundColor: "#0f172a", borderRadius: 8, padding: 10 },
});
