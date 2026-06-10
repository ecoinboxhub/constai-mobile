import React, { useRef, useEffect, useState, useCallback } from "react";
import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput,
  Animated, ActivityIndicator, Alert,
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import axios from "axios";
import { API_BASE_URL } from "../config";
import { pick, types } from "@react-native-documents/picker";

const TOOLS = [
  { key: "weather", label: "Weather", icon: "🌤️" },
  { key: "newLog", label: "New Log", icon: "📝" },
  { key: "findSite", label: "Find Site", icon: "📍" },
  { key: "ingest", label: "Ingest Doc", icon: "📄" },
  { key: "knowledge", label: "Knowledge Base", icon: "📚" },
  { key: "settings", label: "Settings", icon: "⚙️" },
];

export default function MoreScreen() {
  const [activeView, setActiveView] = useState<string | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, [activeView === null]);

  const handleBack = useCallback(() => setActiveView(null), []);

  if (activeView === "weather") return <WeatherView onBack={handleBack} />;
  if (activeView === "newLog") return <NewLogView onBack={handleBack} />;
  if (activeView === "findSite") return <FindSiteView onBack={handleBack} />;
  if (activeView === "ingest") return <IngestDocView onBack={handleBack} />;
  if (activeView === "knowledge") return <KnowledgeView onBack={handleBack} />;
  if (activeView === "settings") return <SettingsView onBack={handleBack} />;

  return (
    <ScrollView style={s.container}>
      <Animated.View style={{ opacity: fadeAnim, padding: 16 }}>
        <View style={s.header}><Text style={s.title}>Tools</Text></View>
        <View style={s.grid}>
          {TOOLS.map((tool) => (
            <TouchableOpacity key={tool.key} style={s.gridCard} onPress={() => setActiveView(tool.key)} activeOpacity={0.7}>
              <Text style={s.gridIcon}>{tool.icon}</Text>
              <Text style={s.gridLabel}>{tool.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>
    </ScrollView>
  );
}

function SubHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <View style={s.subHeader}>
      <TouchableOpacity onPress={onBack} style={s.backBtn}><Text style={s.backText}>← Back</Text></TouchableOpacity>
      <Text style={s.subTitle}>{title}</Text>
      <View style={{ width: 60 }} />
    </View>
  );
}

function WeatherView({ onBack }: { onBack: () => void }) {
  const { session } = useAuth();
  const [city, setCity] = useState("");
  const [weather, setWeather] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchWeather = async () => {
    if (!city) return;
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/project-tracker/weather/${encodeURIComponent(city)}`);
      setWeather(res.data);
    } catch (e: any) {
      Alert.alert("Error", e?.response?.data?.detail || "Could not fetch weather.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={s.container}>
      <SubHeader title="Weather" onBack={onBack} />
      <View style={s.content}>
        <TextInput style={s.input} placeholder="Enter city (e.g. Lagos)" placeholderTextColor="#475569" value={city} onChangeText={setCity} />
        <TouchableOpacity style={s.btn} onPress={fetchWeather} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Get Weather</Text>}
        </TouchableOpacity>
        {weather && (
          <View style={s.card}>
            <Text style={s.cardTitle}>{weather.city || city}</Text>
            <Text style={s.temp}>{weather.temperature_c ?? "N/A"}°C</Text>
            <Text style={s.descText}>{weather.condition}{weather.description ? ` — ${weather.description}` : ""}</Text>
            {weather.humidity_pct != null && <Text style={s.detail}>Humidity: {weather.humidity_pct}%</Text>}
            {weather.wind_speed_kmh != null && <Text style={s.detail}>Wind: {weather.wind_speed_kmh} km/h</Text>}
            {weather.rainfall_mm != null && <Text style={s.detail}>Rainfall: {weather.rainfall_mm} mm</Text>}
            {weather.severe_alert && (
              <View style={s.advisory}><Text style={s.advisoryText}>⚠️ {weather.severe_alert}</Text></View>
            )}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

function NewLogView({ onBack }: { onBack: () => void }) {
  const [projectId, setProjectId] = useState("");
  const [logText, setLogText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submitLog = async () => {
    if (!projectId || !logText) { Alert.alert("Validation", "Project ID and log text required."); return; }
    setSubmitting(true);
    try {
      await axios.post(`${API_BASE_URL}/logs/`, { project_id: projectId, log_text: logText });
      Alert.alert("Success", "Log entry created.");
      setProjectId(""); setLogText("");
    } catch (e: any) {
      Alert.alert("Error", e?.response?.data?.detail || "Failed to create log.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={s.container}>
      <SubHeader title="New Log" onBack={onBack} />
      <View style={s.content}>
        <TextInput style={s.input} placeholder="Project ID" placeholderTextColor="#475569" value={projectId} onChangeText={setProjectId} keyboardType="numeric" />
        <TextInput style={[s.input, s.textArea]} placeholder="Log text (describe the activity...)" placeholderTextColor="#475569" multiline numberOfLines={4} value={logText} onChangeText={setLogText} />
        <TouchableOpacity style={s.btn} onPress={submitLog} disabled={submitting}>
          {submitting ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Submit Log</Text>}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function FindSiteView({ onBack }: { onBack: () => void }) {
  const { session } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const search = async () => {
    if (!query) return;
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/project-tracker/projects`, {
        headers: { Authorization: `Bearer ${session?.accessToken}` },
        params: { search: query },
      });
      const data = Array.isArray(res.data) ? res.data : res.data?.projects || [];
      setResults(data);
    } catch (e: any) {
      Alert.alert("Error", e?.response?.data?.detail || "Search failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={s.container}>
      <SubHeader title="Find Site" onBack={onBack} />
      <View style={s.content}>
        <TextInput style={s.input} placeholder="Search by name or location" placeholderTextColor="#475569" value={query} onChangeText={setQuery} />
        <TouchableOpacity style={s.btn} onPress={search} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Search</Text>}
        </TouchableOpacity>
        {results.map((p: any, i: number) => (
          <View key={p.id || i} style={s.resultRow}>
            <Text style={s.resultName}>{p.name || p.project_name}</Text>
            <Text style={s.resultLoc}>{p.location || ""}</Text>
          </View>
        ))}
        {results.length === 0 && !loading && query ? <Text style={s.empty}>No projects found</Text> : null}
      </View>
    </ScrollView>
  );
}

