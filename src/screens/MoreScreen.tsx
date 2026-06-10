import React, { useRef, useEffect, useState, useCallback } from "react";
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Animated, TextInput, Alert, ActivityIndicator } from "react-native";
import { useAuth } from "../../context/AuthContext";
import axios from "axios";
import { API_BASE_URL } from "../config";
import { launchCamera, launchImageLibrary } from "react-native-image-picker";
import { pick, types } from "@react-native-documents/picker";

const TOOLS = [
  { key: "weather", label: "Weather", icon: "🌤️" },
  { key: "newLog", label: "New Log", icon: "📝" },
  { key: "findSite", label: "Find Site", icon: "📍" },
  { key: "ingest", label: "Ingest Doc", icon: "📄" },
  { key: "knowledge", label: "Knowledge Base", icon: "📚" },
  { key: "settings", label: "Settings", icon: "⚙️" },
];

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
      const res = await axios.get(`${API_BASE_URL}/project-tracker/weather/${encodeURIComponent(city)}`, {
        headers: { Authorization: `Bearer ${session?.accessToken}` },
      });
      setWeather(res.data);
    } catch {
      Alert.alert("Error", "Could not fetch weather data.");
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
            <Text style={s.temp}>{weather.temp_c ?? weather.temperature ?? "N/A"}°C</Text>
            <Text style={s.descText}>{weather.description ?? weather.condition ?? ""}</Text>
            {weather.humidity && <Text style={s.detail}>Humidity: {weather.humidity}%</Text>}
            {weather.wind_speed && <Text style={s.detail}>Wind: {weather.wind_speed} km/h</Text>}
            {weather.concrete_advisory && (
              <View style={s.advisory}><Text style={s.advisoryText}>🧊 {weather.concrete_advisory}</Text></View>
            )}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

function NewLogView({ onBack }: { onBack: () => void }) {
  const { session } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submitLog = async () => {
    if (!title) { Alert.alert("Validation", "Enter a log title."); return; }
    setSubmitting(true);
    try {
      await axios.post(`${API_BASE_URL}/logs/`, { title, description, log_type: "mobile" }, {
        headers: { Authorization: `Bearer ${session?.accessToken}` },
      });
      Alert.alert("Success", "Log entry created.");
      setTitle("");
      setDescription("");
    } catch {
      Alert.alert("Error", "Failed to create log.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={s.container}>
      <SubHeader title="New Log" onBack={onBack} />
      <View style={s.content}>
        <TextInput style={s.input} placeholder="Log Title" placeholderTextColor="#475569" value={title} onChangeText={setTitle} />
        <TextInput style={[s.input, s.textArea]} placeholder="Description (optional)" placeholderTextColor="#475569" multiline numberOfLines={4} value={description} onChangeText={setDescription} />
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
      setResults(Array.isArray(res.data) ? res.data : res.data?.projects || []);
    } catch {
      Alert.alert("Error", "Search failed.");
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
        {results.length === 0 && !loading && <Text style={s.empty}>No results found</Text>}
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
    if (!selectedFile || !projectId) { Alert.alert("Validation", "Select a project and file."); return; }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", { uri: selectedFile.uri, name: selectedFile.name, type: selectedFile.type } as any);
      await axios.post(`${API_BASE_URL}/project-tracker/documents/upload?project_id=${projectId}`, formData, {
        headers: { Authorization: `Bearer ${session?.accessToken}`, "Content-Type": "multipart/form-data" },
      });
      Alert.alert("Success", "Document uploaded and indexed to vector store.");
      setSelectedFile(null);
    } catch {
      Alert.alert("Error", "Upload failed.");
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
            <Text style={s.fileSize}>{Math.round(selectedFile.size / 1024)} KB</Text>
          </View>
        )}
        <TouchableOpacity style={[s.btn, { marginTop: 16, opacity: selectedFile ? 1 : 0.5 }]} onPress={uploadAndIndex} disabled={!selectedFile || uploading}>
          {uploading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Index to Vector Store</Text>}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function KnowledgeView({ onBack }: { onBack: () => void }) {
  const { session } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const search = async () => {
    if (!query) return;
    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/project-tracker/rag/query`,
        { query, top_k: 5 },
        { headers: { Authorization: `Bearer ${session?.accessToken}` } },
      );
      setResults(res.data);
    } catch {
      Alert.alert("Error", "Knowledge search failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={s.container}>
      <SubHeader title="Knowledge Base" onBack={onBack} />
      <View style={s.content}>
        <TextInput style={s.input} placeholder="Ask about project docs..." placeholderTextColor="#475569" value={query} onChangeText={setQuery} />
        <TouchableOpacity style={s.btn} onPress={search} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Search</Text>}
        </TouchableOpacity>
        {results?.answer && (
          <View style={s.card}>
            <Text style={s.cardTitle}>Answer</Text>
            <Text style={s.answerText}>{results.answer}</Text>
          </View>
        )}
        {results?.sources?.map((s: any, i: number) => (
          <View key={i} style={s.sourceRow}>
            <Text style={s.sourceText}>{s.title || s.filename || `Source ${i + 1}`}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

function SettingsView({ onBack }: { onBack: () => void }) {
  const { session, isGuest, biometricSupported, biometricEnabled, setBiometricPreference, logout } = useAuth();
  return (
    <ScrollView style={s.container}>
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
              <TouchableOpacity
                onPress={() => setBiometricPreference(!biometricEnabled)}
                style={[s.toggle, biometricEnabled && s.toggleOn]}
              >
                <View style={[s.toggleThumb, biometricEnabled && s.toggleThumbOn]} />
              </TouchableOpacity>
            </View>
          </View>
        )}
        <View style={s.card}>
          <Text style={s.cardTitle}>ℹ️ About</Text>
          <Text style={s.detail}>Version 1.1.0</Text>
          <Text style={s.detail}>ConstAI Field Console</Text>
        </View>
        <TouchableOpacity style={s.logoutBtn} onPress={logout}>
          <Text style={s.logoutText}>{isGuest ? "Exit Guest Mode" : "Sign Out"}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

export default function MoreScreen() {
  const [activeView, setActiveView] = useState<string | null>(null);

  const handleBack = useCallback(() => setActiveView(null), []);

  if (activeView === "weather") return <WeatherView onBack={handleBack} />;
  if (activeView === "newLog") return <NewLogView onBack={handleBack} />;
  if (activeView === "findSite") return <FindSiteView onBack={handleBack} />;
  if (activeView === "ingest") return <IngestDocView onBack={handleBack} />;
  if (activeView === "knowledge") return <KnowledgeView onBack={handleBack} />;
  if (activeView === "settings") return <SettingsView onBack={handleBack} />;

  const fadeAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start(); }, []);

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
  sourceRow: { backgroundColor: "#1e293b", borderRadius: 8, padding: 10, marginBottom: 6 },
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
  logoutBtn: { backgroundColor: "rgba(239,68,68,0.15)", borderRadius: 12, paddingVertical: 14, alignItems: "center", borderWidth: 1, borderColor: "rgba(239,68,68,0.3)" },
  logoutText: { color: "#ef4444", fontWeight: "700", fontSize: 14 },
});