function IngestDocView({ onBack }: { onBack: () => void }) {
  const { session } = useAuth();
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [projectId, setProjectId] = useState("");
  const [uploading, setUploading] = useState(false);

  const pickFile = async () => {
    try {
      const result = await pick({ type: [types.pdf, types.plainText], allowMultiSelection: false });
      if (result && result.length > 0) setSelectedFile(result[0]);
    } catch {}
  };

  const uploadAndIndex = async () => {
    if (!selectedFile || !projectId) { Alert.alert("Validation", "Select a project ID and file."); return; }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", { uri: selectedFile.uri, name: selectedFile.name, type: selectedFile.type } as any);
      const res = await axios.post(`${API_BASE_URL}/project-tracker/documents/upload?project_id=${projectId}`, formData, {
        headers: { Authorization: `Bearer ${session?.accessToken}`, "Content-Type": "multipart/form-data" },
      });
      Alert.alert("Success", `Uploaded and indexed ${res.data?.indexed_chunks || 0} chunks to vector store.`);
      setSelectedFile(null);
    } catch (e: any) {
      Alert.alert("Error", e?.response?.data?.detail || "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <ScrollView style={s.container}>
      <SubHeader title="Ingest Document" onBack={onBack} />
      <View style={s.content}>
        <TextInput style={s.input} placeholder="Project ID" placeholderTextColor="#475569" value={projectId} onChangeText={setProjectId} keyboardType="numeric" />
        <TouchableOpacity style={[s.btn, s.btnSecondary]} onPress={pickFile}>
          <Text style={s.btnText}>{selectedFile ? selectedFile.name : "Select PDF/DOCX"}</Text>
        </TouchableOpacity>
        {selectedFile && (
          <View style={s.fileInfo}>
            <Text style={s.fileName}>{selectedFile.name}</Text>
            <Text style={s.fileSize}>{Math.round((selectedFile.size || 0) / 1024)} KB</Text>
          </View>
        )}
        <TouchableOpacity style={[s.btn, { marginTop: 16, opacity: selectedFile && projectId ? 1 : 0.5 }]} onPress={uploadAndIndex} disabled={!selectedFile || !projectId || uploading}>
          {uploading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Index to Vector Store</Text>}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function KnowledgeView({ onBack }: { onBack: () => void }) {
  const { session } = useAuth();
  const [question, setQuestion] = useState("");
  const [projectId, setProjectId] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const search = async () => {
    if (!question.trim() || !projectId) { Alert.alert("Validation", "Project ID and question required."); return; }
    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/project-tracker/rag/query`,
        { project_id: parseInt(projectId, 10), question },
        { headers: { Authorization: `Bearer ${session?.accessToken}` } },
      );
      setResult(res.data);
    } catch (e: any) {
      Alert.alert("Error", e?.response?.data?.detail || "Search failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={s.container}>
      <SubHeader title="Knowledge Base" onBack={onBack} />
      <View style={s.content}>
        <TextInput style={s.input} placeholder="Project ID" placeholderTextColor="#475569" value={projectId} onChangeText={setProjectId} keyboardType="numeric" />
        <TextInput style={s.input} placeholder="Ask about project documents..." placeholderTextColor="#475569" value={question} onChangeText={setQuestion} />
        <TouchableOpacity style={s.btn} onPress={search} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Search</Text>}
        </TouchableOpacity>
        {result?.answer && (
          <View style={s.card}>
            <Text style={s.cardTitle}>Answer</Text>
            <Text style={s.answerText}>{result.answer}</Text>
          </View>
        )}
        {result?.sources?.map((src: any, i: number) => (
          <View key={i} style={s.sourceCard}>
            <Text style={s.sourceText}>{typeof src === "string" ? src : src.title || `Source ${i + 1}`}</Text>
          </View>
        ))}
        {result?.source_count != null && <Text style={s.detail}>{result.source_count} sources found</Text>}
      </View>
    </ScrollView>
  );
}

function SettingsView({ onBack }: { onBack: () => void }) {
  const { session, isGuest, biometricSupported, biometricEnabled, setBiometricPreference, logout } = useAuth();
  return (
    <ScrollView style={s.container}>
      <SubHeader title="Settings" onBack={onBack} />
      <View style={s.content}>
        <View style={s.card}>
          <Text style={s.cardTitle}>{isGuest ? "👤 Guest" : "👤 Account"}</Text>
          {isGuest ? (
            <Text style={s.descText}>Using ConstAI in guest mode. Data is stored locally.</Text>
          ) : (
            <>
              <Text style={s.detail}>Email: {session?.email}</Text>
              <Text style={s.detail}>Role: {session?.role}</Text>
              <Text style={s.detail}>Company: {session?.companyId ?? "—"}</Text>
            </>
          )}
        </View>
        {biometricSupported && (
          <View style={s.card}>
            <Text style={s.cardTitle}>🔒 Security</Text>
            <View style={s.switchRow}>
              <Text style={s.switchLabel}>Biometric unlock</Text>
              <TouchableOpacity onPress={() => setBiometricPreference(!biometricEnabled)} style={[s.toggle, biometricEnabled && s.toggleOn]}>
                <View style={[s.toggleThumb, biometricEnabled && s.toggleThumbOn]} />
              </TouchableOpacity>
            </View>
          </View>
        )}
        <TouchableOpacity style={s.logoutBtn} onPress={logout}>
          <Text style={s.logoutText}>{isGuest ? "Exit Guest Mode" : "Sign Out"}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a" },
  content: { padding: 16 },
  header: { paddingTop: 48, marginBottom: 12 },
  title: { color: "#fff", fontSize: 22, fontWeight: "bold" },
  subHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 56, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: "#1e293b" },
  subTitle: { color: "#fff", fontSize: 17, fontWeight: "600" },
  backBtn: { paddingVertical: 4, paddingRight: 8 },
  backText: { color: "#3b82f6", fontSize: 14, fontWeight: "600" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  gridCard: { width: "47%", backgroundColor: "#1e293b", borderRadius: 16, padding: 20, alignItems: "center", borderWidth: 1, borderColor: "#334155" },
  gridIcon: { fontSize: 32, marginBottom: 8 },
  gridLabel: { color: "#fff", fontSize: 13, fontWeight: "600" },
  input: { backgroundColor: "#0f172a", borderRadius: 12, padding: 14, color: "#fff", marginBottom: 12, fontSize: 14, borderWidth: 1, borderColor: "#334155" },
  textArea: { minHeight: 100, textAlignVertical: "top" },
  btn: { backgroundColor: "#3b82f6", borderRadius: 10, paddingVertical: 14, alignItems: "center" },
  btnSecondary: { backgroundColor: "#1e293b", borderWidth: 1, borderColor: "#3b82f6" },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  card: { backgroundColor: "#1e293b", borderRadius: 14, padding: 16, marginBottom: 12 },
  cardTitle: { color: "#fff", fontSize: 15, fontWeight: "600", marginBottom: 8 },
  temp: { color: "#fff", fontSize: 36, fontWeight: "800" },
  descText: { color: "#94a3b8", fontSize: 13, marginTop: 4 },
  detail: { color: "#64748b", fontSize: 12, marginTop: 4 },
  advisory: { backgroundColor: "rgba(59,130,246,0.15)", borderRadius: 8, padding: 10, marginTop: 8 },
  advisoryText: { color: "#93c5fd", fontSize: 12 },
  answerText: { color: "#e2e8f0", fontSize: 14, lineHeight: 22 },
  sourceCard: { backgroundColor: "#1e293b", borderRadius: 8, padding: 10, marginBottom: 6, borderLeftWidth: 3, borderLeftColor: "#3b82f6" },
  sourceText: { color: "#94a3b8", fontSize: 12 },
  resultRow: { backgroundColor: "#1e293b", borderRadius: 10, padding: 14, marginBottom: 8 },
  resultName: { color: "#fff", fontSize: 14, fontWeight: "600" },
  resultLoc: { color: "#64748b", fontSize: 12, marginTop: 2 },
  empty: { color: "#64748b", fontSize: 13, textAlign: "center", marginTop: 20 },
  fileInfo: { backgroundColor: "#1e293b", borderRadius: 8, padding: 10, marginTop: 8 },
  fileName: { color: "#fff", fontSize: 13 },
  fileSize: { color: "#64748b", fontSize: 11 },
  switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  switchLabel: { color: "#fff", fontSize: 14 },
  toggle: { width: 48, height: 28, borderRadius: 14, backgroundColor: "#475569", justifyContent: "center", paddingHorizontal: 3 },
  toggleOn: { backgroundColor: "#3b82f6" },
  toggleThumb: { width: 22, height: 22, borderRadius: 11, backgroundColor: "#fff" },
  toggleThumbOn: { alignSelf: "flex-end" },
  logoutBtn: { backgroundColor: "rgba(239,68,68,0.15)", borderRadius: 12, paddingVertical: 14, alignItems: "center", borderWidth: 1, borderColor: "rgba(239,68,68,0.3)", marginTop: 12 },
  logoutText: { color: "#ef4444", fontWeight: "700", fontSize: 14 },
});
